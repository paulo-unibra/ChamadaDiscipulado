import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  private async hasColumn(tableName: string, columnName: string) {
    const result: any = await this.schema.raw(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tableName}' AND COLUMN_NAME = '${columnName}' LIMIT 1`
    )
    const rows = Array.isArray(result) ? result[0] : result
    return Array.isArray(rows) && rows.length > 0
  }

  async up() {
    if (!(await this.hasColumn('classes', 'lesson_weekday'))) {
      await this.schema.alterTable('classes', (table) => table.tinyint('lesson_weekday').notNullable().defaultTo(0))
    }
    if (!(await this.hasColumn('discipleship_schedule', 'justification'))) {
      await this.schema.alterTable('discipleship_schedule', (table) => table.text('justification').nullable())
    }
  }

  async down() {
    if (await this.hasColumn('discipleship_schedule', 'justification')) {
      await this.schema.alterTable('discipleship_schedule', (table) => table.dropColumn('justification'))
    }
    if (await this.hasColumn('classes', 'lesson_weekday')) {
      await this.schema.alterTable('classes', (table) => table.dropColumn('lesson_weekday'))
    }
  }
}
