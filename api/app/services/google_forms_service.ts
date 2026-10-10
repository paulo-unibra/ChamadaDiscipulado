import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

type IntegrationSettings = {
  sections: Record<string, boolean>
  fields: Record<string, boolean>
  mappings: Record<string, string>
  fixedAnswers: Record<string, { questionId: string; value: string }>
}
type FixedAnswer = { questionId: string; value: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isFixedAnswer(value: unknown): value is FixedAnswer {
  return isRecord(value) && typeof value.questionId === 'string' && typeof value.value === 'string'
}

const DEFAULT_SETTINGS: IntegrationSettings = {
  sections: {},
  fields: {},
  mappings: {},
  fixedAnswers: {},
}

export function getCongregationId(request: HttpContext['request']) {
  const id = request.input('congregationId') ?? request.header('x-congregation-id')
  return typeof id === 'string' ? id.trim() : ''
}

export function getPublicFormId(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : ''
  const publicId = raw.match(/\/forms\/d\/e\/([^/?]+)/)?.[1]
  if (publicId) return publicId
  if (/\/forms\/d\/[^/]+\/edit/.test(raw)) {
    throw new Error('Use o link público /forms/d/e/.../viewform, não o link de edição.')
  }
  return raw.replace(/[?#].*$/, '').replace(/\/$/, '')
}

export async function getIntegration(congregationId: string) {
  const row = await db
    .from('google_forms_integrations')
    .where('congregation_id', congregationId)
    .first()
  if (!row) return { enabled: false, formId: '', ...DEFAULT_SETTINGS }
  let config = DEFAULT_SETTINGS
  try {
    const parsed: unknown =
      typeof row.section_config === 'string'
        ? JSON.parse(row.section_config || '{}')
        : row.section_config
    if (isRecord(parsed)) {
      const settings = parsed
      config = {
        sections: validateRecord(settings.sections ?? {}, isBoolean, 'sections'),
        fields: validateRecord(settings.fields ?? {}, isBoolean, 'fields'),
        mappings: validateRecord(settings.mappings ?? {}, isString, 'mappings'),
        fixedAnswers: validateRecord(settings.fixedAnswers ?? {}, isFixedAnswer, 'fixedAnswers'),
      }
    }
  } catch {
    // Keep default integration settings when stored config is malformed.
  }
  return {
    enabled: Boolean(row.enabled),
    formId: row.form_id || '',
    connected: Boolean(row.form_id),
    ...config,
  }
}

export async function saveIntegration(congregationId: string, body: Record<string, unknown>) {
  const existing = await db
    .from('google_forms_integrations')
    .where('congregation_id', congregationId)
    .first()
  const formId = getPublicFormId(body.formId)
  const sections = validateRecord(body.sections, isBoolean, 'sections')
  const fields = validateRecord(body.fields, isBoolean, 'fields')
  const mappings = validateRecord(body.mappings, isString, 'mappings')
  const fixedAnswers = validateRecord(body.fixedAnswers, isFixedAnswer, 'fixedAnswers')
  const sectionConfig = { sections, fields, mappings, fixedAnswers }
  const values = {
    enabled: body.enabled === true,
    form_id: formId,
    section_config: JSON.stringify(sectionConfig),
    updated_at: new Date(),
  }
  if (existing) {
    await db
      .from('google_forms_integrations')
      .where('congregation_id', congregationId)
      .update(values)
  } else {
    await db.table('google_forms_integrations').insert({
      congregation_id: congregationId,
      ...values,
      created_at: new Date(),
    })
  }
  return getIntegration(congregationId)
}

function validateRecord<T>(
  value: unknown,
  isValidValue: (value: unknown) => value is T,
  field: string
): Record<string, T> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`O campo ${field} deve ser um objeto.`)
  }
  const entries = Object.entries(value)
  if (entries.length > 500 || entries.some(([key, item]) => !key.trim() || !isValidValue(item))) {
    throw new Error(`O campo ${field} contém valores inválidos.`)
  }
  return Object.fromEntries(entries)
}

