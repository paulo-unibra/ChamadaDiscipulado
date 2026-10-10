import { BaseSchema } from '@adonisjs/lucid/schema'

type UniqueConfig = {
  tableName: string
  columns: string[]
  indexName: string
  compositeIndexName: string
  legacyCompositeIndexName?: string
  foreignKeys: Array<{
    column: string
    refTable: string
    refColumn: string
  }>
}

const UNIQUE_CONFIGS: UniqueConfig[] = [
  {
    tableName: 'class_students',
    columns: ['class_id', 'student_id'],
    indexName: 'class_students_class_id_student_id_unique',
    compositeIndexName: 'clsstd_class_student_deleted_unique',
    legacyCompositeIndexName: 'class_students_class_id_student_id_deleted_at_unique',
    foreignKeys: [
      { column: 'class_id', refTable: 'classes', refColumn: 'id' },
      { column: 'student_id', refTable: 'students', refColumn: 'id' },
    ],
  },
  {
    tableName: 'attendance_entries',
    columns: ['attendance_record_id', 'student_id'],
    indexName: 'attendance_entries_attendance_record_id_student_id_unique',
    compositeIndexName: 'attent_record_student_deleted_unique',
    legacyCompositeIndexName:
      'attendance_entries_attendance_record_id_student_id_deleted_at_unique',
    foreignKeys: [
      { column: 'attendance_record_id', refTable: 'attendance_records', refColumn: 'id' },
      { column: 'student_id', refTable: 'students', refColumn: 'id' },
    ],
  },
  {
    tableName: 'attendance_teachers',
    columns: ['attendance_record_id', 'teacher_id'],
    indexName: 'attendance_teachers_attendance_record_id_teacher_id_unique',
    compositeIndexName: 'atttea_record_teacher_deleted_unique',
    legacyCompositeIndexName:
      'attendance_teachers_attendance_record_id_teacher_id_deleted_at_unique',
    foreignKeys: [
      { column: 'attendance_record_id', refTable: 'attendance_records', refColumn: 'id' },
      { column: 'teacher_id', refTable: 'teachers', refColumn: 'id' },
    ],
  },
]

export default class extends BaseSchema {
  protected tableNames = [
    'classes',
    'students',
    'teachers',
    'class_students',
    'attendance_records',
    'attendance_teachers',
    'attendance_entries',
  ]

  private async hasIndex(tableName: string, indexName: string) {
    const result: any = await this.schema.raw(
      `SELECT INDEX_NAME
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tableName}' AND INDEX_NAME = '${indexName}'
       LIMIT 1`
    )
    const rows = Array.isArray(result) ? result[0] : result
    return Array.isArray(rows) && rows.length > 0
  }

  private async dropForeignKeys(tableName: string) {
    const result: any = await this.schema.raw(
      `SELECT CONSTRAINT_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tableName}' AND REFERENCED_TABLE_NAME IS NOT NULL`
    )
    const rows = Array.isArray(result) ? result[0] : result
    for (const row of rows ?? []) {
      await this.schema.raw(
        `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``
      )
    }
  }

  private async recreateForeignKeys(config: UniqueConfig) {
    for (const foreignKey of config.foreignKeys) {
      await this.schema.raw(
        `ALTER TABLE \`${config.tableName}\` ADD CONSTRAINT \`${config.tableName}_${foreignKey.column}_foreign\`
         FOREIGN KEY (\`${foreignKey.column}\`)
         REFERENCES \`${foreignKey.refTable}\`(\`${foreignKey.refColumn}\`)
         ON DELETE CASCADE ON UPDATE CASCADE`
      )
    }
  }

  async up() {
    for (const tableName of this.tableNames) {
      const hasColumn = await this.schema.hasColumn(tableName, 'deleted_at')
      if (!hasColumn) {
        this.schema.alterTable(tableName, (table) => {
          table.timestamp('deleted_at', { useTz: true }).nullable()
          table.index(['deleted_at'])
        })
      }
    }

    for (const config of UNIQUE_CONFIGS) {
      const hasOldIndex = await this.hasIndex(config.tableName, config.indexName)
      const hasCompositeIndex = await this.hasIndex(config.tableName, config.compositeIndexName)
      const hasLegacyIndex = config.legacyCompositeIndexName
        ? await this.hasIndex(config.tableName, config.legacyCompositeIndexName)
        : false

      const indexToDrop = hasLegacyIndex
        ? config.legacyCompositeIndexName
        : hasOldIndex
          ? config.indexName
          : null

      if (!hasCompositeIndex && indexToDrop) {
        await this.dropForeignKeys(config.tableName)

        if (await this.hasIndex(config.tableName, indexToDrop)) {
          await this.schema.raw(`ALTER TABLE \`${config.tableName}\` DROP INDEX \`${indexToDrop}\``)
        }

        if (!(await this.hasIndex(config.tableName, config.compositeIndexName))) {
          await this.schema.raw(
            `ALTER TABLE \`${config.tableName}\` ADD UNIQUE INDEX \`${config.compositeIndexName}\` (${[
              ...config.columns,
              'deleted_at',
            ]
              .map((column) => `\`${column}\``)
              .join(', ')})`
          )
        }

        await this.recreateForeignKeys(config)
      } else if (!hasCompositeIndex) {
        await this.schema.raw(
          `ALTER TABLE \`${config.tableName}\` ADD UNIQUE INDEX \`${config.compositeIndexName}\` (${[
            ...config.columns,
            'deleted_at',
          ]
            .map((column) => `\`${column}\``)
            .join(', ')})`
        )
      }
    }
  }

  async down() {
    for (const config of UNIQUE_CONFIGS) {
      const hasCompositeIndex = await this.hasIndex(config.tableName, config.compositeIndexName)
      const hasLegacyIndex = config.legacyCompositeIndexName
        ? await this.hasIndex(config.tableName, config.legacyCompositeIndexName)
        : false
      const hasOldIndex = await this.hasIndex(config.tableName, config.indexName)

      const existingComposite = hasCompositeIndex
        ? config.compositeIndexName
        : hasLegacyIndex
          ? config.legacyCompositeIndexName
          : null

      if (existingComposite) {
        await this.dropForeignKeys(config.tableName)

        if (await this.hasIndex(config.tableName, existingComposite)) {
          await this.schema.raw(
            `ALTER TABLE \`${config.tableName}\` DROP INDEX \`${existingComposite}\``
          )
        }
      }

      if (!hasOldIndex) {
        await this.schema.raw(
          `ALTER TABLE \`${config.tableName}\` ADD UNIQUE INDEX \`${config.indexName}\` (${config.columns
            .map((column) => `\`${column}\``)
            .join(', ')})`
        )
      }

      if (existingComposite) {
        await this.recreateForeignKeys(config)
      }
    }

    for (const tableName of this.tableNames) {
      const hasColumn = await this.schema.hasColumn(tableName, 'deleted_at')
      if (hasColumn) {
        this.schema.alterTable(tableName, (table) => {
          table.dropIndex(['deleted_at'])
          table.dropColumn('deleted_at')
        })
      }
    }
  }
}
