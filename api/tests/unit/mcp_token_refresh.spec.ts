import { mock } from 'node:test'
import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import {
  exchangeAuthorizationCode,
  hashSecret,
  persistentConnectionScopes,
  refreshAccessToken,
} from '#services/mcp_oauth_service'

type Row = Record<string, unknown>
const resource = 'https://discipulado.example/mcp'

// Exercise the real token service against a small transactional store without live credentials.
function tokenStore() {
  const tables: Record<string, Row[]> = {
    mcp_oauth_tokens: [],
    mcp_oauth_codes: [],
  }
  function query(table: string) {
    const filters: Array<(row: Row) => boolean> = []
    const builder = {
      where(key: string, value: unknown, comparison?: unknown) {
        filters.push((row) =>
          comparison === undefined
            ? row[key] === value
            : value === '>' &&
              new Date(String(row[key])).getTime() > new Date(String(comparison)).getTime()
        )
        return builder
      },
      whereNull(key: string) {
        filters.push((row) => row[key] === undefined || row[key] === null)
        return builder
      },
      forUpdate() {
        return builder
      },
      async first() {
        return tables[table].find((row) => filters.every((filter) => filter(row)))
      },
      async update(values: Row) {
        for (const row of tables[table].filter((item) => filters.every((filter) => filter(item))))
          Object.assign(row, values)
      },
      async insert(values: Row | Row[]) {
        tables[table].push(...(Array.isArray(values) ? values : [values]))
      },
    }
    return builder
  }
  const trx = { from: query, table: query }
  const transaction = mock.method(
    db,
    'transaction',
    async (callback: (client: typeof trx) => Promise<unknown>) => callback(trx)
  )
  return { tables, restore: () => transaction.mock.restore() }
}

test.group('Persistent MCP token lifecycle', () => {
  test('adds renewal permission without adding data permissions or duplicates', ({ assert }) => {
    assert.deepEqual(persistentConnectionScopes(['quizzes:write']), [
      'quizzes:write',
      'offline_access',
    ])
    assert.deepEqual(
      persistentConnectionScopes(['quizzes:read', 'offline_access', 'quizzes:read']),
      ['quizzes:read', 'offline_access']
    )
  })

  test('a consented connection issues and rotates refresh tokens without losing scopes', async ({
    assert,
    cleanup,
  }) => {
    const store = tokenStore()
    cleanup(store.restore)
    // RFC 7636 example verifier and challenge.
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    store.tables.mcp_oauth_codes.push({
      code_hash: hashSecret('test-code'),
      client_id: 'test-client',
      subject: 'admin@example.com',
      redirect_uri: 'https://chatgpt.com/connector_platform_oauth_redirect',
      resource,
      scopes: persistentConnectionScopes(['quizzes:read']).join(' '),
      code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
      expires_at: new Date(Date.now() + 60000),
    })
    const issued = await exchangeAuthorizationCode({
      code: 'test-code',
      codeVerifier: verifier,
      clientId: 'test-client',
      redirectUri: 'https://chatgpt.com/connector_platform_oauth_redirect',
      resource,
    })
    assert.isNotNull(issued)
    assert.isString(issued!.refresh_token)
    assert.equal(issued!.expires_in, 900)
    const refreshRow = store.tables.mcp_oauth_tokens.find((row) => row.token_type === 'refresh')!
    assert.closeTo(
      new Date(String(refreshRow.expires_at)).getTime() - Date.now(),
      30 * 86400000,
      2000
    )

    // The access token can expire while the refresh token remains usable.
    const accessRow = store.tables.mcp_oauth_tokens.find((row) => row.token_type === 'access')!
    accessRow.expires_at = new Date(Date.now() - 1000)
    const renewed = await refreshAccessToken({
      refreshToken: issued!.refresh_token!,
      clientId: 'test-client',
      resource,
    })
    assert.isNotNull(renewed)
    assert.notEqual(renewed!.access_token, issued!.access_token)
    assert.notEqual(renewed!.refresh_token, issued!.refresh_token)
    assert.equal(renewed!.scope, 'quizzes:read offline_access')
    assert.isDefined(refreshRow.revoked_at)
    assert.lengthOf(store.tables.mcp_oauth_tokens, 4)

    const next = await refreshAccessToken({
      refreshToken: renewed!.refresh_token!,
      clientId: 'test-client',
      resource,
    })
    assert.isNotNull(next)
    assert.equal(next!.scope, renewed!.scope)
  })

  test('rejects expired or incorrectly bound refresh tokens', async ({ assert, cleanup }) => {
    const store = tokenStore()
    cleanup(store.restore)
    store.tables.mcp_oauth_tokens.push({
      token_hash: hashSecret('refresh'),
      token_type: 'refresh',
      client_id: 'test-client',
      resource,
      expires_at: new Date(Date.now() + 60000),
    })
    assert.isNull(
      await refreshAccessToken({ refreshToken: 'refresh', clientId: 'other-client', resource })
    )
    assert.isNull(
      await refreshAccessToken({
        refreshToken: 'refresh',
        clientId: 'test-client',
        resource: 'https://other.example/mcp',
      })
    )
    store.tables.mcp_oauth_tokens[0].expires_at = new Date(Date.now() - 1000)
    assert.isNull(
      await refreshAccessToken({ refreshToken: 'refresh', clientId: 'test-client', resource })
    )
    assert.lengthOf(store.tables.mcp_oauth_tokens, 1)
  })
})
