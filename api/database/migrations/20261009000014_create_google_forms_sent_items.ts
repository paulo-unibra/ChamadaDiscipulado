import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    if (await this.schema.hasTable('google_forms_sent_items')) return
    try {
      await this.schema.createTable('google_forms_sent_items', (table) => {
        table.string('congregation_id', 36).notNullable()
        table.string('form_id', 255).notNullable()
        table.string('section_id', 40).notNullable()
        table.string('record_id', 36).notNullable()
        table.timestamp('sent_at', { useTz: true }).notNullable().defaultTo(this.now())
        table.primary(['congregation_id', 'form_id', 'section_id', 'record_id'])
        table.foreign('congregation_id').references('id').inTable('congregations').onDelete('CASCADE').onUpdate('CASCADE')
        table.index(['congregation_id', 'sent_at'])
      })
    } catch (error) {
      if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'ER_TABLE_EXISTS_ERROR') throw error
    }
  }

  async down() {
    await this.schema.dropTableIfExists('google_forms_sent_items')
  }
}
