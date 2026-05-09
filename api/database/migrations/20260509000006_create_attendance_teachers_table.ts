import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'attendance_teachers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 36).primary()
      table.string('attendance_record_id', 36).notNullable()
      table.string('teacher_id', 36).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      table
        .foreign('attendance_record_id')
        .references('id')
        .inTable('attendance_records')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      table
        .foreign('teacher_id')
        .references('id')
        .inTable('teachers')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.unique(['attendance_record_id', 'teacher_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
