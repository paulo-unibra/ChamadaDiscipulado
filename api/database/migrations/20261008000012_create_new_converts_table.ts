import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'new_converts'

  async up() {
    if (await this.schema.hasTable(this.tableName)) return

    await this.schema.createTable(this.tableName, (table) => {
      table.string('id', 36).primary()
      table.string('congregation_id', 36).notNullable()
      table.string('event_name').notNullable()
      table.string('name').notNullable()
      table.date('conversion_date').notNullable()
      table.string('cep', 9).nullable()
      table.string('street').nullable()
      table.string('number').nullable()
      table.string('complement').nullable()
      table.string('neighborhood').nullable()
      table.string('city').nullable()
      table.string('state', 2).nullable()
      table.date('birth_date').nullable()
      table.string('contact_phone').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('deleted_at', { useTz: true }).nullable()
      table
        .foreign('congregation_id')
        .references('id')
        .inTable('congregations')
        .onDelete('RESTRICT')
        .onUpdate('CASCADE')
      table.index(['congregation_id', 'deleted_at'])
      table.index(['conversion_date'])
    })
  }

  async down() {
    await this.schema.dropTable(this.tableName)
  }
}
