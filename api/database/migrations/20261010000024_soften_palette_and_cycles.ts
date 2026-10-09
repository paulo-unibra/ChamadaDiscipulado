import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

const colors = [
  ['cycle-basic', '#DFF3F0'],
  ['cycle-intermediate', '#B8E2DE'],
  ['cycle-advanced', '#88CFCB'],
] as const

export default class extends BaseSchema {
  async up() {
    for (const [id, color] of colors) {
      await db.from('discipleship_cycles').where('id', id).update({ color, updated_at: new Date() })
    }
  }

  async down() {
    const previousColors = [
      ['cycle-basic', '#8AD6D1'],
      ['cycle-intermediate', '#5AB8BA'],
      ['cycle-advanced', '#359FA0'],
    ] as const
    for (const [id, color] of previousColors) {
      await db.from('discipleship_cycles').where('id', id).update({ color, updated_at: new Date() })
    }
  }
}
