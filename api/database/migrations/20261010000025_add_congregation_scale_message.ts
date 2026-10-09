import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSchema {
  private async hasTemplateColumn() {
    const result: any = await db.rawQuery(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'congregations' AND COLUMN_NAME = 'scale_message_template' LIMIT 1`
    )
    const rows = Array.isArray(result?.[0]) ? result[0] : Array.isArray(result?.rows) ? result.rows : Array.isArray(result) ? result : []
    return rows.length > 0
  }

  async up() {
    if (!(await this.hasTemplateColumn())) {
      await this.schema.alterTable('congregations', (table) => table.text('scale_message_template').nullable())
    }
  }

  async down() {
    if (await this.hasTemplateColumn()) {
      await this.schema.alterTable('congregations', (table) => table.dropColumn('scale_message_template'))
    }
  }
}
