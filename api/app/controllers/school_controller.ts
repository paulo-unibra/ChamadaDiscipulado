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

function normalizeClassName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
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
    db.from('classes').select('*').orderBy('created_at', 'desc'),
    db.from('students').select('*').orderBy('created_at', 'desc'),
    db.from('teachers').select('*').orderBy('created_at', 'desc'),
    db.from('class_students').select('*'),
    db.from('attendance_records').select('*').orderBy('date', 'desc').orderBy('created_at', 'desc'),
    db.from('attendance_teachers').select('*'),
    db.from('attendance_entries').select('*'),
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
    await db.from('classes').whereIn('id', legacyAutoClassIds).delete()
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
  async state({ response }: HttpContext) {
    return response.ok(await getState())
  }

  async createClass({ request, response }: HttpContext) {
    const name = safeString(request.input('name'))
    const description = safeString(request.input('description'))

    if (!name) {
      return response.badRequest({ message: 'Nome da turma eh obrigatorio.' })
    }

    await db.table('classes').insert({
      id: id('class'),
      name,
      description: description || null,
    })

    return response.ok(await getState())
  }

  async deleteClass({ params, response }: HttpContext) {
    await db.from('classes').where('id', params.id).delete()
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

    return response.ok(await getState())
  }

  async deleteStudent({ params, response }: HttpContext) {
    await db.from('students').where('id', params.id).delete()
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
    }

    return response.ok(await getState())
  }

  async removeStudentFromClass({ request, response }: HttpContext) {
    const classId = safeString(request.input('classId'))
    const studentId = safeString(request.input('studentId'))

    if (!classId || !studentId) {
      return response.badRequest({ message: 'classId e studentId sao obrigatorios.' })
    }

    await db
      .from('class_students')
      .where('class_id', classId)
      .andWhere('student_id', studentId)
      .delete()

    await db
      .from('attendance_entries')
      .where('student_id', studentId)
      .whereIn(
        'attendance_record_id',
        db.from('attendance_records').select('id').where('class_id', classId)
      )
      .delete()

    return response.ok(await getState())
  }

  async createTeacher({ request, response }: HttpContext) {
    const name = safeString(request.input('name'))
    const phone = safeString(request.input('phone'))

    if (!name) {
      return response.badRequest({ message: 'Nome do professor eh obrigatorio.' })
    }

    await db.table('teachers').insert({
      id: id('teacher'),
      name,
      phone: phone || null,
    })

    return response.ok(await getState())
  }

  async deleteTeacher({ params, response }: HttpContext) {
    await db.from('teachers').where('id', params.id).delete()
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

        await trx.from('attendance_teachers').where('attendance_record_id', attendanceId).delete()
        await trx.from('attendance_entries').where('attendance_record_id', attendanceId).delete()
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

      await trx.commit()
      return response.ok(await getState())
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  async deleteAttendance({ params, response }: HttpContext) {
    await db.from('attendance_records').where('id', params.id).delete()
    return response.ok(await getState())
  }
}
