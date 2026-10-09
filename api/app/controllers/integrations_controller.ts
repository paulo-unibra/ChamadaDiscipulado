import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import { finishOAuth, getCongregationId, getFormQuestions, getIntegration, saveIntegration, startOAuth } from '#services/google_forms_service'

export default class IntegrationsController {
  async show({ request, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    if (!congregationId || !(await db.from('congregations').where('id', congregationId).first())) return response.badRequest({ message: 'Selecione uma congregação válida.' })
    return response.ok(await getIntegration(congregationId))
  }

  async save({ request, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    if (!congregationId || !(await db.from('congregations').where('id', congregationId).first())) return response.badRequest({ message: 'Selecione uma congregação válida.' })
    return response.ok(await saveIntegration(congregationId, request.body()))
  }

  async connect({ request, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    if (!congregationId || !(await db.from('congregations').where('id', congregationId).first())) return response.badRequest({ message: 'Selecione uma congregação válida.' })
    try { return response.ok({ authorizationUrl: await startOAuth(congregationId) }) }
    catch (error) { return response.serviceUnavailable({ message: error instanceof Error ? error.message : 'Falha ao iniciar conexão Google.' }) }
  }

  async callback({ request, response }: HttpContext) {
    const appUrl = env.get('WEB_APP_URL', 'http://localhost:5173')
    try {
      const code = request.input('code')
      const state = request.input('state')
      if (typeof code !== 'string' || typeof state !== 'string') throw new Error('Resposta de autorização Google inválida.')
      const congregationId = await finishOAuth(code, state)
      return response.redirect(`${appUrl}/integracoes?congregationId=${encodeURIComponent(congregationId)}&google=connected`)
    } catch (error) {
      return response.redirect(`${appUrl}/integracoes?google=error&message=${encodeURIComponent(error instanceof Error ? error.message : 'Falha na conexão Google.')}`)
    }
  }

  async questions({ request, params, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    if (!congregationId || !(await db.from('congregations').where('id', congregationId).first())) return response.badRequest({ message: 'Selecione uma congregação válida.' })
    try { return response.ok({ questions: await getFormQuestions(congregationId, params.formId) }) }
    catch (error) { return response.badRequest({ message: error instanceof Error ? error.message : 'Falha ao consultar o formulário.' }) }
  }
}
