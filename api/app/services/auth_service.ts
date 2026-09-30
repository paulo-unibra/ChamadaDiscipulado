import { randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import env from '#start/env'

type PendingCode = { code: string; expires: number }
const pending = new Map<string, PendingCode>()
const sessions = new Map<string, string>()
let password = env.get('ADMIN_PASSWORD', '123456')
const email = env.get('ADMIN_EMAIL', 'pr838908@gmail.com').toLowerCase()

class AuthService {
  async beginLogin(userEmail: string, candidate: string) {
    if (userEmail.trim().toLowerCase() !== email || candidate !== password) return null
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const challenge = randomUUID()
    pending.set(challenge, { code, expires: Date.now() + 5 * 60_000 })
    const key = env.get('RESEND_API_KEY')
    const from = env.get('RESEND_FROM_EMAIL')
    if (!key || !from) {
      pending.delete(challenge)
      throw new Error(
        'Envio de e-mail não configurado no servidor (RESEND_API_KEY/RESEND_FROM_EMAIL).'
      )
    }
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
    })
    if (!result.ok) {
      pending.delete(challenge)
      throw new Error('Não foi possível enviar o código de verificação.')
    }
    return challenge
  }

  finishLogin(challenge: string, code: string) {
    const item = pending.get(challenge)
    pending.delete(challenge)
    if (!item || item.expires < Date.now()) return null
    const expected = Buffer.from(item.code)
    const provided = Buffer.from(code)
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null
    const token = randomUUID() + randomUUID()
    sessions.set(token, email)
    return { token, email }
  }

  isAuthenticated(token: string) {
    return sessions.has(token)
  }

  getSessionEmail(token: string) {
    return sessions.get(token) ?? null
  }

  logout(token: string) {
    sessions.delete(token)
  }
  changePassword(token: string, current: string, next: string) {
    if (!sessions.has(token) || current !== password || next.length < 8) return false
    password = next
    sessions.clear()
    return true
  }
}

export default new AuthService()
