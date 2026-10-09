import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'discipleship_schedule'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 36).primary()
      table.string('congregation_id', 36).notNullable().index()
      table.string('class_id', 36).notNullable().index()
      table.date('lesson_date').notNullable()
      table.string('title', 255).notNullable()
      table.string('teacher_id', 36).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.unique(['class_id', 'lesson_date'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
