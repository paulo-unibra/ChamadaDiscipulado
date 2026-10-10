import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSchema {
  private async hasContactColumn() {
    const result: any = await db.rawQuery(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'congregations' AND COLUMN_NAME = 'justification_contact' LIMIT 1`
    )
    const rows = Array.isArray(result?.[0])
      ? result[0]
      : Array.isArray(result?.rows)
        ? result.rows
        : Array.isArray(result)
          ? result
          : []
    return rows.length > 0
  }

  async up() {
    if (!(await this.hasContactColumn())) {
      await this.schema.alterTable('congregations', (table) =>
        table.string('justification_contact', 20).nullable()
      )
    }
  }

  async down() {
    if (await this.hasContactColumn()) {
      await this.schema.alterTable('congregations', (table) =>
        table.dropColumn('justification_contact')
      )
    }
  }
}
