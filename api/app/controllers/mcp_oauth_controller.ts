import type { HttpContext } from '@adonisjs/core/http'
import { randomBytes } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import authService from '#services/auth_service'
import {
  createFlow,
  exchangeAuthorizationCode,
  getClient,
  getFlow,
  hashSecret,
  issueAuthorizationCode,
  MCP_SCOPES,
  mcpBaseUrl,
  mcpResource,
  refreshAccessToken,
  registerClient,
  revokeToken,
  setFlowSubject,
  setLoginChallenge,
} from '#services/mcp_oauth_service'

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'congregations:read': 'Ver as congregações que sua conta pode acessar.',
  'converts:read': 'Consultar dados cadastrais de novos convertidos.',
  'classes:read': 'Consultar turmas e vínculos de alunos.',
  'attendance:read': 'Consultar registros de frequência e presença.',
  'offline_access': 'Manter a conexão ativa usando tokens de renovação.',
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return map[char]
  })
}

function page(title: string, content: string, status = 200) {
  return { title, content, status }
}

function htmlPage(response: HttpContext['response'], value: ReturnType<typeof page>) {
  const nonce = randomBytes(18).toString('base64url')
  const formAction = escapeHtml(`${mcpBaseUrl()}/oauth/authorize`)
  const content = value.content
    .replaceAll('action="/oauth/authorize"', `action="${formAction}"`)
    .replaceAll('<form ', '<form data-submit-once ')
  response.header('Cache-Control', 'no-store')
  response.header('Pragma', 'no-cache')
  response.header('X-Content-Type-Options', 'nosniff')
  response.header('X-Frame-Options', 'DENY')
  response.header(
    'Content-Security-Policy',
    `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`
  )
  return response
    .status(value.status)
    .type('html')
    .send(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(value.title)}</title><style>body{font:16px system-ui,sans-serif;max-width:520px;margin:8vh auto;padding:24px;color:#183128;background:#f6f8f5}main{background:#fff;border:1px solid #dce5df;border-radius:16px;padding:28px;box-shadow:0 12px 40px #18312812}h1{font-size:24px;margin:0 0 8px}p{line-height:1.5;color:#51635a}label{display:block;font-weight:600;margin:16px 0 6px}input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #bac8bf;border-radius:8px;font:inherit}button{padding:12px 16px;border:0;border-radius:8px;background:#18794e;color:#fff;font:inherit;font-weight:700;cursor:pointer;margin-top:18px}button.secondary{background:#e8eee9;color:#244536;margin-left:8px}.permissions{padding-left:22px;line-height:1.8}.brand{font-size:12px;letter-spacing:.12em;color:#18794e;font-weight:700;margin-bottom:20px}.error{color:#a12727;background:#fff2f0;padding:12px;border-radius:8px}</style></head><body><main><div class="brand">CHAMADA DISCIPULADO</div>${content}</main><script nonce="${nonce}">document.addEventListener('submit',event=>{const form=event.target;if(!(form instanceof HTMLFormElement)||!form.hasAttribute('data-submit-once'))return;if(form.dataset.submitted){event.preventDefault();return}form.dataset.submitted='true';const button=event.submitter;if(button){if(button.name){const hidden=document.createElement('input');hidden.type='hidden';hidden.name=button.name;hidden.value=button.value;form.append(hidden)}button.disabled=true;button.textContent='Enviando…'}})</script></body></html>`
    )
}

function responseParams(request: HttpContext['request']) {
  const body = request.body()
  return {
    ...request.qs(),
    ...(body && typeof body === 'object' && !Array.isArray(body) ? body : {}),
  } as Record<string, unknown>
}

function redirectWithError(uri: string, state: string, error: string, description: string) {
  const target = new URL(uri)
  target.searchParams.set('error', error)
  target.searchParams.set('error_description', description)
  if (state) target.searchParams.set('state', state)
  return target.toString()
}

export default class McpOauthController {
  async protectedResource({ response }: HttpContext) {
    try {
      const base = mcpBaseUrl()
      return response.ok({
        resource: mcpResource(),
        authorization_servers: [base],
        scopes_supported: [...MCP_SCOPES],
      })
    } catch {
      return response.serviceUnavailable({ error: 'OAuth MCP não está configurado.' })
    }
  }