function extractAssignedArray(html: string, variableName: string): unknown[] {
  const markerIndex = html.indexOf(variableName)
  if (markerIndex < 0) throw new Error('O Google não retornou os dados públicos do formulário.')
  const equalsIndex = html.indexOf('=', markerIndex + variableName.length)
  const start = html.indexOf('[', equalsIndex + 1)
  if (equalsIndex < 0 || start < 0)
    throw new Error('Não foi possível localizar a estrutura pública do formulário.')

  let depth = 0
  let insideString = false
  let escaped = false
  for (let index = start; index < html.length; index += 1) {
    const character = html[index]
    if (insideString) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') insideString = false
      continue
    }
    if (character === '"') insideString = true
    else if (character === '[') depth += 1
    else if (character === ']') {
      depth -= 1
      if (depth === 0) {
        const parsed: unknown = JSON.parse(html.slice(start, index + 1))
        if (!Array.isArray(parsed)) throw new Error('A estrutura pública do formulário é inválida.')
        return parsed
      }
    }
  }
  throw new Error('Os dados públicos do formulário vieram incompletos.')
}

export async function scrapePublicFormQuestions(formIdValue: string) {
  const formId = getPublicFormId(formIdValue)
  if (!/^[\w-]+$/.test(formId))
    throw new Error('Informe um ID ou link público válido do Google Forms.')
  const url = `https://docs.google.com/forms/d/e/${encodeURIComponent(formId)}/viewform`
  const response = await fetch(url, {
    headers: { 'Accept': 'text/html', 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`O formulário público respondeu com HTTP ${response.status}.`)
  const html = await response.text()
  const data = extractAssignedArray(html, 'FB_PUBLIC_LOAD_DATA_')
  const rawItems = Array.isArray(data[1]) && Array.isArray(data[1][1]) ? data[1][1] : []
  const questions = rawItems.flatMap((item: unknown) => {
    if (!Array.isArray(item) || typeof item[1] !== 'string' || !Array.isArray(item[4])) return []
    const entryId = item[4][0]?.[0]
    const type = Number(item[3])
    if (entryId === undefined || type === 8 || type === 12) return []
    const rawOptions = item[4][0]?.[1]
    const options = Array.isArray(rawOptions)
      ? rawOptions
          .map((option: unknown) =>
            Array.isArray(option) && typeof option[0] === 'string' ? option[0] : ''
          )
          .filter(Boolean)
      : []
    return [{ id: String(entryId), title: item[1].trim(), type, options }]
  })
  if (!questions.length)
    throw new Error(
      'Não encontrei perguntas no formulário público. Verifique o link e se aceita respostas.'
    )
  return questions
}

export async function getSentItems(congregationId: string) {
  const integration = await db
    .from('google_forms_integrations')
    .where('congregation_id', congregationId)
    .first()
  if (!integration?.form_id) return []
  return db
    .from('google_forms_sent_items')
    .select('section_id', 'record_id', 'sent_at')
    .where('congregation_id', congregationId)
    .where('form_id', integration.form_id)
    .orderBy('sent_at', 'desc')
}

export async function markItemSent(
  congregationId: string,
  formId: string,
  sectionId: string,
  recordId: string
) {
  const existing = await db
    .from('google_forms_sent_items')
    .where('congregation_id', congregationId)
    .where('form_id', formId)
    .where('section_id', sectionId)
    .where('record_id', recordId)
    .first()
  if (existing) return
  try {
    await db.table('google_forms_sent_items').insert({
      congregation_id: congregationId,
      form_id: formId,
      section_id: sectionId,
      record_id: recordId,
      sent_at: new Date(),
    })
  } catch (error) {
    if (
      typeof error !== 'object' ||
      error === null ||
      !('code' in error) ||
      error.code !== 'ER_DUP_ENTRY'
    )
      throw error
  }
}
