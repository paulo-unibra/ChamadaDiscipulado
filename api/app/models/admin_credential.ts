import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { DateTime } from 'luxon'

export default class AdminCredential extends BaseModel {
  static table = 'admin_credentials'

  @column({ isPrimary: true })
  declare email: string

  @column({ serializeAs: null })
  declare passwordHash: string

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static accessTokens = DbAccessTokensProvider.forModel(AdminCredential, {
    table: 'auth_access_tokens',
    expiresIn: '14 days',
  })
}
