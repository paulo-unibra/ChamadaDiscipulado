import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

const colors = [
  ['cycle-basic', '#B8D4AE'],
  ['cycle-intermediate', '#306D29'],
  ['cycle-advanced', '#0D530E'],
] as const

export default class extends BaseSchema {
  async up() {
    for (const [id, color] of colors) {
      await db.from('discipleship_cycles').where('id', id).update({ color, updated_at: new Date() })
    }
  }

  async down() {
    const previousColors = [
      ['cycle-basic', '#306D29'],
      ['cycle-intermediate', '#0D530E'],
      ['cycle-advanced', '#E7E1B1'],
    ] as const
    for (const [id, color] of previousColors) {
      await db.from('discipleship_cycles').where('id', id).update({ color, updated_at: new Date() })
    }
  }
}
