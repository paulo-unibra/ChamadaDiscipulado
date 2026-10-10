import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  private isTableExistsError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ER_TABLE_EXISTS_ERROR'
    )
  }

  async up() {
    if (!(await this.schema.hasTable('admin_credentials'))) {
      try {
        await this.schema.createTable('admin_credentials', (table) => {
          table.string('email', 254).primary()
          table.string('password_hash', 255).notNullable()
          table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
        })
      } catch (error) {
        if (!this.isTableExistsError(error) || !(await this.schema.hasTable('admin_credentials'))) {
          throw error
        }
      }
    }
    if (!(await this.schema.hasTable('api_login_challenges'))) {
      try {
        await this.schema.createTable('api_login_challenges', (table) => {
          table.string('id', 36).primary()
          table.string('email', 254).notNullable()
          table.string('code_hash', 255).notNullable()
          table.timestamp('expires_at', { useTz: true }).notNullable().index()
          table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
        })
      } catch (error) {
        if (
          !this.isTableExistsError(error) ||
          !(await this.schema.hasTable('api_login_challenges'))
        ) {
          throw error
        }
      }
    }
  }

  async down() {
    await this.schema.dropTableIfExists('api_login_challenges')
    await this.schema.dropTableIfExists('admin_credentials')
  }
}
