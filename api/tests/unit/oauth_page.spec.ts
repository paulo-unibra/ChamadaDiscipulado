import { test } from '@japa/runner'
import type { HttpContext } from '@adonisjs/core/http'
import { htmlPage } from '#controllers/mcp_oauth_controller'

test('OAuth forms allow the ChatGPT callback while retaining the security policy', ({ assert }) => {
  const headers: Record<string, string> = {}
  let body = ''
  const response = {
    header(name: string, value: string) {
      headers[name] = value
      return this
    },
    status() {
      return this
    },
    type() {
      return this
    },
    send(value: string) {
      body = value
      return this
    },
  }
  htmlPage(response as unknown as HttpContext['response'], {
    title: 'Autorizar ChatGPT',
    content:
      '<form action="/oauth/authorize" method="post"><button name="decision" value="approve">Autorizar</button></form>',
    status: 200,
  })
  assert.include(headers['Content-Security-Policy'], "form-action 'self' https://chatgpt.com;")
  assert.notInclude(headers['Content-Security-Policy'], 'form-action *')
  assert.include(headers['Content-Security-Policy'], "frame-ancestors 'none'")
  assert.include(body, 'securitypolicyviolation')
  assert.notInclude(body, 'button.disabled=true')
  assert.notInclude(body, 'form.append(hidden)')
})
