import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import authService from '#services/auth_service'

export default class RequireAuthMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    const token = request.header('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    if (!authService.isAuthenticated(token)) {
      response.status(401)
      return response.send({ message: 'Autenticação necessária.' })
    }
    return next()
  }
}
