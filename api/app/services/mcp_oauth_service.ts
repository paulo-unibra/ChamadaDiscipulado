import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import type { QueryClientContract } from '@adonisjs/lucid/types/database'
import env from '#start/env'

export const MCP_SCOPES = [
  'congregations:read',
  'converts:read',
  'classes:read',
  'attendance:read',
  'offline_access',
] as const

const ACCESS_TOKEN_SECONDS = 15 * 60
const REFRESH_TOKEN_SECONDS = 30 * 24 * 60 * 60
const FLOW_SECONDS = 15 * 60
const CODE_SECONDS = 5 * 60

export function mcpBaseUrl() {
  const configuredUrl = env.get('MCP_PUBLIC_URL')?.trim()
  const value = (
    configuredUrl ||
    (env.get('NODE_ENV') === 'production' ? 'https://discipulado.bibliafoco.com.br' : '')
  ).replace(/\/$/, '')
  if (!value) throw new Error('MCP_PUBLIC_URL não está configurada.')
  const url = new URL(value)
  if (url.protocol !== 'https:' && env.get('NODE_ENV') === 'production') {
    throw new Error('MCP_PUBLIC_URL deve usar HTTPS em produção.')
  }
  if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('MCP_PUBLIC_URL deve ser a origem pública, sem caminho ou parâmetros.')
  }
  return url.toString().replace(/\/$/, '')
}

export function mcpResource() {
  return `${mcpBaseUrl()}/mcp`
}

