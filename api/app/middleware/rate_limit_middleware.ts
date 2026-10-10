import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import rateLimitService from '#services/rate_limit_service'

export default class RateLimitMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    const identity = `${request.ip()}:${request.url().split('?')[0]}`
    const allowed = await rateLimitService.allow(identity, 8, 60_000)
    if (!allowed) {
      response.header('Retry-After', '60')
      return response
        .status(429)
        .send({ message: 'Muitas tentativas. Tente novamente em um minuto.' })
    }
    return next()
  }
}
