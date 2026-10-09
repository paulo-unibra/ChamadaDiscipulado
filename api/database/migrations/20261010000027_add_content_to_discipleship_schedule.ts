import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSchema {
  private isDuplicateColumnError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      (('code' in error && error.code === 'ER_DUP_FIELDNAME') ||
        ('errno' in error && error.errno === 1060) ||
        ('message' in error &&
          typeof error.message === 'string' &&
          /duplicate column name/i.test(error.message)))
    )
  }

  async up() {
    try {
      await db.rawQuery('ALTER TABLE `discipleship_schedule` ADD COLUMN `content` TEXT NULL')
    } catch (error) {
      if (!this.isDuplicateColumnError(error)) throw error
    }
  }

  async down() {
    await db.rawQuery('ALTER TABLE `discipleship_schedule` DROP COLUMN `content`')
  }
}
