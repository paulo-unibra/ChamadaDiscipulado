import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    if (!(await this.schema.hasColumn('auth_access_tokens', 'abilities'))) return
    await this.schema.alterTable('auth_access_tokens', (table) => {
      table.text('abilities').notNullable().alter()
    })
  }

  async down() {
    if (!(await this.schema.hasColumn('auth_access_tokens', 'abilities'))) return
    await this.schema.alterTable('auth_access_tokens', (table) => {
      table.json('abilities').notNullable().alter()
    })
  }
}
