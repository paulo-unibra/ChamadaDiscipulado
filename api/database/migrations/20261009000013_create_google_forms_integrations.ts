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
    if (!(await this.schema.hasTable('google_forms_integrations'))) {
      try {
        await this.schema.createTable('google_forms_integrations', (table) => {
          table.string('congregation_id', 36).primary()
          table.boolean('enabled').notNullable().defaultTo(false)
          table.string('form_id').notNullable().defaultTo('')
          table.string('apps_script_url', 2048).notNullable().defaultTo('')
          table.text('apps_script_secret').nullable()
          table.json('section_config').notNullable()
          table.text('refresh_token').nullable()
          table.string('google_email').nullable()
          table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
          table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
          table
            .foreign('congregation_id')
            .references('id')
            .inTable('congregations')
            .onDelete('CASCADE')
            .onUpdate('CASCADE')
        })
      } catch (error) {
        if (!this.isTableExistsError(error)) throw error
      }
    }
    if (!(await this.schema.hasTable('google_oauth_states'))) {
      try {
        await this.schema.createTable('google_oauth_states', (table) => {
          table.string('state', 64).primary()
          table.string('congregation_id', 36).notNullable()
          table.timestamp('expires_at', { useTz: true }).notNullable()
          table
            .foreign('congregation_id')
            .references('id')
            .inTable('congregations')
            .onDelete('CASCADE')
            .onUpdate('CASCADE')
        })
      } catch (error) {
        if (!this.isTableExistsError(error)) throw error
      }
    }
  }

  async down() {
    await this.schema.dropTableIfExists('google_oauth_states')
    await this.schema.dropTableIfExists('google_forms_integrations')
  }
}