  async authorizationServerMetadata({ response }: HttpContext) {
    try {
      const base = mcpBaseUrl()
      return response.ok({
        issuer: base,
        authorization_endpoint: `${base}/oauth/authorize`,
        token_endpoint: `${base}/oauth/token`,
        registration_endpoint: `${base}/oauth/register`,
        revocation_endpoint: `${base}/oauth/revoke`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['none'],
        scopes_supported: [...MCP_SCOPES],
        client_id_metadata_document_supported: false,
        authorization_response_iss_parameter_supported: false,
      })
    } catch {
      return response.serviceUnavailable({ error: 'OAuth MCP não está configurado.' })
    }
  }

  async register({ request, response }: HttpContext) {
    try {
      const body = request.body()
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return response.badRequest({ error: 'invalid_client_metadata' })
      }
      return response.created(await registerClient(body as Record<string, unknown>))
    } catch (error) {
      return response.badRequest({
        error: 'invalid_client_metadata',
        error_description:
          error instanceof Error ? error.message : 'Metadados do cliente inválidos.',
      })
    }
  }

  async authorize({ request, response }: HttpContext) {
    const params = responseParams(request)
    const clientId = stringValue(params.client_id)
    const redirectUri = stringValue(params.redirect_uri)
    const state = stringValue(params.state)
    const challenge = stringValue(params.code_challenge)
    const resource = stringValue(params.resource)
    const requestedScopes = stringValue(params.scope).split(/\s+/).filter(Boolean)
    const client = await getClient(clientId)
    if (
      !client ||
      !client.redirectUris.includes(redirectUri) ||
      params.response_type !== 'code' ||
      params.code_challenge_method !== 'S256' ||
      !/^[A-Za-z0-9_-]{43}$/.test(challenge) ||
      resource !== mcpResource() ||
      requestedScopes.length === 0 ||
      requestedScopes.some((scope) => !(MCP_SCOPES as readonly string[]).includes(scope))
    ) {
      return response.badRequest({
        error: 'invalid_request',
        error_description: 'Parâmetros OAuth inválidos.',
      })
    }
    const flowId = await createFlow({
      clientId,
      redirectUri,
      state,
      codeChallenge: challenge,
      scopes: Array.from(new Set(requestedScopes)),
      resource,
    })
    return htmlPage(
      response,
      page(
        'Conectar ChatGPT',
        `<h1>Conectar ChatGPT</h1><p>Entre na sua conta Chamada Discipulado. Sua senha e o código de verificação são enviados diretamente a este sistema e nunca ao ChatGPT.</p><form method="post" action="/oauth/authorize"><input type="hidden" name="flow_id" value="${escapeHtml(flowId)}"><input type="hidden" name="action" value="login"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="username" required><label for="password">Senha</label><input id="password" name="password" type="password" autocomplete="current-password" required><button type="submit">Continuar</button></form>`
      )
    )
  }

  async authorizePost({ request, response }: HttpContext) {
    const body = request.body() as Record<string, unknown>
    const flowId = stringValue(body.flow_id)
    const action = stringValue(body.action)
    const flow = flowId ? await getFlow(flowId) : null
    if (!flow)
      return htmlPage(
        response,
        page(
          'Conexão expirada',
          '<h1>Conexão expirada</h1><p>Volte ao ChatGPT e inicie a conexão novamente.</p>',
          400
        )
      )
    const client = await getClient(String(flow.client_id))
    if (!client)
      return htmlPage(
        response,
        page('Cliente inválido', '<h1>Não foi possível continuar</h1>', 400)
      )

    if (action === 'login') {
      try {
        const challenge = await authService.beginLogin(
          stringValue(body.email),
          typeof body.password === 'string' ? body.password : ''
        )
        if (!challenge) throw new Error('E-mail ou senha incorretos.')
        await setLoginChallenge(flowId, challenge)
        return htmlPage(
          response,
          page(
            'Verificar e-mail',
            `<h1>Verifique seu e-mail</h1><p>Enviamos um código de acesso para o endereço cadastrado. Ele expira em 5 minutos.</p><form method="post" action="/oauth/authorize"><input type="hidden" name="flow_id" value="${escapeHtml(flowId)}"><input type="hidden" name="action" value="verify"><label for="code">Código de verificação</label><input id="code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required><button type="submit">Verificar e continuar</button></form>`
          )
        )
      } catch (error) {
        return htmlPage(
          response,
          page(
            'Falha no login',
            `<h1>Não foi possível entrar</h1><p class="error">${escapeHtml(error instanceof Error ? error.message : 'Tente novamente.')}</p><p>Feche esta janela e inicie uma nova conexão pelo ChatGPT.</p>`,
            401
          )
        )
      }
    }

    if (action === 'verify') {
      const challengeId = stringValue(flow.login_challenge_id)
      const email = challengeId
        ? await authService.consumeLoginChallenge(challengeId, stringValue(body.code))
        : null
      if (!email) {
        return htmlPage(
          response,
          page(
            'Código inválido',
            '<h1>Código inválido ou expirado</h1><p>Feche esta janela e inicie uma nova conexão para receber outro código.</p>',
            401
          )
        )
      }
      await setFlowSubject(flowId, email)
      return this.consentPage(response, flowId, 'ChatGPT', String(flow.scopes))
    }

    if (action === 'consent') {
      const subject = stringValue(flow.subject)
      if (!subject)
        return htmlPage(response, page('Login necessário', '<h1>Entre novamente</h1>', 401))
      if (body.decision !== 'approve') {
        await db.from('mcp_oauth_flows').where('flow_hash', hashSecret(flowId)).delete()
        const redirect = redirectWithError(
          String(flow.redirect_uri),
          String(flow.state ?? ''),
          'access_denied',
          'O usuário recusou as permissões solicitadas.'
        )
        response.header('Location', redirect)
        return response.status(302).send('Autorização recusada. Você pode fechar esta janela.')
      }
      try {
        const code = await issueAuthorizationCode(flowId, subject, String(flow.scopes).split(/\s+/))
        const redirect = new URL(String(flow.redirect_uri))
        redirect.searchParams.set('code', code)
        if (flow.state) redirect.searchParams.set('state', String(flow.state))
        response.header('Location', redirect.toString())
        return response.status(302).send('Conexão autorizada. Retornando ao ChatGPT…')
      } catch (error) {
        return htmlPage(
          response,
          page(
            'Falha na autorização',
            `<h1>Não foi possível autorizar</h1><p>${escapeHtml(error instanceof Error ? error.message : 'Inicie a conexão novamente.')}</p>`,
            400
          )
        )
      }
    }
    return htmlPage(response, page('Solicitação inválida', '<h1>Solicitação inválida</h1>', 400))
  }

  private consentPage(
    response: HttpContext['response'],
    flowId: string,
    clientName: string,
    scopes: string
  ) {
    const permissions = scopes
      .split(/\s+/)
      .filter(Boolean)
      .map((scope) => `<li>${escapeHtml(PERMISSION_DESCRIPTIONS[scope] ?? scope)}</li>`)
      .join('')
    return htmlPage(
      response,
      page(
        'Autorizar ChatGPT',
        `<h1>Autorizar ${escapeHtml(clientName)}?</h1><p>Esta conexão permitirá ao ChatGPT acessar as informações abaixo da sua conta:</p><ul class="permissions">${permissions}</ul><p>A autorização vale para a conta conectada. O acesso aos dados continua limitado às congregações associadas a ela.</p><form method="post" action="/oauth/authorize"><input type="hidden" name="flow_id" value="${escapeHtml(flowId)}"><input type="hidden" name="action" value="consent"><button name="decision" value="approve" type="submit">Autorizar conexão</button><button class="secondary" name="decision" value="deny" type="submit">Recusar</button></form>`
      )
    )
  }

  async token({ request, response }: HttpContext) {
    const params = responseParams(request)
    const grantType = stringValue(params.grant_type)
    const clientId = stringValue(params.client_id)
    const resource = stringValue(params.resource)
    if (!clientId || !(await getClient(clientId)) || resource !== mcpResource()) {
      return response.badRequest({
        error: 'invalid_request',
        error_description: 'Cliente ou resource inválido.',
      })
    }
    try {
      const tokens =
        grantType === 'authorization_code'
          ? await exchangeAuthorizationCode({
              code: stringValue(params.code),
              codeVerifier: stringValue(params.code_verifier),
              clientId,
              redirectUri: stringValue(params.redirect_uri),
              resource,
            })
          : grantType === 'refresh_token'
            ? await refreshAccessToken({
                refreshToken: stringValue(params.refresh_token),
                clientId,
                resource,
              })
            : null
      if (!tokens)
        return response.badRequest({
          error: 'invalid_grant',
          error_description: 'Código ou token inválido, expirado ou já utilizado.',
        })
      response.header('Cache-Control', 'no-store')
      response.header('Pragma', 'no-cache')
      return response.ok(tokens)
    } catch {
      return response.badRequest({
        error: 'invalid_grant',
        error_description: 'Não foi possível emitir os tokens.',
      })
    }
  }

  async revoke({ request, response }: HttpContext) {
    const params = responseParams(request)
    const clientId = stringValue(params.client_id)
    if (clientId && (await getClient(clientId))) {
      await revokeToken(stringValue(params.token), clientId)
    }
    response.header('Cache-Control', 'no-store')
    return response.status(200).send(null)
  }
}
