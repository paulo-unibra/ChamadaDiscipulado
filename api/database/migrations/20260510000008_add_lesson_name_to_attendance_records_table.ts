import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'attendance_records'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('lesson_name').nullable().after('class_id')
      table.index(['lesson_name'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['lesson_name'])
      table.dropColumn('lesson_name')
    })
  }
}
