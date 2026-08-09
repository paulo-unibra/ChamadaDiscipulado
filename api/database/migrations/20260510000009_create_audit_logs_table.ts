import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audit_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 36).primary()
      table.string('action', 60).notNullable()
      table.string('entity_type', 30).notNullable()
      table.string('entity_id', 36).nullable()
      table.json('details').nullable()
      table.string('ip', 45).nullable()
      table.string('user_agent', 255).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.index(['action'])
      table.index(['entity_id'])
      table.index(['created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}