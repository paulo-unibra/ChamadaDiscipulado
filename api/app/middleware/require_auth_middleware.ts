import type { HttpContext } from '@adonisjs/core/http'
import authService from '#services/auth_service'

export default class RequireAuthMiddleware {
  async handle({ request, response }: HttpContext, next: () => Promise<void>) {
    const token = request.header('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    if (!authService.isAuthenticated(token)) {
      return response.unauthorized({ message: 'Autenticação necessária.' })
    }
    await next()
  }
}
