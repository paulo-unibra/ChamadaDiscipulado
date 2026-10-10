import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSchema {
  private async hasColumn(tableName: string, columnName: string) {
    return Boolean(
      await db
        .from('information_schema.COLUMNS')
        .select('COLUMN_NAME')
        .where('TABLE_SCHEMA', db.raw('DATABASE()'))
        .where('TABLE_NAME', tableName)
        .where('COLUMN_NAME', columnName)
        .first()
    )
  }

  async up() {
    if (!(await this.hasColumn('classes', 'lesson_weekday'))) {
      await this.schema.alterTable('classes', (table) =>
        table.tinyint('lesson_weekday').notNullable().defaultTo(0)
      )
    }
    if (!(await this.hasColumn('discipleship_schedule', 'justification'))) {
      await this.schema.alterTable('discipleship_schedule', (table) =>
        table.text('justification').nullable()
      )
    }
  }

  async down() {
    if (await this.hasColumn('discipleship_schedule', 'justification')) {
      await this.schema.alterTable('discipleship_schedule', (table) =>
        table.dropColumn('justification')
      )
    }
    if (await this.hasColumn('classes', 'lesson_weekday')) {
      await this.schema.alterTable('classes', (table) => table.dropColumn('lesson_weekday'))
    }
  }
}
