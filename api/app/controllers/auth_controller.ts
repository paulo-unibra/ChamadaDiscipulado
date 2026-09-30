import type { HttpContext } from '@adonisjs/core/http'
import authService from '#services/auth_service'

export default class AuthController {
  async login({ request, response }: HttpContext) {
    const { email, password } = request.only(['email', 'password'])
    if (typeof email !== 'string' || typeof password !== 'string') {
      return response.badRequest({ message: 'Informe e-mail e senha.' })
    }
    try {
      const challenge = await authService.beginLogin(email, password)
      return challenge
        ? response.ok({ challenge })
        : response.unauthorized({ message: 'E-mail ou senha incorretos.' })
    } catch (error) {
      return response
        .status(503)
        .send({ message: error instanceof Error ? error.message : 'Falha ao enviar o código.' })
    }
  }

  async verify({ request, response }: HttpContext) {
    const { challenge, code } = request.only(['challenge', 'code'])
    const result = authService.finishLogin(String(challenge ?? ''), String(code ?? ''))
    return result
      ? response.ok(result)
      : response.unauthorized({ message: 'Código inválido ou expirado.' })
  }

  async changePassword({ request, response }: HttpContext) {
    const token = request.header('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    const { currentPassword, newPassword } = request.only(['currentPassword', 'newPassword'])
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return response.badRequest({ message: 'A nova senha deve ter pelo menos 8 caracteres.' })
    }
    if (!authService.changePassword(token, String(currentPassword ?? ''), newPassword)) {
      return response.unauthorized({ message: 'Senha atual inválida ou sessão expirada.' })
    }
    return response.ok({ message: 'Senha alterada. Entre novamente.' })
  }

  async logout({ request, response }: HttpContext) {
    authService.logout(request.header('authorization')?.replace(/^Bearer\s+/i, '') ?? '')
    return response.ok({ message: 'Sessão encerrada.' })
  }
}
