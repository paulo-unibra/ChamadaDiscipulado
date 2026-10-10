import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSchema {
  async up() {
    try {
      await db.rawQuery(
        "ALTER TABLE `discipleship_quizzes` ADD COLUMN `provider` VARCHAR(16) NOT NULL DEFAULT 'chatgpt'"
      )
    } catch (error) {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('code' in error) ||
        error.code !== 'ER_DUP_FIELDNAME'
      ) {
        throw error
      }
    }
  }

  async down() {
    await db.rawQuery('ALTER TABLE `discipleship_quizzes` DROP COLUMN `provider`')
  }
}
