import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

const cycles = [
  { id: 'cycle-basic', name: 'Ciclo Básico', color: '#B8D4AE', position: 1 },
  { id: 'cycle-intermediate', name: 'Ciclo Intermediário', color: '#306D29', position: 2 },
  { id: 'cycle-advanced', name: 'Ciclo Avançado', color: '#0D530E', position: 3 },
]

const lessons = [
  ['INTRODUÇÃO AO DISCIPULADO', 'cycle-basic'],
  ['HISTÓRIA DAS ASSEMBLEIAS DE DEUS', 'cycle-basic'],
  ['TENDO UMA NOVA CONDUTA', 'cycle-basic'],
  ['SUPERANDO CONFLITOS E DÚVIDAS', 'cycle-basic'],
  ['INTRODUÇÃO À BÍBLIA', 'cycle-basic'],
  ['CONHECENDO JESUS', 'cycle-intermediate'],
  ['O PLANO DE DEUS PARA A HUMANIDADE', 'cycle-intermediate'],
  ['O QUE É SALVAÇÃO?', 'cycle-intermediate'],
  ['O QUE É PECADO?', 'cycle-intermediate'],
  ['SANTIFICAÇÃO', 'cycle-intermediate'],
  ['OBEDIÊNCIA', 'cycle-intermediate'],
  ['ORAÇÃO', 'cycle-intermediate'],
  ['O FRUTO DO ESPÍRITO', 'cycle-intermediate'],
  ['MORDOMIA CRISTÃ', 'cycle-intermediate'],
  ['A IGREJA', 'cycle-advanced'],
  ['DOUTRINAS, COSTUMES, E NORMAS DA IGREJA', 'cycle-advanced'],
  ['O BATISMO COM ESPÍRITO SANTO', 'cycle-advanced'],
  ['TRINDADE DIVINA', 'cycle-advanced'],
  ['HERESIAS', 'cycle-advanced'],
  ['FINAL DOS TEMPOS', 'cycle-advanced'],
  ['ORDENANÇAS BÍBLICAS', 'cycle-advanced'],
  ['EVANGELISMO', 'cycle-advanced'],
] as const

export default class extends BaseSchema {
  private async hasTable(tableName: string) {
    const result: any = await db.rawQuery(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tableName}' LIMIT 1`
    )
    const rows = Array.isArray(result?.[0]) ? result[0] : Array.isArray(result?.rows) ? result.rows : Array.isArray(result) ? result : []
    return rows.length > 0
  }

  async up() {
    if (!(await this.hasTable('discipleship_cycles'))) {
      await this.schema.createTable('discipleship_cycles', (table) => {
        table.string('id', 36).primary()
        table.string('name', 120).notNullable().unique()
        table.string('color', 7).notNullable()
        table.integer('position').notNullable()
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
        table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
      })
    }
    if (!(await this.hasTable('discipleship_lessons'))) {
      await this.schema.createTable('discipleship_lessons', (table) => {
        table.string('id', 36).primary()
        table.string('cycle_id', 36).notNullable().index()
        table.string('title', 255).notNullable().unique()
        table.integer('position').notNullable()
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
        table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
        table.foreign('cycle_id').references('id').inTable('discipleship_cycles').onDelete('CASCADE').onUpdate('CASCADE')
      })
    }

    for (const cycle of cycles) {
      if (!(await db.from('discipleship_cycles').where('id', cycle.id).first())) {
        await db.table('discipleship_cycles').insert({ ...cycle, created_at: new Date(), updated_at: new Date() })
      }
    }
    for (const [index, [title, cycleId]] of lessons.entries()) {
      const lessonId = `lesson-${String(index + 1).padStart(2, '0')}`
      if (!(await db.from('discipleship_lessons').where('id', lessonId).first())) {
        await db.table('discipleship_lessons').insert({
          id: lessonId,
          title,
          cycle_id: cycleId,
          position: index + 1,
          created_at: new Date(),
          updated_at: new Date(),
        })
      }
    }
  }

  async down() {
    await this.schema.dropTableIfExists('discipleship_lessons')
    await this.schema.dropTableIfExists('discipleship_cycles')
  }
}
