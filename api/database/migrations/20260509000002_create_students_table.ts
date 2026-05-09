import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'students'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 36).primary()
      table.string('name').notNullable()
      table.date('birth_date').nullable()
      table.string('student_phone').nullable()
      table.string('email').nullable()
      table.string('guardian_name').nullable()
      table.string('guardian_phone').nullable()
      table.text('address').nullable()
      table.text('notes').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
