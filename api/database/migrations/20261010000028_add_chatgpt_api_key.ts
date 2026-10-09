import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSchema {
  async up() {
    try {
      await db.rawQuery('ALTER TABLE `google_forms_integrations` ADD COLUMN `chatgpt_api_key` TEXT NULL')
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
    await db.rawQuery('ALTER TABLE `google_forms_integrations` DROP COLUMN `chatgpt_api_key`')
  }
}
