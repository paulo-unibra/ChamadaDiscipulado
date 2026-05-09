import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'attendance_entries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 36).primary()
      table.string('attendance_record_id', 36).notNullable()
      table.string('student_id', 36).notNullable()
      table
        .enum('status', ['present', 'absent', 'justified', 'late'], {
          useNative: true,
          enumName: 'attendance_status',
          existingType: false,
        })
        .notNullable()
      table.text('note').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table
        .foreign('attendance_record_id')
        .references('id')
        .inTable('attendance_records')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      table
        .foreign('student_id')
        .references('id')
        .inTable('students')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.unique(['attendance_record_id', 'student_id'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
