import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  private isDuplicateColumnError(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_FIELDNAME'
  }

  async up() {
    if (!(await this.schema.hasColumn('congregations', 'logo_data'))) {
      try {
        await this.schema.alterTable('congregations', (table) => {
          table.text('logo_data', 'mediumtext').nullable()
        })
      } catch (error) {
        if (!this.isDuplicateColumnError(error)) throw error
      }
    }
  }

  async down() {
    if (await this.schema.hasColumn('congregations', 'logo_data')) {
      await this.schema.alterTable('congregations', (table) => table.dropColumn('logo_data'))
    }
  }
}