export function hashSecret(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function isAccessTokenActive(
  token:
    | {
        token_type: string
        resource: string
        expires_at: Date | string
        revoked_at: Date | string | null
      }
    | undefined,
  expectedResource: string,
  now = new Date()
) {
  return Boolean(
    token &&
    token.token_type === 'access' &&
    token.resource === expectedResource &&
    !token.revoked_at &&
    new Date(token.expires_at).getTime() > now.getTime()
  )
}

function randomSecret(bytes = 32) {
  return randomBytes(bytes).toString('base64url')
}

function sameSecret(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export function parseRedirectUri(value: unknown) {
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const url = new URL(value)
    const chatgptCallback =
      url.protocol === 'https:' &&
      url.hostname === 'chatgpt.com' &&
      (url.pathname === '/connector_platform_oauth_redirect' ||
        /^\/connector\/oauth\/[a-zA-Z0-9_-]+$/.test(url.pathname)) &&
      !url.search &&
      !url.hash
    const localCallback =
      env.get('NODE_ENV') !== 'production' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
      ['http:', 'https:'].includes(url.protocol)
    return url.username || url.password || url.hash || (!chatgptCallback && !localCallback)
      ? null
      : value
  } catch {
    return null
  }
}

export async function registerClient(body: Record<string, unknown>) {
  const redirects = body.redirect_uris
  const clientName =
    typeof body.client_name === 'string' ? body.client_name.trim().slice(0, 120) : 'ChatGPT'
  const authMethod = body.token_endpoint_auth_method
  const requestedGrants = body.grant_types
  const requestedResponses = body.response_types
  if (
    (authMethod !== undefined && authMethod !== 'none') ||
    (requestedGrants !== undefined &&
      (!Array.isArray(requestedGrants) ||
        !requestedGrants.includes('authorization_code') ||
        requestedGrants.some(
          (grant) => !['authorization_code', 'refresh_token'].includes(String(grant))
        ))) ||
    (requestedResponses !== undefined &&
      (!Array.isArray(requestedResponses) ||
        !requestedResponses.includes('code') ||
        requestedResponses.some((type) => type !== 'code'))) ||
    !Array.isArray(redirects) ||
    redirects.length < 1 ||
    redirects.length > 10 ||
    !redirects.every((uri) => parseRedirectUri(uri))
  ) {
    throw new Error('redirect_uris inválido. São aceitos callbacks HTTPS do ChatGPT.')
  }
  const clientId = randomUUID()
  await db.table('mcp_oauth_clients').insert({
    client_id: clientId,
    client_name: clientName || 'ChatGPT',
    redirect_uris: JSON.stringify(Array.from(new Set(redirects))),
  })
  return {
    client_id: clientId,
    client_name: clientName || 'ChatGPT',
    redirect_uris: Array.from(new Set(redirects)),
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scope: MCP_SCOPES.join(' '),
  }
}

export async function getClient(clientId: string) {
  const row = await db.from('mcp_oauth_clients').where('client_id', clientId).first()
  if (!row) return null
  let redirectUris: string[] = []
  try {
    redirectUris = JSON.parse(row.redirect_uris)
  } catch {
    return null
  }
  return { id: String(row.client_id), name: String(row.client_name), redirectUris }
}

export async function createFlow(input: {
  clientId: string
  redirectUri: string
  state: string
  codeChallenge: string
  scopes: string[]
  resource: string
}) {
  if (input.state.length > 1024) throw new Error('OAuth state excede o tamanho permitido.')
  const flowId = randomSecret()
  await db.table('mcp_oauth_flows').insert({
    flow_hash: hashSecret(flowId),
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    state: input.state || null,
    code_challenge: input.codeChallenge,
    scopes: input.scopes.join(' '),
    resource: input.resource,
    expires_at: new Date(Date.now() + FLOW_SECONDS * 1000),
  })
  return flowId
}

export async function getFlow(flowId: string) {
  return db
    .from('mcp_oauth_flows')
    .where('flow_hash', hashSecret(flowId))
    .where('expires_at', '>', new Date())
    .first()
}

export async function setLoginChallenge(flowId: string, challengeId: string) {
  await db
    .from('mcp_oauth_flows')
    .where('flow_hash', hashSecret(flowId))
    .where('expires_at', '>', new Date())
    .update({ login_challenge_id: challengeId })
}

export async function setFlowSubject(flowId: string, email: string) {
  await db
    .from('mcp_oauth_flows')
    .where('flow_hash', hashSecret(flowId))
    .where('expires_at', '>', new Date())
    .update({ subject: email })
}

export async function issueAuthorizationCode(flowId: string, subject: string, scopes: string[]) {
  const code = randomSecret(32)
  const codeHash = hashSecret(code)
  await db.transaction(async (trx) => {
    const flow = await trx
      .from('mcp_oauth_flows')
      .where('flow_hash', hashSecret(flowId))
      .where('expires_at', '>', new Date())
      .forUpdate()
      .first()
    if (!flow) throw new Error('A autorização expirou. Inicie a conexão novamente.')
    await trx.from('mcp_oauth_flows').where('flow_hash', hashSecret(flowId)).delete()
    await trx.table('mcp_oauth_codes').insert({
      code_hash: codeHash,
      client_id: flow.client_id,
      subject,
      redirect_uri: flow.redirect_uri,
      code_challenge: flow.code_challenge,
      scopes: scopes.join(' '),
      resource: flow.resource,
      expires_at: new Date(Date.now() + CODE_SECONDS * 1000),
    })
  })
  return code
}

export function verifyPkce(codeVerifier: string, challenge: string) {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)) return false
  const actual = createHash('sha256').update(codeVerifier).digest('base64url')
  return sameSecret(actual, challenge)
}

