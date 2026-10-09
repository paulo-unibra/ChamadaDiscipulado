import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'discipleship_quizzes'

  async up() {
    if (await this.schema.hasTable(this.tableName)) return
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 36).primary()
      table.string('congregation_id', 36).notNullable().index()
      table.string('class_id', 36).notNullable().index()
      table.string('schedule_id', 36).notNullable().index()
      table.string('lesson_title', 255).notNullable()
      table.integer('question_count').unsigned().notNullable()
      table.string('status', 20).notNullable().defaultTo('pending')
      table.json('questions').nullable()
      table.text('error_message').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
