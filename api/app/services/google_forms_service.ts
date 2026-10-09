import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'

const SCOPES = ['https://www.googleapis.com/auth/forms.body']
const DEFAULT_SETTINGS = { sections: {} as Record<string, boolean>, fields: {} as Record<string, boolean>, mappings: {} as Record<string, string> }

function encryptionKey() {
  return createHash('sha256').update(env.get('APP_KEY')).digest()
}

function encrypt(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`
}

function decrypt(value: string) {
  const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64'))
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

function getClientConfig() {
  const clientId = env.get('GOOGLE_CLIENT_ID')
  const clientSecret = env.get('GOOGLE_CLIENT_SECRET')
  const redirectUri = env.get('GOOGLE_REDIRECT_URI')
  if (!clientId || !clientSecret || !redirectUri) throw new Error('Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI no servidor.')
  return { clientId, clientSecret, redirectUri }
}

function getFormId(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : ''
  return raw.match(/\/forms\/d\/(?:e\/)?([^/]+)/)?.[1] ?? raw
}

export function getCongregationId(request: HttpContext['request']) {
  const id = request.input('congregationId') ?? request.header('x-congregation-id')
  return typeof id === 'string' ? id.trim() : ''
}

export async function getIntegration(congregationId: string) {
  const row = await db.from('google_forms_integrations').where('congregation_id', congregationId).first()
  if (!row) return { enabled: false, formId: '', googleEmail: null, connected: false, ...DEFAULT_SETTINGS }
  let config = DEFAULT_SETTINGS
  try {
    const parsed = typeof row.section_config === 'string' ? JSON.parse(row.section_config || '{}') : row.section_config
    config = { ...DEFAULT_SETTINGS, ...(parsed || {}) }
  } catch { /* Keep default config */ }
  return {
    enabled: Boolean(row.enabled),
    formId: row.form_id || '',
    googleEmail: row.google_email,
    connected: Boolean(row.refresh_token),
    appsScriptUrl: row.apps_script_url || '',
    webhookSecret: row.apps_script_secret ? decrypt(row.apps_script_secret) : '',
    ...config,
  }
}

export async function saveIntegration(congregationId: string, body: Record<string, unknown>) {
  const existing = await db.from('google_forms_integrations').where('congregation_id', congregationId).first()
  const sectionConfig = {
    sections: typeof body.sections === 'object' && body.sections ? body.sections : {},
    fields: typeof body.fields === 'object' && body.fields ? body.fields : {},
    mappings: typeof body.mappings === 'object' && body.mappings ? body.mappings : {},
  }
  const scriptUrl = typeof body.appsScriptUrl === 'string' ? body.appsScriptUrl.trim() : ''
  if (scriptUrl) {
    const parsed = new URL(scriptUrl)
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'script.google.com') {
      throw new Error('Informe a URL HTTPS do Web App publicado no script.google.com.')
    }
  }
  const values = {
    enabled: body.enabled === true,
    form_id: getFormId(body.formId),
    section_config: JSON.stringify(sectionConfig),
    apps_script_url: scriptUrl,
    apps_script_secret: existing?.apps_script_secret || encrypt(randomBytes(32).toString('hex')),
    updated_at: new Date(),
  }
  if (existing) await db.from('google_forms_integrations').where('congregation_id', congregationId).update(values)
  else {
    await db.table('google_forms_integrations').insert({
      congregation_id: congregationId,
      ...values,
      apps_script_secret: encrypt(randomBytes(32).toString('hex')),
      created_at: new Date(),
    })
  }
  return getIntegration(congregationId)
}

export async function startOAuth(congregationId: string) {
  const { clientId, redirectUri } = getClientConfig()
  const state = randomUUID()
  await db.table('google_oauth_states').insert({ state, congregation_id: congregationId, expires_at: new Date(Date.now() + 10 * 60_000) })
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: SCOPES.join(' '), access_type: 'offline', prompt: 'consent', state }).toString()
  return url.toString()
}

export async function finishOAuth(code: string, state: string) {
  const stateRow = await db.from('google_oauth_states').where('state', state).where('expires_at', '>', new Date()).first()
  await db.from('google_oauth_states').where('state', state).delete()
  if (!stateRow) throw new Error('A solicitação de conexão expirou. Tente novamente.')
  const { clientId, clientSecret, redirectUri } = getClientConfig()
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }) })
  const tokens = await tokenResponse.json() as { refresh_token?: string; access_token?: string; error_description?: string }
  if (!tokenResponse.ok || !tokens.refresh_token || !tokens.access_token) throw new Error(tokens.error_description || 'O Google não retornou autorização renovável.')
  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } })
  const profile = await profileResponse.json() as { email?: string }
  const row = await db.from('google_forms_integrations').where('congregation_id', stateRow.congregation_id).first()
  const values = { refresh_token: encrypt(tokens.refresh_token), google_email: profile.email || null, updated_at: new Date() }
  if (row) {
    await db.from('google_forms_integrations').where('congregation_id', stateRow.congregation_id).update({
      ...values,
      apps_script_secret: row.apps_script_secret || encrypt(randomBytes(32).toString('hex')),
    })
  } else {
    await db.table('google_forms_integrations').insert({
      congregation_id: stateRow.congregation_id,
      enabled: false,
      form_id: '',
      section_config: JSON.stringify(DEFAULT_SETTINGS),
      ...values,
      apps_script_secret: encrypt(randomBytes(32).toString('hex')),
      created_at: new Date(),
    })
  }
  return stateRow.congregation_id as string
}

async function getAccessToken(congregationId: string) {
  const integration = await db.from('google_forms_integrations').where('congregation_id', congregationId).first()
  if (!integration?.refresh_token) throw new Error('Conecte uma conta Google antes de continuar.')
  const { clientId, clientSecret } = getClientConfig()
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: decrypt(integration.refresh_token), grant_type: 'refresh_token' }) })
  const tokens = await response.json() as { access_token?: string; error_description?: string }
  if (!response.ok || !tokens.access_token) throw new Error(tokens.error_description || 'Falha ao renovar a autorização Google.')
  return tokens.access_token
}

export async function getFormQuestions(congregationId: string, requestedFormId: string) {
  const integration = await db.from('google_forms_integrations').where('congregation_id', congregationId).first()
  const formId = getFormId(requestedFormId || integration?.form_id)
  if (!formId) throw new Error('Informe o ID do Google Forms.')
  const token = await getAccessToken(congregationId)
  const response = await fetch(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}`, { headers: { Authorization: `Bearer ${token}` } })
  const body = await response.json() as { items?: Array<{ itemId?: string; title?: string; questionItem?: { question?: { questionId?: string } } }>; error?: { message?: string } }
  if (!response.ok) throw new Error(body.error?.message || 'Não foi possível acessar o formulário. Verifique o ID e a permissão de edição.')
  return (body.items || [])
    .filter((item) => item.questionItem?.question?.questionId)
    .map((item) => ({ id: item.itemId || '', title: item.title || 'Pergunta sem título' }))
    .filter((item) => item.id)
}

