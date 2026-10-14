import { test } from '@japa/runner'

test.group('ChatGPT MCP discovery and transport', () => {
  test('publishes OAuth protected-resource metadata', async ({ client, assert }) => {
    const response = await client.get('/.well-known/oauth-protected-resource/mcp')
    response.assertStatus(200)
    assert.equal(response.body().resource, 'https://discipulado.bibliafoco.com.br/mcp')
    assert.deepEqual(response.body().authorization_servers, [
      'https://discipulado.bibliafoco.com.br',
    ])
    assert.include(response.body().scopes_supported, 'converts:read')
  })

  test('publishes an OAuth authorization server with PKCE and DCR', async ({ client, assert }) => {
    const response = await client.get('/.well-known/oauth-authorization-server')
    response.assertStatus(200)
    assert.equal(
      response.body().authorization_endpoint,
      'https://discipulado.bibliafoco.com.br/oauth/authorize'
    )
    assert.equal(response.body().token_endpoint_auth_methods_supported[0], 'none')
    assert.include(response.body().code_challenge_methods_supported, 'S256')
    assert.equal(
      response.body().registration_endpoint,
      'https://discipulado.bibliafoco.com.br/oauth/register'
    )
  })

  test('initializes Streamable HTTP without a session and advertises read-only tools', async ({
    client,
    assert,
  }) => {
    const response = await client
      .post('/mcp')
      .header('Accept', 'application/json, text/event-stream')
      .json({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-11-25' },
      })
    response.assertStatus(200)
    assert.equal(response.body().result.protocolVersion, '2025-11-25')
    assert.deepEqual(response.body().result.capabilities, { tools: { listChanged: false } })
  })

  test('lists read and write tools with the required OAuth scopes', async ({ client, assert }) => {
    const response = await client
      .post('/mcp')
      .header('Accept', 'application/json, text/event-stream')
      .json({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
    response.assertStatus(200)
    const tools = response.body().result.tools as Array<{
      name: string
      securitySchemes: Array<{ type: string; scopes: string[] }>
      annotations?: { readOnlyHint?: boolean }
    }>
    assert.deepEqual(
      tools.map((tool) => tool.name),
      [
        'get_profile',
        'list_congregations',
        'search_new_converts',
        'create_new_convert',
        'list_converts_without_discipleship',
        'list_classes',
        'query_attendance',
      ]
    )
    assert.isTrue(
      tools.every((tool) => tool.securitySchemes.some((scheme) => scheme.type === 'oauth2'))
    )
    const createTool = tools.find((tool) => tool.name === 'create_new_convert')
    assert.isFalse(createTool?.annotations?.readOnlyHint)
    assert.include(createTool?.securitySchemes[0].scopes, 'converts:write')
  })

  test('rejects GET streaming when the server does not open SSE sessions', async ({ client }) => {
    const get = await client.get('/mcp')
    get.assertStatus(405)
  })
})
