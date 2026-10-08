import { BaseSchema } from '@adonisjs/lucid/schema'

export const DEFAULT_CONGREGATION_ID = 'cong-zumbi-pacheco-1'

export default class extends BaseSchema {
  private async hasIndex(tableName: string, indexName: string) {
    const result: any = await this.schema.raw(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tableName}' AND INDEX_NAME = '${indexName}' LIMIT 1`
    )
    const rows = Array.isArray(result) ? result[0] : result
    return Array.isArray(rows) && rows.length > 0
  }

  private async hasForeignKey(tableName: string, constraintName: string) {
    const result: any = await this.schema.raw(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tableName}' AND CONSTRAINT_NAME = '${constraintName}' AND CONSTRAINT_TYPE = 'FOREIGN KEY' LIMIT 1`
    )
    const rows = Array.isArray(result) ? result[0] : result
    return Array.isArray(rows) && rows.length > 0
  }

  async up() {
    if (!(await this.schema.hasTable('congregations'))) {
      await this.schema.createTable('congregations', (table) => {
        table.string('id', 36).primary()
        table.string('name').notNullable()
        table.string('area').notNullable().defaultTo('')
        table.string('sector').notNullable().defaultTo('')
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
        table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
      })
    }

    await this.schema.raw(
      `INSERT IGNORE INTO congregations (id, name, area, sector, created_at, updated_at) VALUES ('${DEFAULT_CONGREGATION_ID}', 'Zumbi do Pacheco 1', '10', '10', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )

    for (const tableName of ['classes', 'students', 'teachers']) {
      if (!(await this.schema.hasColumn(tableName, 'congregation_id'))) {
        await this.schema.alterTable(tableName, (table) => {
          table.string('congregation_id', 36).nullable()
        })
      }

      const indexName = `${tableName}_congregation_id_index`
      if (!(await this.hasIndex(tableName, indexName))) {
        await this.schema.raw(
          `ALTER TABLE \`${tableName}\` ADD INDEX \`${indexName}\` (\`congregation_id\`)`
        )
      }

      await this.schema.raw(
        `UPDATE \`${tableName}\` SET congregation_id = '${DEFAULT_CONGREGATION_ID}' WHERE congregation_id IS NULL`
      )
      await this.schema.alterTable(tableName, (table) => {
        table.string('congregation_id', 36).notNullable().alter()
      })

      const foreignKeyName = `${tableName}_congregation_id_foreign`
      if (!(await this.hasForeignKey(tableName, foreignKeyName))) {
        await this.schema.raw(
          `ALTER TABLE \`${tableName}\` ADD CONSTRAINT \`${foreignKeyName}\` FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE`
        )
      }
    }
  }

  async down() {
    for (const tableName of ['classes', 'students', 'teachers']) {
      if (await this.schema.hasColumn(tableName, 'congregation_id')) {
        if (await this.hasForeignKey(tableName, `${tableName}_congregation_id_foreign`)) {
          await this.schema.raw(
            `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${tableName}_congregation_id_foreign\``
          )
        }
        const indexName = `${tableName}_congregation_id_index`
        if (await this.hasIndex(tableName, indexName)) {
          await this.schema.raw(`ALTER TABLE \`${tableName}\` DROP INDEX \`${indexName}\``)
        }
        await this.schema.alterTable(tableName, (table) => table.dropColumn('congregation_id'))
      }
    }

    if (await this.schema.hasTable('congregations')) await this.schema.dropTable('congregations')
  }
}
