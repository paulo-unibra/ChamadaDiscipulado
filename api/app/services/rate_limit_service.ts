import { createHash } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'

class RateLimitService {
  async allow(key: string, maxAttempts: number, windowMs: number) {
    const now = new Date()
    const resetAt = new Date(now.getTime() + windowMs)
    const normalizedKey = createHash('sha256').update(key).digest('hex')

    await db.rawQuery(
      `INSERT INTO api_rate_limits (\`key\`, attempts, reset_at) VALUES (?, 1, ?) ON DUPLICATE KEY UPDATE attempts = IF(reset_at <= ?, 1, attempts + 1), reset_at = IF(reset_at <= ?, VALUES(reset_at), reset_at)`,
      [normalizedKey, resetAt, now, now]
    )

    const row = await db
      .from('api_rate_limits')
      .select('attempts')
      .where('key', normalizedKey)
      .first()
    return Number(row?.attempts ?? 0) <= maxAttempts
  }
}

export default new RateLimitService()
