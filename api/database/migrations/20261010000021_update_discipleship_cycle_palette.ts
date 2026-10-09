import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSchema {
  async up() {
    const colors = [
      ['cycle-basic', '#8AD6D1'],
      ['cycle-intermediate', '#5AB8BA'],
      ['cycle-advanced', '#359FA0'],
    ] as const
    for (const [id, color] of colors) {
      await db.from('discipleship_cycles').where('id', id).update({ color, updated_at: new Date() })
    }
  }

  async down() {
    const colors = [
      ['cycle-basic', '#3B82F6'],
      ['cycle-intermediate', '#10B981'],
      ['cycle-advanced', '#8B5CF6'],
    ] as const
    for (const [id, color] of colors) {
      await db.from('discipleship_cycles').where('id', id).update({ color, updated_at: new Date() })
    }
  }
}
