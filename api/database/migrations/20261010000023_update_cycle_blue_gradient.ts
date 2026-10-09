import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

const colors = [
  ['cycle-basic', '#8AD6D1'],
  ['cycle-intermediate', '#5AB8BA'],
  ['cycle-advanced', '#359FA0'],
] as const

export default class extends BaseSchema {
  async up() {
    for (const [id, color] of colors) {
      await db.from('discipleship_cycles').where('id', id).update({ color, updated_at: new Date() })
    }
  }

  async down() {
    const previousColors = [
      ['cycle-basic', '#B8D4AE'],
      ['cycle-intermediate', '#306D29'],
      ['cycle-advanced', '#0D530E'],
    ] as const
    for (const [id, color] of previousColors) {
      await db.from('discipleship_cycles').where('id', id).update({ color, updated_at: new Date() })
    }
  }
}
