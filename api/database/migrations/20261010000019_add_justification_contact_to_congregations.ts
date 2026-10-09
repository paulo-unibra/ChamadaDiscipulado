import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSchema {
  private async hasContactColumn() {
    return Boolean(await db.from('information_schema.COLUMNS')
      .select('COLUMN_NAME')
      .where('TABLE_SCHEMA', db.raw('DATABASE()'))
      .where('TABLE_NAME', 'congregations')
      .where('COLUMN_NAME', 'justification_contact')
      .first())
  }

  async up() {
    if (!(await this.hasContactColumn())) {
      await this.schema.alterTable('congregations', (table) => table.string('justification_contact', 20).nullable())
    }
  }

  async down() {
    if (await this.hasContactColumn()) {
      await this.schema.alterTable('congregations', (table) => table.dropColumn('justification_contact'))
    }
  }
}
