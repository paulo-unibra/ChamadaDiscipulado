import { test } from '@japa/runner'

test.group('Protected API routes', () => {
  test('rejects unauthenticated access', async ({ client }) => {
    const response = await client.get('/school/state')
    response.assertStatus(401)
  })
})
