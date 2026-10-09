import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { getCongregationId, getIntegration, getSentItems, markItemSent, saveIntegration, scrapePublicFormQuestions } from '#services/google_forms_service'

const VALID_SECTIONS = new Set(['new-converts', 'students', 'classes', 'teachers', 'attendance'])

async function validCongregation(congregationId: string) {
  return Boolean(congregationId && await db.from('congregations').where('id', congregationId).first())
}

export default class IntegrationsController {
  async show({ request, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    if (!(await validCongregation(congregationId))) return response.badRequest({ message: 'Selecione uma congregação válida.' })
    return response.ok(await getIntegration(congregationId))
  }

  async save({ request, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    if (!(await validCongregation(congregationId))) return response.badRequest({ message: 'Selecione uma congregação válida.' })
    try {
      return response.ok(await saveIntegration(congregationId, request.body()))
    } catch (error) {
      return response.badRequest({ message: error instanceof Error ? error.message : 'Não foi possível salvar a integração.' })
    }
  }

  async questions({ request, params, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    if (!(await validCongregation(congregationId))) return response.badRequest({ message: 'Selecione uma congregação válida.' })
    try {
      return response.ok({ questions: await scrapePublicFormQuestions(params.formId) })
    } catch (error) {
      return response.badRequest({ message: error instanceof Error ? error.message : 'Falha ao ler os campos públicos do formulário.' })
    }
  }

  async sentItems({ request, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    if (!(await validCongregation(congregationId))) return response.badRequest({ message: 'Selecione uma congregação válida.' })
    const rows = await getSentItems(congregationId)
    return response.ok({ items: rows.map((row) => ({ sectionId: row.section_id, recordId: row.record_id, sentAt: row.sent_at })) })
  }

  async markSent({ request, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    if (!(await validCongregation(congregationId))) return response.badRequest({ message: 'Selecione uma congregação válida.' })
    const { sectionId, recordId } = request.only(['sectionId', 'recordId'])
    if (typeof sectionId !== 'string' || !VALID_SECTIONS.has(sectionId) || typeof recordId !== 'string' || !recordId.trim()) {
      return response.badRequest({ message: 'Informe uma seção e um cadastro válidos.' })
    }
    const config = await getIntegration(congregationId)
    if (!config.enabled || !config.sections[sectionId]) return response.badRequest({ message: 'A seção não está habilitada nesta congregação.' })
    if (!config.formId) return response.badRequest({ message: 'Configure o formulário antes de marcar envios.' })

    let exists = false
    if (sectionId === 'new-converts' || sectionId === 'students' || sectionId === 'classes' || sectionId === 'teachers') {
      const table = sectionId === 'new-converts' ? 'new_converts' : sectionId
      exists = Boolean(await db.from(table).where('id', recordId).where('congregation_id', congregationId).first())
    } else {
      exists = Boolean(await db.from('attendance_records')
        .innerJoin('classes', 'classes.id', 'attendance_records.class_id')
        .where('attendance_records.id', recordId)
        .where('classes.congregation_id', congregationId)
        .first())
    }
    if (!exists) return response.notFound({ message: 'O cadastro não pertence à congregação selecionada.' })
    await markItemSent(congregationId, config.formId, sectionId, recordId)
    return response.ok({ success: true })
  }
}