export async function submitIntegrationSection(
  congregationId: string,
  sectionId: string,
  record: Record<string, string>,
  fieldMap: Record<string, string>
) {
  const integration = await db.from('google_forms_integrations').where('congregation_id', congregationId).first()
  if (!integration?.enabled || !integration.form_id) return
  const rawSettings = typeof integration.section_config === 'string' ? JSON.parse(integration.section_config || '{}') : integration.section_config
  const settings = rawSettings as { sections?: Record<string, boolean>; fields?: Record<string, boolean>; mappings?: Record<string, string> }
  if (!settings.sections?.[sectionId]) return
  const answers: Record<string, { textAnswers: { answers: Array<{ value: string }> } }> = {}
  for (const [key, label] of Object.entries(fieldMap)) {
    const mappingKey = `${sectionId}:${label}`
    const questionId = settings.mappings?.[mappingKey]
    if (questionId && settings.fields?.[mappingKey] !== false && record[key]) {
      answers[questionId] = { textAnswers: { answers: [{ value: record[key] }] } }
    }
  }
  if (!Object.keys(answers).length) return
  if (!integration.apps_script_url || !integration.apps_script_secret) {
    throw new Error('Configure e salve a URL do Apps Script antes de ativar o envio automático.')
  }
  const response = await fetch(integration.apps_script_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: decrypt(integration.apps_script_secret),
      formId: integration.form_id,
      answers: Object.entries(answers).map(([itemId, answer]) => ({
        itemId,
        value: answer.textAnswers.answers.map((entry) => entry.value).join(', '),
      })),
    }),
  })
  const result = await response.json().catch(() => ({})) as { success?: boolean; message?: string }
  if (!response.ok || !result.success) throw new Error(result.message || `Envio da seção ${sectionId} ao Google Forms falhou.`)
}

export async function submitNewConvert(congregationId: string, convert: Record<string, string>) {
  const fieldMap: Record<string, string> = {
    eventName: 'Atividade', name: 'Nome', conversionDate: 'Data da conversão', birthDate: 'Data de nascimento',
    contactPhone: 'Telefone para contato', cep: 'CEP', street: 'Rua / logradouro', number: 'Número',
    complement: 'Complemento', neighborhood: 'Bairro', city: 'Cidade', state: 'Estado',
  }
  return submitIntegrationSection(congregationId, 'new-converts', convert, fieldMap)
}
