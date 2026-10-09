import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  private isDuplicateColumnError(error: unknown) {
    return typeof error === 'object' && error !== null && (
      ('code' in error && error.code === 'ER_DUP_FIELDNAME') ||
      ('errno' in error && error.errno === 1060) ||
      ('message' in error && typeof error.message === 'string' && /duplicate column name/i.test(error.message))
    )
  }

  private async addColumn(tableName: string, columnName: string, definition: string) {
    try {
      await this.schema.raw(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`)
    } catch (error) {
      if (!this.isDuplicateColumnError(error)) throw error
    }
  }

  async up() {
    await this.addColumn('classes', 'lesson_weekday', 'TINYINT NOT NULL DEFAULT 0')
    await this.addColumn('discipleship_schedule', 'justification', 'TEXT NULL')
  }

  async down() {
    await this.schema.raw('ALTER TABLE `discipleship_schedule` DROP COLUMN `justification`')
    await this.schema.raw('ALTER TABLE `classes` DROP COLUMN `lesson_weekday`')
  }
}
