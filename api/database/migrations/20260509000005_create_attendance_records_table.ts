import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'attendance_records'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 36).primary()
      table.string('class_id', 36).notNullable()
      table.date('date').notNullable()
      table.text('notes').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table
        .foreign('class_id')
        .references('id')
        .inTable('classes')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.index(['class_id'])
      table.index(['date'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
