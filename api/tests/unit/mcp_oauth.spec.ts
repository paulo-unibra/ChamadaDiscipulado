import { createHash } from 'node:crypto'
import { test } from '@japa/runner'
import {
  hashSecret,
  isAccessTokenActive,
  parseRedirectUri,
  verifyPkce,
} from '#services/mcp_oauth_service'
import { resolveAuthorizedCongregation } from '#controllers/mcp_controller'

test.group('MCP OAuth security primitives', () => {
  test('validates PKCE S256 and rejects a mismatched verifier', ({ assert }) => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    const challenge = createHash('sha256').update(verifier).digest('base64url')
    assert.isTrue(verifyPkce(verifier, challenge))
    assert.isFalse(verifyPkce(`${verifier}x`, challenge))
    assert.isFalse(verifyPkce('short', challenge))
  })

  test('accepts ChatGPT callbacks and rejects arbitrary redirect origins', ({ assert }) => {
    assert.equal(
      parseRedirectUri('https://chatgpt.com/connector_platform_oauth_redirect'),
      'https://chatgpt.com/connector_platform_oauth_redirect'
    )
    assert.equal(
      parseRedirectUri('https://chatgpt.com/connector/oauth/callback_123'),
      'https://chatgpt.com/connector/oauth/callback_123'
    )
    assert.isNull(parseRedirectUri('https://attacker.example/steal'))
    assert.isNull(
      parseRedirectUri('https://chatgpt.com.evil.example/connector_platform_oauth_redirect')
    )
  })

  test('stores hashes instead of raw tokens', ({ assert }) => {
    const token = 'random-test-access-token'
    const hash = hashSecret(token)
    assert.notEqual(hash, token)
    assert.equal(hash.length, 64)
    assert.equal(hashSecret(token), hash)
  })

  test('denies expired, revoked, and wrong-resource access tokens', ({ assert }) => {
    const now = new Date('2026-10-13T12:00:00.000Z')
    const active = {
      token_type: 'access',
      resource: 'https://discipulado.example/mcp',
      expires_at: new Date('2026-10-13T12:15:00.000Z'),
      revoked_at: null,
    }
    assert.isTrue(isAccessTokenActive(active, 'https://discipulado.example/mcp', now))
    assert.isFalse(
      isAccessTokenActive(
        { ...active, expires_at: new Date('2026-10-13T11:59:59.000Z') },
        'https://discipulado.example/mcp',
        now
      )
    )
    assert.isFalse(
      isAccessTokenActive({ ...active, revoked_at: now }, 'https://discipulado.example/mcp', now)
    )
    assert.isFalse(isAccessTokenActive(active, 'https://other.example/mcp', now))
  })

  test('restricts requested congregation to the authenticated account grants', ({ assert }) => {
    const available = [
      { id: 'c-1', name: 'Congregação 1' },
      { id: 'c-2', name: 'Congregação 2' },
    ]
    assert.equal(resolveAuthorizedCongregation(available, 'c-1'), 'c-1')
    assert.throws(() => resolveAuthorizedCongregation(available, 'c-3'), /não tem acesso/)
    assert.throws(() => resolveAuthorizedCongregation([], 'c-1'), /não possui congregações/)
  })
})
