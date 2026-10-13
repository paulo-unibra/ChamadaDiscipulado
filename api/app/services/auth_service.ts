import { randomInt, randomUUID } from 'node:crypto'
import { Secret } from '@adonisjs/core/helpers'
import env from '#start/env'
import AdminCredential from '#models/admin_credential'

class AuthService {
  private async getCredential(email: string) {
    const { default: hash } = await import('@adonisjs/core/services/hash')
    let credential = await AdminCredential.find(email)
    const initialPassword = env.get('ADMIN_PASSWORD')
    if (!credential && initialPassword) {
      try {
        credential = await AdminCredential.create({
          email,
          passwordHash: await hash.make(initialPassword),
        })
      } catch (error) {
        if (
          typeof error !== 'object' ||
          error === null ||
          !('code' in error) ||
          error.code !== 'ER_DUP_ENTRY'
        ) {
          throw error
        }
        credential = await AdminCredential.find(email)
      }
    }
    return credential
  }

  async beginLogin(userEmail: string, candidate: string) {
    const [{ default: hash }, { default: db }] = await Promise.all([
      import('@adonisjs/core/services/hash'),
      import('@adonisjs/lucid/services/db'),
    ])
    const email = env.get('ADMIN_EMAIL', '').trim().toLowerCase()
    if (!email || userEmail.trim().toLowerCase() !== email) return null
    const credential = await this.getCredential(email)
    if (!credential || !(await hash.verify(credential.passwordHash, candidate))) return null

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const challenge = randomUUID()
    const key = env.get('RESEND_API_KEY')
    const from = env.get('RESEND_FROM_EMAIL')
    if (!key || !from) throw new Error('Envio de e-mail não configurado no servidor.')
    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${env.get('RESEND_FROM_NAME', 'Chamada Discipulado')} <${from}>`,
        to: [email],
        subject: 'Código de acesso — Chamada Discipulado',
        text: `Seu código de verificação é ${code}. Ele expira em 5 minutos.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#24352b"><h2>Confirme seu acesso</h2><p>Use este código para entrar no Chamada Discipulado:</p><p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p><p>O código expira em 5 minutos.</p></div>`,
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!result.ok) throw new Error('Não foi possível enviar o código de verificação.')

    await db.from('api_login_challenges').where('expires_at', '<', new Date()).delete()
    await db.table('api_login_challenges').insert({
      id: challenge,
      email,
      code_hash: await hash.make(code),
      expires_at: new Date(Date.now() + 5 * 60_000),
    })
    return challenge
  }

  async finishLogin(challenge: string, code: string) {
    const [{ default: hash }, { default: db }] = await Promise.all([
      import('@adonisjs/core/services/hash'),
      import('@adonisjs/lucid/services/db'),
    ])
    const item = await db.transaction(async (trx) => {
      const challengeRow = await trx
        .from('api_login_challenges')
        .where('id', challenge)
        .where('expires_at', '>', new Date())
        .forUpdate()
        .first()
      if (!challengeRow) return null
      await trx.from('api_login_challenges').where('id', challenge).delete()
      return challengeRow
    })
    if (!item || !(await hash.verify(item.code_hash, code))) return null
    const credential = await AdminCredential.find(item.email)
    if (!credential) return null

    const issuedToken = await AdminCredential.accessTokens.create(credential, ['*'], {
      name: 'Chamada Discipulado Web',
    })
    const token = issuedToken.value?.release()
    return token ? { token, email: credential.email } : null
  }

  async verifyToken(token: string) {
    if (!token) return null
    return AdminCredential.accessTokens.verify(new Secret(token))
  }

  async changePassword(credential: AdminCredential, current: string, next: string) {
    const { default: hash } = await import('@adonisjs/core/services/hash')
    if (!(await hash.verify(credential.passwordHash, current))) return false
    credential.passwordHash = await hash.make(next)
    await credential.save()
    await AdminCredential.accessTokens.deleteAll(credential)
    return true
  }
}

export default new AuthService()