async function insertTokenPair(
  trx: typeof db | QueryClientContract,
  grant: { familyId: string; clientId: string; subject: string; scopes: string; resource: string }
) {
  const accessToken = randomSecret(32)
  const now = Date.now()
  const records = [
    {
      id: randomUUID(),
      token_hash: hashSecret(accessToken),
      token_type: 'access',
      family_id: grant.familyId,
      client_id: grant.clientId,
      subject: grant.subject,
      scopes: grant.scopes,
      resource: grant.resource,
      expires_at: new Date(now + ACCESS_TOKEN_SECONDS * 1000),
    },
  ]
  const refreshToken = grant.scopes.split(/\s+/).includes('offline_access')
    ? randomSecret(48)
    : null
  if (refreshToken) {
    records.push({
      id: randomUUID(),
      token_hash: hashSecret(refreshToken),
      token_type: 'refresh',
      family_id: grant.familyId,
      client_id: grant.clientId,
      subject: grant.subject,
      scopes: grant.scopes,
      resource: grant.resource,
      expires_at: new Date(now + REFRESH_TOKEN_SECONDS * 1000),
    })
  }
  await trx.table('mcp_oauth_tokens').insert(records)
  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_SECONDS,
    ...(refreshToken ? { refresh_token: refreshToken } : {}),
    scope: grant.scopes,
  }
}

export async function exchangeAuthorizationCode(input: {
  code: string
  codeVerifier: string
  clientId: string
  redirectUri: string
  resource: string
}) {
  return db.transaction(async (trx) => {
    const row = await trx
      .from('mcp_oauth_codes')
      .where('code_hash', hashSecret(input.code))
      .where('client_id', input.clientId)
      .where('redirect_uri', input.redirectUri)
      .where('resource', input.resource)
      .where('expires_at', '>', new Date())
      .whereNull('used_at')
      .forUpdate()
      .first()
    if (!row || !verifyPkce(input.codeVerifier, String(row.code_challenge))) return null
    await trx
      .from('mcp_oauth_codes')
      .where('code_hash', hashSecret(input.code))
      .update({ used_at: new Date() })
    return insertTokenPair(trx, {
      familyId: randomUUID(),
      clientId: input.clientId,
      subject: row.subject,
      scopes: row.scopes,
      resource: row.resource,
    })
  })
}

export async function refreshAccessToken(input: {
  refreshToken: string
  clientId: string
  resource: string
}) {
  return db.transaction(async (trx) => {
    const hash = hashSecret(input.refreshToken)
    const row = await trx
      .from('mcp_oauth_tokens')
      .where('token_hash', hash)
      .where('token_type', 'refresh')
      .where('client_id', input.clientId)
      .where('resource', input.resource)
      .forUpdate()
      .first()
    if (!row) return null
    if (row.revoked_at) {
      await trx
        .from('mcp_oauth_tokens')
        .where('family_id', row.family_id)
        .whereNull('revoked_at')
        .update({ revoked_at: new Date() })
      return null
    }
    if (new Date(row.expires_at).getTime() <= Date.now()) return null
    await trx.from('mcp_oauth_tokens').where('token_hash', hash).update({ revoked_at: new Date() })
    return insertTokenPair(trx, {
      familyId: row.family_id,
      clientId: row.client_id,
      subject: row.subject,
      scopes: row.scopes,
      resource: row.resource,
    })
  })
}

export async function validateAccessToken(token: string, resource: string) {
  if (!token) return null
  const row = await db.from('mcp_oauth_tokens').where('token_hash', hashSecret(token)).first()
  return isAccessTokenActive(row, resource) ? row : null
}

export async function revokeToken(token: string, clientId: string) {
  if (!token) return
  const hash = hashSecret(token)
  await db.transaction(async (trx) => {
    const row = await trx
      .from('mcp_oauth_tokens')
      .where('token_hash', hash)
      .where('client_id', clientId)
      .whereNull('revoked_at')
      .first()
    if (!row) return
    await trx
      .from('mcp_oauth_tokens')
      .where('family_id', row.family_id)
      .whereNull('revoked_at')
      .update({ revoked_at: new Date() })
  })
}

export async function getCongregationsForAdmin(email: string) {
  return db
    .from('admin_congregations')
    .innerJoin('congregations', 'congregations.id', 'admin_congregations.congregation_id')
    .where('admin_congregations.admin_email', email)
    .select('congregations.id', 'congregations.name')
    .orderBy('congregations.name', 'asc')
}
