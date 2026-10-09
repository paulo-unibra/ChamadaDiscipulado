import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  private async hasLogoColumn() {
    const result: any = await this.schema.raw(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'congregations' AND COLUMN_NAME = 'logo_data' LIMIT 1`)
    const rows = Array.isArray(result) ? result[0] : result
    return Array.isArray(rows) && rows.length > 0
  }

  async up() {
    if (!(await this.hasLogoColumn())) {
      await this.schema.alterTable('congregations', (table) => {
        table.text('logo_data', 'mediumtext').nullable()
      })
    }
  }

  async down() {
    if (await this.schema.hasColumn('congregations', 'logo_data')) {
      await this.schema.alterTable('congregations', (table) => table.dropColumn('logo_data'))
    }
  }
}
