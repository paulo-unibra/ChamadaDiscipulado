import type { HttpContext } from '@adonisjs/core/http'
import authService from '#services/auth_service'
import {
  changePasswordValidator,
  loginValidator,
  verifyLoginValidator,
} from '#validators/auth_validator'

export default class AuthController {
  async session({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    return response.ok({ email: user.email })
  }

  async login({ request, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
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
    const { challenge, code } = await request.validateUsing(verifyLoginValidator)
    const result = await authService.finishLogin(challenge, code)
    return result
      ? response.ok(result)
      : response.unauthorized({ message: 'Código inválido ou expirado.' })
  }

  async changePassword({ request, response, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const { currentPassword, newPassword } = await request.validateUsing(changePasswordValidator)
    if (!(await authService.changePassword(user, currentPassword, newPassword))) {
      return response.unauthorized({ message: 'Senha atual inválida ou sessão expirada.' })
    }
    return response.ok({ message: 'Senha alterada. Entre novamente.' })
  }

  async logout({ auth, response }: HttpContext) {
    await auth.use('api').invalidateToken()
    return response.ok({ message: 'Sessão encerrada.' })
  }
}
