import { BaseSchema } from '@adonisjs/lucid/schema'

export const DEFAULT_CONGREGATION_ID = 'cong-zumbi-pacheco-1'

export default class extends BaseSchema {
  async up() {
    await this.schema.createTable('congregations', (table) => {
      table.string('id', 36).primary()
      table.string('name').notNullable()
      table.string('area').notNullable().defaultTo('')
      table.string('sector').notNullable().defaultTo('')
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    await this.schema.raw(
      `INSERT INTO congregations (id, name, area, sector, created_at, updated_at) VALUES ('${DEFAULT_CONGREGATION_ID}', 'Zumbi do Pacheco 1', '10', '10', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )

    for (const tableName of ['classes', 'students', 'teachers']) {
      await this.schema.alterTable(tableName, (table) => {
        table.string('congregation_id', 36).nullable().index()
      })
      await this.schema.raw(
        `UPDATE \`${tableName}\` SET congregation_id = '${DEFAULT_CONGREGATION_ID}' WHERE congregation_id IS NULL`
      )
      await this.schema.alterTable(tableName, (table) => {
        table.string('congregation_id', 36).notNullable().alter()
        table
          .foreign('congregation_id', `${tableName}_congregation_id_foreign`)
          .references('id')
          .inTable('congregations')
          .onDelete('RESTRICT')
          .onUpdate('CASCADE')
      })
    }
  }

  async down() {
    for (const tableName of ['classes', 'students', 'teachers']) {
      await this.schema.alterTable(tableName, (table) => {
        table.dropForeign('congregation_id', `${tableName}_congregation_id_foreign`)
        table.dropIndex(['congregation_id'])
        table.dropColumn('congregation_id')
      })
    }

    await this.schema.dropTable('congregations')
  }
}
