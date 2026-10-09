import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    if (!(await this.schema.hasColumn('congregations', 'logo_data'))) {
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
