import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  private async hasStartDateColumn() {
    const result: any = await this.schema.raw(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'classes' AND COLUMN_NAME = 'start_date' LIMIT 1`)
    const rows = Array.isArray(result) ? result[0] : result
    return Array.isArray(rows) && rows.length > 0
  }

  async up() {
    if (!(await this.hasStartDateColumn())) {
      await this.schema.alterTable('classes', (table) => table.date('start_date').nullable())
    }
    if (await this.schema.hasTable('discipleship_schedule')) {
      await this.schema.raw(`
        UPDATE classes c
        SET start_date = COALESCE(
          (SELECT MIN(ar.date) FROM attendance_records ar WHERE ar.class_id = c.id AND ar.deleted_at IS NULL),
          (SELECT MIN(ds.lesson_date) FROM discipleship_schedule ds WHERE ds.class_id = c.id),
          c.start_date
        )
      `)
    }
    const now = new Date()
    const daysSinceSunday = now.getDay()
    const daysUntilSunday = (7 - daysSinceSunday) % 7
    const offset = daysSinceSunday < daysUntilSunday ? -daysSinceSunday : daysUntilSunday
    const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offset)).toISOString().slice(0, 10)
    await this.schema.raw(`UPDATE classes SET start_date = '${startDate}' WHERE start_date IS NULL`)
    if (await this.schema.hasTable('discipleship_schedule')) {
      const result: any = await this.schema.raw(`
        SELECT c.id AS class_id, c.start_date, ds.id AS schedule_id, ds.lesson_date
        FROM classes c
        INNER JOIN discipleship_schedule ds ON ds.class_id = c.id
        ORDER BY c.id, ds.lesson_date
      `)
      const rows: any[] = Array.isArray(result?.[0]) ? result[0] : Array.isArray(result) ? result : []
      const byClass = new Map<string, any[]>()
      for (const row of rows) {
        const classId = String(row.class_id)
        byClass.set(classId, [...(byClass.get(classId) || []), row])
      }
      for (const lessons of byClass.values()) {
        const dateText = (value: unknown) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
        const firstScheduleDate = dateText(lessons[0].lesson_date)
        const classStartDate = dateText(lessons[0].start_date)
        const dayShift = Math.round((new Date(`${classStartDate}T00:00:00Z`).getTime() - new Date(`${firstScheduleDate}T00:00:00Z`).getTime()) / 86_400_000)
        if (!dayShift) continue
        for (const lesson of lessons) {
          const scheduleId = String(lesson.schedule_id).replace(/'/g, "''")
          await this.schema.raw(`UPDATE discipleship_schedule SET lesson_date = DATE_ADD(lesson_date, INTERVAL 10000 DAY) WHERE id = '${scheduleId}'`)
        }
        for (const lesson of lessons) {
          const shiftedDate = new Date(`${dateText(lesson.lesson_date)}T12:00:00Z`)
          shiftedDate.setUTCDate(shiftedDate.getUTCDate() + dayShift)
          const scheduleId = String(lesson.schedule_id).replace(/'/g, "''")
          await this.schema.raw(`UPDATE discipleship_schedule SET lesson_date = '${shiftedDate.toISOString().slice(0, 10)}' WHERE id = '${scheduleId}'`)
        }
      }
    }
  }

  async down() {
    if (await this.schema.hasColumn('classes', 'start_date')) {
      await this.schema.alterTable('classes', (table) => table.dropColumn('start_date'))
    }
  }
}
