import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'api_rate_limits'

  async up() {
    await this.schema.createTable(this.tableName, (table) => {
      table.string('key', 191).primary()
      table.integer('attempts').unsigned().notNullable().defaultTo(0)
      table.timestamp('reset_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    await this.schema.dropTableIfExists(this.tableName)
  }
}
