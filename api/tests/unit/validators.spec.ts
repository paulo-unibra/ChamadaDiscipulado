import { test } from '@japa/runner'
import { loginValidator, verifyLoginValidator } from '#validators/auth_validator'
import { apiKeyValidator } from '#validators/integration_validator'
import { generateQuizValidator, quizListValidator } from '#validators/quiz_validator'

test.group('Request validation', () => {
  test('accepts a valid login request', async ({ assert }) => {
    const payload = await loginValidator.validate({
      email: 'admin@example.com',
      password: 'correct horse',
    })
    assert.equal(payload.email, 'admin@example.com')
  })

  test('rejects malformed login data', async ({ assert }) => {
    await assert.rejects(() => loginValidator.validate({ email: 'invalid', password: '' }))
  })

  test('requires a six digit verification code', async ({ assert }) => {
    await assert.rejects(() =>
      verifyLoginValidator.validate({ challenge: 'challenge', code: '123' })
    )
  })

  test('limits generated quiz sizes', async ({ assert }) => {
    await assert.rejects(() =>
      generateQuizValidator.validate({ questionCount: 100, provider: 'chatgpt' })
    )
  })

  test('coerces and bounds pagination query strings', async ({ assert }) => {
    const payload = await quizListValidator.validate({ filters: { page: '2', limit: '50' } })
    assert.deepEqual(payload.filters, { page: 2, limit: 50 })
  })

  test('accepts an explicit null to remove a stored integration key', async ({ assert }) => {
    const payload = await apiKeyValidator.validate({ apiKey: null })
    assert.isNull(payload.apiKey)
  })
})
