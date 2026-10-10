import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'auth_access_tokens'

  private isTableExistsError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ER_TABLE_EXISTS_ERROR'
    )
  }

  async up() {
    if (await this.schema.hasTable(this.tableName)) return
    try {
      await this.schema.createTable(this.tableName, (table) => {
        table.increments('id').notNullable()
        table.string('tokenable_id', 254).notNullable()
        table.string('type').notNullable()
        table.string('name').nullable()
        table.string('hash', 64).notNullable()
        table.json('abilities').notNullable()
        table.timestamp('created_at', { useTz: true }).notNullable()
        table.timestamp('updated_at', { useTz: true }).notNullable()
        table.timestamp('last_used_at', { useTz: true }).nullable()
        table.timestamp('expires_at', { useTz: true }).nullable()
        table.index(['tokenable_id', 'type'])
        table
          .foreign('tokenable_id')
          .references('email')
          .inTable('admin_credentials')
          .onDelete('CASCADE')
      })
    } catch (error) {
      if (!this.isTableExistsError(error)) throw error
    }
  }

  async down() {
    await this.schema.dropTableIfExists(this.tableName)
  }
}
