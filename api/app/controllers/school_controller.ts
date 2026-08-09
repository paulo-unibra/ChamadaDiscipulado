import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

const VALID_STATUSES = ['present', 'absent', 'justified', 'late'] as const
type AttendanceStatus = (typeof VALID_STATUSES)[number]

type StudentPayload = {
  name: string
  birthDate?: string
  studentPhone?: string
  email?: string
  guardianName?: string
  guardianPhone?: string
  address?: string
  notes?: string
  classIds?: string[]
}

type AttendancePayload = {
  classId: string
  lessonName?: string
  teacherIds: string[]
  date: string
  notes?: string
  entries: Array<{
    studentId: string
    status: AttendanceStatus
    note?: string
  }>
}

const DISCIPLESHIP_LESSONS = [
  'INTRODUÇÃO AO DISCIPULADO',
  'HISTÓRIA DAS ASSEMBLEIAS DE DEUS',
  'TENDO UMA NOVA CONDUTA',
  'SUPERANDO CONFLITOS E DÚVIDAS',
  'INTRODUÇÃO À BÍBLIA',
  'CONHECENDO JESUS',
  'O PLANO DE DEUS PARA A HUMANIDADE',
  'O QUE É SALVAÇÃO?',
  'O QUE É PECADO?',
  'SANTIFICAÇÃO',
  'OBEDIÊNCIA',
  'ORAÇÃO',
  'O FRUTO DO ESPÍRITO',
  'MORDOMIA CRISTÃ',
  'A IGREJA',
  'DOUTRINAS, COSTUMES, E NORMAS DA IGREJA',
  'O BATISMO COM ESPÍRITO SANTO',
  'TRINDADE DIVINA',
  'HERESIAS',
  'FINAL DOS TEMPOS',
  'ORDENANÇAS BÍBLICAS',
  'EVANGELISMO',
] as const

const LEGACY_AUTO_CLASS_DESCRIPTION = 'Aula fixa do discipulado'

type AuditEntry = {
  action: string
  entityType: string
  entityId?: string
  details?: Record<string, unknown>
}

async function writeAuditLog(
  connection: any,
  request: HttpContext['request'],
  entry: AuditEntry
) {
  try {
    await connection.table('audit_logs').insert({
      id: id('audit'),
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      details: entry.details ? JSON.stringify(entry.details) : null,
      ip: request.ip() || null,
      user_agent: (request.header('user-agent') || '').slice(0, 255) || null,
    })
  } catch (error) {
    console.warn('[audit] failed to write log:', error)
  }
}

function normalizeClassName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function parseAuditDetails(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value ?? {}
}

const DISCIPLESHIP_LESSON_LOOKUP = new Set(
  DISCIPLESHIP_LESSONS.map((lessonName) => normalizeClassName(lessonName))
)

function isDiscipleshipLessonName(value: string) {
  return DISCIPLESHIP_LESSON_LOOKUP.has(normalizeClassName(value))
}

function id(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function safeString(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function normalizeIdArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  const mapped = value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)

  return Array.from(new Set(mapped))
}

