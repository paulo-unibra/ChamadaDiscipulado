import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'class_students'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 36).primary()
      table.string('class_id', 36).notNullable()
      table.string('student_id', 36).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      table
        .foreign('class_id')
        .references('id')
        .inTable('classes')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      table
        .foreign('student_id')
        .references('id')
        .inTable('students')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.unique(['class_id', 'student_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
