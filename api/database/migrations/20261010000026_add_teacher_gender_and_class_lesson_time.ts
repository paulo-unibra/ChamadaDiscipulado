import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSchema {
  private isDuplicateColumnError(error: unknown) {
    return typeof error === 'object' && error !== null && (
      ('code' in error && error.code === 'ER_DUP_FIELDNAME') ||
      ('errno' in error && error.errno === 1060) ||
      ('message' in error && typeof error.message === 'string' && /duplicate column name/i.test(error.message))
    )
  }

  private async addColumn(table: string, column: string, definition: string) {
    try {
      await db.rawQuery(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`)
    } catch (error) {
      if (!this.isDuplicateColumnError(error)) throw error
    }
  }

  async up() {
    await this.addColumn('teachers', 'gender', "VARCHAR(10) NOT NULL DEFAULT 'male'")
    await this.addColumn('classes', 'lesson_time', "VARCHAR(5) NOT NULL DEFAULT '09:00'")
    await this.addColumn('discipleship_schedule', 'lesson_time', 'VARCHAR(5) NULL')
  }

  async down() {
    await db.rawQuery('ALTER TABLE `discipleship_schedule` DROP COLUMN `lesson_time`')
    await db.rawQuery('ALTER TABLE `classes` DROP COLUMN `lesson_time`')
    await db.rawQuery('ALTER TABLE `teachers` DROP COLUMN `gender`')
  }
}