function normalizeDateForClient(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getUTCFullYear()
    const month = String(value.getUTCMonth() + 1).padStart(2, '0')
    const day = String(value.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) {
    return ''
  }

  const directIsoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (directIsoMatch) {
    return directIsoMatch[1]
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return raw
  }

  const year = parsed.getUTCFullYear()
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
  const day = String(parsed.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function getState() {
  const [
    classesRows,
    studentsRows,
    teachersRows,
    classStudentsRows,
    attendanceRows,
    attendanceTeachersRows,
    attendanceEntriesRows,
  ] = await Promise.all([
    db.from('classes').select('*').whereNull('deleted_at').orderBy('created_at', 'desc'),
    db.from('students').select('*').whereNull('deleted_at').orderBy('created_at', 'desc'),
    db.from('teachers').select('*').whereNull('deleted_at').orderBy('created_at', 'desc'),
    db.from('class_students').select('*').whereNull('deleted_at'),
    db
      .from('attendance_records')
      .select('*')
      .whereNull('deleted_at')
      .orderBy('date', 'desc')
      .orderBy('created_at', 'desc'),
    db.from('attendance_teachers').select('*').whereNull('deleted_at'),
    db.from('attendance_entries').select('*').whereNull('deleted_at'),
  ])

  const classStudentsByClassId = classStudentsRows.reduce<Record<string, string[]>>((acc, row) => {
    const classId = String(row.class_id)
    const studentId = String(row.student_id)
    acc[classId] ??= []
    acc[classId].push(studentId)
    return acc
  }, {})

  const attendanceTeachersByRecord = attendanceTeachersRows.reduce<Record<string, string[]>>(
    (acc, row) => {
      const attendanceId = String(row.attendance_record_id)
      const teacherId = String(row.teacher_id)
      acc[attendanceId] ??= []
      acc[attendanceId].push(teacherId)
      return acc
    },
    {}
  )

  const attendanceEntriesByRecord = attendanceEntriesRows.reduce<Record<string, any[]>>(
    (acc, row) => {
      const attendanceId = String(row.attendance_record_id)
      acc[attendanceId] ??= []
      acc[attendanceId].push({
        studentId: String(row.student_id),
        status: row.status,
        note: row.note ?? '',
      })
      return acc
    },
    {}
  )

  const attendanceClassIds = new Set(attendanceRows.map((row) => String(row.class_id)))

  const legacyAutoClassIds = classesRows
    .filter((row) => {
      const classId = String(row.id)
      const className = safeString(String(row.name ?? ''))
      const classDescription = safeString(String(row.description ?? ''))
      const hasStudents = (classStudentsByClassId[classId]?.length ?? 0) > 0
      const hasAttendance = attendanceClassIds.has(classId)

      return (
        isDiscipleshipLessonName(className) &&
        classDescription === LEGACY_AUTO_CLASS_DESCRIPTION &&
        !hasStudents &&
        !hasAttendance
      )
    })
    .map((row) => String(row.id))

  if (legacyAutoClassIds.length > 0) {
    await db
      .from('classes')
      .whereIn('id', legacyAutoClassIds)
      .update({ deleted_at: new Date() })
  }

  const legacyAutoClassIdSet = new Set(legacyAutoClassIds)

  const classes = classesRows
    .filter((row) => !legacyAutoClassIdSet.has(String(row.id)))
    .map((row) => ({
      id: String(row.id),
      name: row.name,
      description: row.description ?? '',
      studentIds: classStudentsByClassId[String(row.id)] ?? [],
      createdAt: row.created_at,
      lessonNames: [...DISCIPLESHIP_LESSONS],
    }))

  const students = studentsRows.map((row) => ({
    id: String(row.id),
    name: row.name,
    birthDate: row.birth_date ?? '',
    studentPhone: row.student_phone ?? '',
    email: row.email ?? '',
    guardianName: row.guardian_name ?? '',
    guardianPhone: row.guardian_phone ?? '',
    address: row.address ?? '',
    notes: row.notes ?? '',
    createdAt: row.created_at,
  }))

  const teachers = teachersRows.map((row) => ({
    id: String(row.id),
    name: row.name,
    phone: row.phone ?? '',
    createdAt: row.created_at,
  }))

  const attendanceRecords = attendanceRows.map((row) => ({
    id: String(row.id),
    classId: String(row.class_id),
    lessonName: safeString(row.lesson_name),
    teacherIds: attendanceTeachersByRecord[String(row.id)] ?? [],
    date: normalizeDateForClient(row.date),
    notes: row.notes ?? '',
    entries: attendanceEntriesByRecord[String(row.id)] ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))

  return {
    classes,
    discipleshipLessons: [...DISCIPLESHIP_LESSONS],
    students,
    teachers,
    attendanceRecords,
  }
}

export default class SchoolController {
  async studentTimeline({ response }: HttpContext) {
    const rows = await db
      .from('students')
      .select(
        'students.id',
        'students.name',
        db.raw('MIN(attendance_records.date) as start_date'),
        db.raw('MAX(attendance_records.date) as end_date'),
        db.raw(
          'MIN(attendance_records.lesson_name) filter (where attendance_records.date = (select min(ar2.date) from attendance_records ar2 inner join attendance_entries ae2 on ae2.attendance_record_id = ar2.id where ae2.student_id = students.id and ae2.deleted_at is null and ar2.deleted_at is null and ae2.status in (\'present\', \'late\'))) as first_lesson'
        ),
        db.raw(
          'MAX(attendance_records.lesson_name) filter (where attendance_records.date = (select max(ar2.date) from attendance_records ar2 inner join attendance_entries ae2 on ae2.attendance_record_id = ar2.id where ae2.student_id = students.id and ae2.deleted_at is null and ar2.deleted_at is null and ae2.status in (\'present\', \'late\'))) as last_lesson'
        )
      )
      .innerJoin('attendance_entries', 'attendance_entries.student_id', 'students.id')
      .innerJoin('attendance_records', 'attendance_records.id', 'attendance_entries.attendance_record_id')
      .whereNull('students.deleted_at')
      .whereNull('attendance_entries.deleted_at')
      .whereNull('attendance_records.deleted_at')
      .whereIn('attendance_entries.status', ['present', 'late'])
      .groupBy('students.id', 'students.name')
      .orderBy('start_date', 'asc')

    const data = rows.map((row: any) => ({
      studentId: String(row.id),
      studentName: row.name,
      startDate: row.start_date ? normalizeDateForClient(row.start_date) : '',
      endDate: row.end_date ? normalizeDateForClient(row.end_date) : '',
      firstLesson: row.first_lesson ?? '',
      lastLesson: row.last_lesson ?? '',
    }))

    return response.ok(data)
  }

  async state({ response }: HttpContext) {
    return response.ok(await getState())
  }

  async auditLogs({ response }: HttpContext) {
    const rows = await db.from('audit_logs').orderBy('created_at', 'desc').limit(200)

    const data = rows.map((row: any) => ({
      id: String(row.id),
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id ?? '',
      details: parseAuditDetails(row.details),
      ip: row.ip ?? '',
      userAgent: row.user_agent ?? '',
      createdAt: row.created_at,
    }))

    return response.ok(data)
  }

  async createClass({ request, response }: HttpContext) {
    const name = safeString(request.input('name'))
    const description = safeString(request.input('description'))

    if (!name) {
      return response.badRequest({ message: 'Nome da turma eh obrigatorio.' })
    }

    const classId = id('class')
    await db.table('classes').insert({
      id: classId,
      name,
      description: description || null,
    })

    await writeAuditLog(db, request, {
      action: 'class.create',
      entityType: 'class',
      entityId: classId,
      details: { name, description },
    })

    return response.ok(await getState())
  }

  async deleteClass({ request, params, response }: HttpContext) {
    const existing = await db.from('classes').where('id', params.id).first()
    const deletedAt = new Date()

    await db.from('classes').where('id', params.id).update({ deleted_at: deletedAt })
    await db.from('class_students').where('class_id', params.id).update({ deleted_at: deletedAt })

    const recordRows = await db
      .from('attendance_records')
      .select('id')
      .where('class_id', params.id)
      .whereNull('deleted_at')
    const recordIds = recordRows.map((row: any) => String(row.id))

    if (recordIds.length > 0) {
      await db
        .from('attendance_records')
        .whereIn('id', recordIds)
        .update({ deleted_at: deletedAt })
      await db
        .from('attendance_teachers')
        .whereIn('attendance_record_id', recordIds)
        .whereNull('deleted_at')
        .update({ deleted_at: deletedAt })
      await db
        .from('attendance_entries')
        .whereIn('attendance_record_id', recordIds)
        .whereNull('deleted_at')
        .update({ deleted_at: deletedAt })
    }

    await writeAuditLog(db, request, {
      action: 'class.delete',
      entityType: 'class',
      entityId: params.id,
      details: { name: existing?.name ?? '', recordCount: recordIds.length },
    })

    return response.ok(await getState())
  }

  async createStudent({ request, response }: HttpContext) {
    const payload = request.body() as StudentPayload
    const name = safeString(payload.name)

    if (!name) {
      return response.badRequest({ message: 'Nome do aluno eh obrigatorio.' })
    }

    const studentId = id('student')
    await db.table('students').insert({
      id: studentId,
      name,
      birth_date: safeString(payload.birthDate) || null,
      student_phone: safeString(payload.studentPhone) || null,
      email: safeString(payload.email) || null,
      guardian_name: safeString(payload.guardianName) || null,
      guardian_phone: safeString(payload.guardianPhone) || null,
      address: safeString(payload.address) || null,
      notes: safeString(payload.notes) || null,
    })

    const classIds = normalizeIdArray(payload.classIds)
    if (classIds.length > 0) {
      const rows = classIds.map((classId) => ({
        id: id('clsstd'),
        class_id: classId,
        student_id: studentId,
      }))
      await db.table('class_students').insert(rows)
    }

    await writeAuditLog(db, request, {
      action: 'student.create',
      entityType: 'student',
      entityId: studentId,
      details: { name, classIds },
    })

    return response.ok(await getState())
  }

  async deleteStudent({ request, params, response }: HttpContext) {
    const existing = await db.from('students').where('id', params.id).first()
    const deletedAt = new Date()

    await db.from('students').where('id', params.id).update({ deleted_at: deletedAt })
    await db.from('class_students').where('student_id', params.id).update({ deleted_at: deletedAt })

    await writeAuditLog(db, request, {
      action: 'student.delete',
      entityType: 'student',
      entityId: params.id,
      details: { name: existing?.name ?? '' },
    })

    return response.ok(await getState())
  }

  async assignStudentToClass({ request, response }: HttpContext) {
    const classId = safeString(request.input('classId'))
    const studentId = safeString(request.input('studentId'))

    if (!classId || !studentId) {
      return response.badRequest({ message: 'classId e studentId sao obrigatorios.' })
    }

    const alreadyLinked = await db
      .from('class_students')
      .where('class_id', classId)
      .andWhere('student_id', studentId)
      .first()

    if (!alreadyLinked) {
      await db.table('class_students').insert({
        id: id('clsstd'),
        class_id: classId,
        student_id: studentId,
      })

      await writeAuditLog(db, request, {
        action: 'class_students.assign',
        entityType: 'class_students',
        entityId: classId,
        details: { studentId },
      })
    } else if (alreadyLinked.deleted_at) {
      await db
        .from('class_students')
        .where('id', alreadyLinked.id)
        .update({ deleted_at: null })

      await writeAuditLog(db, request, {
        action: 'class_students.assign',
        entityType: 'class_students',
        entityId: classId,
        details: { studentId, restored: true },
      })
    }

    return response.ok(await getState())
  }

  async removeStudentFromClass({ request, response }: HttpContext) {
    const classId = safeString(request.input('classId'))
    const studentId = safeString(request.input('studentId'))

    if (!classId || !studentId) {
      return response.badRequest({ message: 'classId e studentId sao obrigatorios.' })
    }

    const link = await db
      .from('class_students')
      .where('class_id', classId)
      .andWhere('student_id', studentId)
      .first()

    await db
      .from('class_students')
      .where('class_id', classId)
      .andWhere('student_id', studentId)
      .update({ deleted_at: new Date() })

    if (link) {
      await writeAuditLog(db, request, {
        action: 'class_students.remove',
        entityType: 'class_students',
        entityId: classId,
        details: { studentId, historyPreserved: true },
      })
    }

    return response.ok(await getState())
  }

  async createTeacher({ request, response }: HttpContext) {
    const name = safeString(request.input('name'))
    const phone = safeString(request.input('phone'))

    if (!name) {
      return response.badRequest({ message: 'Nome do professor eh obrigatorio.' })
    }

    const teacherId = id('teacher')
    await db.table('teachers').insert({
      id: teacherId,
      name,
      phone: phone || null,
    })

    await writeAuditLog(db, request, {
      action: 'teacher.create',
      entityType: 'teacher',
      entityId: teacherId,
      details: { name },
    })

    return response.ok(await getState())
  }

  async deleteTeacher({ request, params, response }: HttpContext) {
    const existing = await db.from('teachers').where('id', params.id).first()
    await db.from('teachers').where('id', params.id).update({ deleted_at: new Date() })

    await writeAuditLog(db, request, {
      action: 'teacher.delete',
      entityType: 'teacher',
      entityId: params.id,
      details: { name: existing?.name ?? '' },
    })

    return response.ok(await getState())
  }

  async saveAttendance({ request, response }: HttpContext) {
    const payload = request.body() as AttendancePayload & { id?: string }
    const attendanceId = safeString(payload.id) || id('attendance')
    const classId = safeString(payload.classId)
    const lessonName = safeString(payload.lessonName)
    const teacherIds = normalizeIdArray(payload.teacherIds)
    const date = safeString(payload.date)
    const notes = safeString(payload.notes)
    const entries = Array.isArray(payload.entries) ? payload.entries : []

    if (!classId || !lessonName || !date || teacherIds.length === 0) {
      return response.badRequest({
        message: 'classId, lessonName, date e teacherIds sao obrigatorios.',
      })
    }

    if (!isDiscipleshipLessonName(lessonName)) {
      return response.badRequest({
        message: 'A aula informada nao pertence a grade fixa do discipulado.',
      })
    }

    const trx = await db.transaction()
    try {
      if (payload.id) {
        const deletedAt = new Date()

        await trx
          .from('attendance_records')
          .where('id', attendanceId)
          .update({
            class_id: classId,
            lesson_name: lessonName,
            date,
            notes: notes || null,
            updated_at: new Date(),
          })

        await trx
          .from('attendance_teachers')
          .where('attendance_record_id', attendanceId)
          .whereNull('deleted_at')
          .update({ deleted_at: deletedAt })
        await trx
          .from('attendance_entries')
          .where('attendance_record_id', attendanceId)
          .whereNull('deleted_at')
          .update({ deleted_at: deletedAt })
      } else {
        await trx.table('attendance_records').insert({
          id: attendanceId,
          class_id: classId,
          lesson_name: lessonName,
          date,
          notes: notes || null,
        })
      }

      if (teacherIds.length > 0) {
        await trx.table('attendance_teachers').insert(
          teacherIds.map((teacherId) => ({
            id: id('atttea'),
            attendance_record_id: attendanceId,
            teacher_id: teacherId,
          }))
        )
      }

      const normalizedEntries = entries
        .map((entry) => {
          const studentId = safeString(entry.studentId)
          const status = safeString(entry.status) as AttendanceStatus
          const note = safeString(entry.note)

          if (!studentId || !VALID_STATUSES.includes(status)) {
            return null
          }

          return {
            id: id('attent'),
            attendance_record_id: attendanceId,
            student_id: studentId,
            status,
            note: note || null,
          }
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))

      if (normalizedEntries.length > 0) {
        await trx.table('attendance_entries').insert(normalizedEntries)
      }

      await writeAuditLog(trx, request, {
        action: 'attendance.save',
        entityType: 'attendance_record',
        entityId: attendanceId,
        details: {
          classId,
          lessonName,
          date,
          isUpdate: Boolean(payload.id),
          entryCount: normalizedEntries.length,
        },
      })

      await trx.commit()
      return response.ok(await getState())
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  async deleteAttendance({ request, params, response }: HttpContext) {
    const existing = await db.from('attendance_records').where('id', params.id).first()
    const deletedAt = new Date()

    await db.from('attendance_records').where('id', params.id).update({ deleted_at: deletedAt })
    await db
      .from('attendance_teachers')
      .where('attendance_record_id', params.id)
      .whereNull('deleted_at')
      .update({ deleted_at: deletedAt })
    await db
      .from('attendance_entries')
      .where('attendance_record_id', params.id)
      .whereNull('deleted_at')
      .update({ deleted_at: deletedAt })

    await writeAuditLog(db, request, {
      action: 'attendance.delete',
      entityType: 'attendance_record',
      entityId: params.id,
      details: {
        classId: existing?.class_id ?? '',
        lessonName: existing?.lesson_name ?? '',
        date: existing?.date ?? '',
      },
    })

    return response.ok(await getState())
  }
}
