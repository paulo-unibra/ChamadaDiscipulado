import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import type { QueryClientContract } from '@adonisjs/lucid/types/database'
import { preserveScheduleFields } from '#services/schedule_fields_service'
import {
  attendanceValidator,
  classStartDateValidator,
  classStudentLinkValidator,
  classValidator,
  congregationValidator,
  newConvertValidator,
  studentValidator,
  teacherGenderValidator,
  teacherValidator,
} from '#validators/school_validator'

const VALID_STATUSES = ['present', 'absent', 'justified', 'late'] as const
type AttendanceStatus = (typeof VALID_STATUSES)[number]
const CONVERSION_EVENTS = [
  'ADESIVAÇO',
  'ADOLESCENTES: TESTEMUNHAS',
  'Aniversário de Campanha Evangelizadora',
  'Aniversário de Conjunto Musical',
  'Aniversário de Coral',
  'Aniversário de Grupo Jovem',
  'Aniversário de União de Adolescentes',
  'BEREANOS',
  'Caminhada Evangelistica de oração',
  'Cantata Evangelística da Páscoa',
  'Círculo de Oração Adulto',
  'Círculo de Oração Infantil',
  'Congresso de Adolescentes',
  'Congresso de Jovens',
  'Congresso de Mulheres',
  'Consagração',
  'Cruzada Jovem',
  'Cruzadas Evangelisticas',
  'Culto de Doutrina',
  'Culto de Oração',
  'Culto de Reencontro',
  'Culto Evangelistico (Domingo a noite)',
  'Culto Jovem',
  'Culto na feira',
  'Culto no lar',
  'Culto Relâmpago',
  'Culto rodízio',
  'Em família',
  'Encontro de comissões',
  'Encontro de crianças',
  'Escola Bíblica Dominical (EBD)',
  'Escola/faculdade (intervalo bíblico)',
  'Estudo do PROJEFÉRIAS',
  'Estudo para mocidade',
  'EVANGELISMO COM ORGAOS DE LOUVOR',
  'Evangelismo Estudantil (ENEM)',
  'Evangelismo Noturno',
  'Evangelismo Pessoal',
  'EVANGELISMO RESGATE',
  'EVANGELISMO SOLIDÁRIO',
  'Evangelismos e visita nos hospitais',
  'Evangelismos nos presídios',
  'GRANDE MOBILIZACAO PERNAMBUCO PARA CRISTO',
  'Mobilização Evangelística',
  'Mobilização: Mensageiro de Boas Novas',
  'Mobilização: Vou Testemunhar',
  'Oração da mocidade',
  'Pontos de pregação',
  'Pré-congressos',
  'PROATI',
  'Proclamai',
  'PROCLAMAI KIDS',
  'Santa Ceia',
  'Semana de Visitação',
  'Seminário para família',
  'Simpósio de doutrinas bíblicas',
  'Vigília',
  'Visitas (da comissão do círculo de oração)',
  'Outras atividades evangelisticas',
  'Outras ações',
] as const

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
const DEFAULT_CONGREGATION_ID = 'cong-zumbi-pacheco-1'

type AuditEntry = {
  action: string
  entityType: string
  entityId?: string
  details?: Record<string, unknown>
}

async function writeAuditLog(
  connection: typeof db | QueryClientContract,
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
    logger.warn(
      { err: error, requestId: request.header('x-request-id') },
      'Failed to write audit log'
    )
  }
}

function getCongregationId(request: HttpContext['request']) {
  return (
    safeString(request.input('congregationId') ?? request.header('x-congregation-id')) ||
    DEFAULT_CONGREGATION_ID
  )
}

async function hasCongregation(congregationId: string) {
  return Boolean(await db.from('congregations').where('id', congregationId).first())
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

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function isValidLessonTime(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function nearestWeekdayDate(weekday: number) {
  const now = new Date()
  const daysSince = now.getDay()
  const forward = (weekday - daysSince + 7) % 7
  const backward = forward === 0 ? 0 : forward - 7
  const offset = Math.abs(backward) < Math.abs(forward) ? backward : forward
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offset))
    .toISOString()
    .slice(0, 10)
}

function addDaysToIsoDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

async function getState(congregationId = DEFAULT_CONGREGATION_ID) {
  const [
    congregationsRows,
    classesRows,
    studentsRows,
    teachersRows,
    classStudentsRows,
    attendanceRows,
    attendanceTeachersRows,
    attendanceEntriesRows,
    newConvertsRows,
    scheduleRows,
    cycleRows,
    lessonCatalogRows,
  ] = await Promise.all([
    db.from('congregations').select('*').orderBy('name', 'asc'),
    db
      .from('classes')
      .select('*')
      .where('congregation_id', congregationId)
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc'),
    db
      .from('students')
      .select('*')
      .where('congregation_id', congregationId)
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc'),
    db
      .from('teachers')
      .select('*')
      .where('congregation_id', congregationId)
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc'),
    db
      .from('class_students')
      .select('*')
      .whereIn('class_id', db.from('classes').select('id').where('congregation_id', congregationId))
      .whereNull('deleted_at'),
    db
      .from('attendance_records')
      .select('attendance_records.*')
      .innerJoin('classes', 'classes.id', 'attendance_records.class_id')
      .where('classes.congregation_id', congregationId)
      .whereNull('attendance_records.deleted_at')
      .orderBy('attendance_records.date', 'desc')
      .orderBy('attendance_records.created_at', 'desc'),
    db.from('attendance_teachers').select('*').whereNull('deleted_at'),
    db.from('attendance_entries').select('*').whereNull('deleted_at'),
    db
      .from('new_converts')
      .select('*')
      .where('congregation_id', congregationId)
      .whereNull('deleted_at')
      .orderBy('conversion_date', 'desc')
      .orderBy('created_at', 'desc'),
    db
      .from('discipleship_schedule')
      .select('*')
      .where('congregation_id', congregationId)
      .orderBy('lesson_date', 'asc'),
    db.from('discipleship_cycles').select('*').orderBy('position', 'asc'),
    db.from('discipleship_lessons').select('*').orderBy('position', 'asc'),
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

  const attendanceEntriesByRecord = attendanceEntriesRows.reduce<
    Record<string, Array<{ studentId: string; status: string; note: string }>>
  >((acc, row) => {
    const attendanceId = String(row.attendance_record_id)
    acc[attendanceId] ??= []
    acc[attendanceId].push({
      studentId: String(row.student_id),
      status: row.status,
      note: row.note ?? '',
    })
    return acc
  }, {})

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
    await db.from('classes').whereIn('id', legacyAutoClassIds).update({ deleted_at: new Date() })
  }

  const legacyAutoClassIdSet = new Set(legacyAutoClassIds)

  const classes = classesRows
    .filter((row) => !legacyAutoClassIdSet.has(String(row.id)))
    .map((row) => ({
      id: String(row.id),
      name: row.name,
      description: row.description ?? '',
      startDate:
        normalizeDateForClient(row.start_date) ||
        scheduleRows
          .filter((lesson) => String(lesson.class_id) === String(row.id))
          .map((lesson) => normalizeDateForClient(lesson.lesson_date))
          .sort()[0] ||
        attendanceRows
          .filter((lesson) => String(lesson.class_id) === String(row.id))
          .map((lesson) => normalizeDateForClient(lesson.date))
          .sort()[0] ||
        nearestWeekdayDate(Number(row.lesson_weekday ?? 0)),
      lessonWeekday: Number(row.lesson_weekday ?? 0),
      studentIds: classStudentsByClassId[String(row.id)] ?? [],
      lessonTime: safeString(String(row.lesson_time ?? '09:00')) || '09:00',
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
    gender: row.gender === 'female' ? 'female' : 'male',
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

  const newConverts = newConvertsRows.map((row) => ({
    id: String(row.id),
    eventName: row.event_name,
    name: row.name,
    conversionDate: normalizeDateForClient(row.conversion_date),
    cep: row.cep ?? '',
    street: row.street ?? '',
    number: row.number ?? '',
    complement: row.complement ?? '',
    neighborhood: row.neighborhood ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    birthDate: row.birth_date ? normalizeDateForClient(row.birth_date) : '',
    contactPhone: row.contact_phone ?? '',
    createdAt: row.created_at,
  }))

  const cyclesById = new Map(cycleRows.map((cycle) => [String(cycle.id), cycle]))
  const cycleByLessonTitle = new Map<string, (typeof cycleRows)[number]>()
  for (const lesson of lessonCatalogRows) {
    const cycle = cyclesById.get(String(lesson.cycle_id))
    if (cycle) cycleByLessonTitle.set(String(lesson.title), cycle)
  }
  const discipleshipCycles = cycleRows.map((cycle) => ({
    id: String(cycle.id),
    name: cycle.name,
    color: cycle.color,
    position: Number(cycle.position),
    lessons: lessonCatalogRows
      .filter((lesson) => String(lesson.cycle_id) === String(cycle.id))
      .map((lesson) => ({
        id: String(lesson.id),
        title: lesson.title,
        position: Number(lesson.position),
      })),
  }))

  return {
    congregations: congregationsRows.map((row) => ({
      id: String(row.id),
      name: row.name,
      area: row.area ?? '',
      sector: row.sector ?? '',
      logoData: row.logo_data ?? '',
      justificationContact: row.justification_contact ?? '',
      scaleMessageTemplate: row.scale_message_template ?? '',
      createdAt: row.created_at,
    })),
    activeCongregationId: congregationId,
    classes,
    discipleshipLessons: lessonCatalogRows.map((row) => row.title),
    discipleshipCycles,
    students,
    teachers,
    attendanceRecords,
    newConverts,
    discipleshipSchedule: scheduleRows.map((row) => ({
      id: String(row.id),
      classId: String(row.class_id),
      date: normalizeDateForClient(row.lesson_date),
      title: row.title,
      content: row.content ?? '',
      teacherId: row.teacher_id ? String(row.teacher_id) : '',
      justification: row.justification ?? '',
      timeOverride: row.lesson_time ?? '',
      time:
        row.lesson_time ||
        classes.find((group) => group.id === String(row.class_id))?.lessonTime ||
        '09:00',
      ...(cycleByLessonTitle.has(String(row.title))
        ? {
            cycleId: String(cycleByLessonTitle.get(String(row.title)).id),
            cycleName: cycleByLessonTitle.get(String(row.title)).name,
            cycleColor: cycleByLessonTitle.get(String(row.title)).color,
          }
        : {}),
    })),
  }
}

export default class SchoolController {
  async studentTimeline({ request, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    const rows = await db
      .from('students')
      .select(
        'students.id',
        'students.name',
        db.raw('MIN(attendance_records.date) as start_date'),
        db.raw('MAX(attendance_records.date) as end_date'),
        db.raw(
          "MIN(attendance_records.lesson_name) filter (where attendance_records.date = (select min(ar2.date) from attendance_records ar2 inner join attendance_entries ae2 on ae2.attendance_record_id = ar2.id where ae2.student_id = students.id and ae2.deleted_at is null and ar2.deleted_at is null and ae2.status in ('present', 'late'))) as first_lesson"
        ),
        db.raw(
          "MAX(attendance_records.lesson_name) filter (where attendance_records.date = (select max(ar2.date) from attendance_records ar2 inner join attendance_entries ae2 on ae2.attendance_record_id = ar2.id where ae2.student_id = students.id and ae2.deleted_at is null and ar2.deleted_at is null and ae2.status in ('present', 'late'))) as last_lesson"
        )
      )
      .innerJoin('attendance_entries', 'attendance_entries.student_id', 'students.id')
      .innerJoin(
        'attendance_records',
        'attendance_records.id',
        'attendance_entries.attendance_record_id'
      )
      .whereNull('students.deleted_at')
      .whereNull('attendance_entries.deleted_at')
      .whereNull('attendance_records.deleted_at')
      .where('students.congregation_id', congregationId)
      .whereIn('attendance_entries.status', ['present', 'late'])
      .groupBy('students.id', 'students.name')
      .orderBy('start_date', 'asc')

    const data = rows.map((row) => ({
      studentId: String(row.id),
      studentName: row.name,
      startDate: row.start_date ? normalizeDateForClient(row.start_date) : '',
      endDate: row.end_date ? normalizeDateForClient(row.end_date) : '',
      firstLesson: row.first_lesson ?? '',
      lastLesson: row.last_lesson ?? '',
    }))

    return response.ok(data)
  }

  async state({ request, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    if (!(await hasCongregation(congregationId))) {
      return response.badRequest({ message: 'A congregação selecionada não existe.' })
    }
    return response.ok(await getState(congregationId))
  }

  async createCongregation({ request, response }: HttpContext) {
    const payload = await request.validateUsing(congregationValidator)
    const name = safeString(payload.name)
    const area = safeString(payload.area)
    const sector = safeString(payload.sector)

    const congregationId = id('congregation')
    await db.table('congregations').insert({ id: congregationId, name, area, sector })
    await writeAuditLog(db, request, {
      action: 'congregation.create',
      entityType: 'congregation',
      entityId: congregationId,
      details: { name, area, sector },
    })
    return response.ok(await getState(congregationId))
  }

  async updateCongregation({ request, params, response }: HttpContext) {
    const payload = await request.validateUsing(congregationValidator)
    const name = safeString(payload.name)
    const area = safeString(payload.area)
    const sector = safeString(payload.sector)
    const justificationContact = safeString(payload.justificationContact).replace(/\D/g, '')
    const scaleMessageTemplate = safeString(payload.scaleMessageTemplate)
    const logoData = safeString(payload.logoData)
    const congregationId = String(params.id)
    const existing = await db.from('congregations').where('id', congregationId).first()
    if (!existing) return response.notFound({ message: 'Congregação não encontrada.' })
    if (!name) return response.badRequest({ message: 'O nome da congregação é obrigatório.' })
    if (justificationContact && ![10, 11].includes(justificationContact.length)) {
      return response.badRequest({
        message:
          'Informe o DDD e um telefone com 10 ou 11 dígitos para o contato de justificativas.',
      })
    }
    if (scaleMessageTemplate.length > 5000)
      return response.badRequest({
        message: 'A mensagem da escala deve ter no máximo 5.000 caracteres.',
      })
    if (
      logoData &&
      (logoData.length > 1_800_000 ||
        !/^data:image\/(?:png|jpe?g|webp);base64,[A-Za-z0-9+/]+=*$/.test(logoData))
    ) {
      return response.badRequest({
        message: 'A logo deve ser uma imagem PNG, JPEG ou WebP de até 1,8 MB após a compressão.',
      })
    }
    await db
      .from('congregations')
      .where('id', congregationId)
      .update({
        name,
        area,
        sector,
        logo_data: logoData || null,
        justification_contact: justificationContact || null,
        scale_message_template: scaleMessageTemplate || null,
        updated_at: new Date(),
      })
    await writeAuditLog(db, request, {
      action: 'congregation.update',
      entityType: 'congregation',
      entityId: congregationId,
      details: {
        name,
        area,
        sector,
        hasLogo: Boolean(logoData),
        hasJustificationContact: Boolean(justificationContact),
        hasScaleMessageTemplate: Boolean(scaleMessageTemplate),
      },
    })
    return response.ok(await getState(getCongregationId(request)))
  }

  async createNewConvert({ request, response }: HttpContext) {
    const payload = await request.validateUsing(newConvertValidator)
    const congregationId = getCongregationId(request)
    const eventName = safeString(payload.eventName)
    const name = safeString(payload.name)
    const conversionDate = safeString(payload.conversionDate)
    const birthDate = safeString(payload.birthDate)
    const cep = safeString(payload.cep).replace(/\D/g, '')

    if (!name || !eventName || !conversionDate) {
      return response.badRequest({
        message: 'Atividade, nome e data da conversão são obrigatórios.',
      })
    }
    if (!CONVERSION_EVENTS.includes(eventName as (typeof CONVERSION_EVENTS)[number])) {
      return response.badRequest({ message: 'Selecione uma atividade válida.' })
    }
    if (!isValidIsoDate(conversionDate) || (birthDate && !isValidIsoDate(birthDate))) {
      return response.badRequest({ message: 'Informe datas válidas para conversão e nascimento.' })
    }
    if (birthDate && birthDate > conversionDate) {
      return response.badRequest({
        message: 'A data de nascimento não pode ser posterior à conversão.',
      })
    }
    if (cep && cep.length !== 8) {
      return response.badRequest({ message: 'O CEP deve conter 8 dígitos.' })
    }
    if (!(await hasCongregation(congregationId))) {
      return response.badRequest({ message: 'A congregação selecionada não existe.' })
    }

    const newConvertId = id('new-convert')
    await db.table('new_converts').insert({
      id: newConvertId,
      congregation_id: congregationId,
      event_name: eventName,
      name,
      conversion_date: conversionDate,
      cep: cep || null,
      street: safeString(payload.street) || null,
      number: safeString(payload.number) || null,
      complement: safeString(payload.complement) || null,
      neighborhood: safeString(payload.neighborhood) || null,
      city: safeString(payload.city) || null,
      state: safeString(payload.state).toUpperCase().slice(0, 2) || null,
      birth_date: birthDate || null,
      contact_phone: safeString(payload.contactPhone) || null,
    })
    await writeAuditLog(db, request, {
      action: 'new_convert.create',
      entityType: 'new_convert',
      entityId: newConvertId,
      details: { name, eventName, conversionDate },
    })
    return response.ok(await getState(congregationId))
  }

  async updateNewConvert({ request, params, response }: HttpContext) {
    const payload = await request.validateUsing(newConvertValidator)
    const congregationId = getCongregationId(request)
    const eventName = safeString(payload.eventName)
    const name = safeString(payload.name)
    const conversionDate = safeString(payload.conversionDate)
    const birthDate = safeString(payload.birthDate)
    const cep = safeString(payload.cep).replace(/\D/g, '')

    if (!name || !eventName || !conversionDate) {
      return response.badRequest({
        message: 'Atividade, nome e data da conversão são obrigatórios.',
      })
    }
    if (!CONVERSION_EVENTS.includes(eventName as (typeof CONVERSION_EVENTS)[number])) {
      return response.badRequest({ message: 'Selecione uma atividade válida.' })
    }
    if (!isValidIsoDate(conversionDate) || (birthDate && !isValidIsoDate(birthDate))) {
      return response.badRequest({ message: 'Informe datas válidas para conversão e nascimento.' })
    }
    if (birthDate && birthDate > conversionDate) {
      return response.badRequest({
        message: 'A data de nascimento não pode ser posterior à conversão.',
      })
    }
    if (cep && cep.length !== 8)
      return response.badRequest({ message: 'O CEP deve conter 8 dígitos.' })

    const existing = await db
      .from('new_converts')
      .where('id', params.id)
      .where('congregation_id', congregationId)
      .whereNull('deleted_at')
      .first()
    if (!existing)
      return response.notFound({ message: 'Cadastro não encontrado nesta congregação.' })

    await db
      .from('new_converts')
      .where('id', params.id)
      .where('congregation_id', congregationId)
      .update({
        event_name: eventName,
        name,
        conversion_date: conversionDate,
        cep: cep || null,
        street: safeString(payload.street) || null,
        number: safeString(payload.number) || null,
        complement: safeString(payload.complement) || null,
        neighborhood: safeString(payload.neighborhood) || null,
        city: safeString(payload.city) || null,
        state: safeString(payload.state).toUpperCase().slice(0, 2) || null,
        birth_date: birthDate || null,
        contact_phone: safeString(payload.contactPhone) || null,
        updated_at: new Date(),
      })
    await db
      .from('google_forms_sent_items')
      .where('congregation_id', congregationId)
      .where('section_id', 'new-converts')
      .where('record_id', params.id)
      .delete()
    await writeAuditLog(db, request, {
      action: 'new_convert.update',
      entityType: 'new_convert',
      entityId: params.id,
      details: { name, eventName, conversionDate },
    })
    return response.ok(await getState(congregationId))
  }

  async deleteNewConvert({ request, params, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    const existing = await db
      .from('new_converts')
      .where('id', params.id)
      .where('congregation_id', congregationId)
      .whereNull('deleted_at')
      .first()
    if (!existing)
      return response.notFound({ message: 'Cadastro não encontrado nesta congregação.' })

    await db
      .from('new_converts')
      .where('id', params.id)
      .where('congregation_id', congregationId)
      .update({ deleted_at: new Date() })
    await writeAuditLog(db, request, {
      action: 'new_convert.delete',
      entityType: 'new_convert',
      entityId: params.id,
      details: { name: existing.name },
    })
    return response.ok(await getState(congregationId))
  }

  async auditLogs({ response }: HttpContext) {
    const rows = await db.from('audit_logs').orderBy('created_at', 'desc').limit(200)

    const data = rows.map((row) => ({
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
    const payload = await request.validateUsing(classValidator)
    const name = safeString(payload.name)
    const description = safeString(payload.description)
    const requestedStartDate = safeString(payload.startDate)
    const requestedWeekday = payload.weekday
    const lessonWeekday =
      requestedWeekday === undefined || requestedWeekday === null ? 0 : Number(requestedWeekday)
    const lessonTime = safeString(payload.lessonTime) || '09:00'
    const startDate = requestedStartDate || nearestWeekdayDate(lessonWeekday)
    const congregationId = getCongregationId(request)

    if (!name) {
      return response.badRequest({ message: 'Nome da turma eh obrigatorio.' })
    }
    if (!Number.isInteger(lessonWeekday) || lessonWeekday < 0 || lessonWeekday > 6) {
      return response.badRequest({ message: 'Selecione um dia da semana válido para a turma.' })
    }
    if (!isValidLessonTime(lessonTime))
      return response.badRequest({ message: 'Informe um horário válido para as aulas da turma.' })
    if (
      !isValidIsoDate(startDate) ||
      new Date(`${startDate}T12:00:00Z`).getUTCDay() !== lessonWeekday
    ) {
      return response.badRequest({
        message: 'A data de início deve corresponder ao dia semanal escolhido para a turma.',
      })
    }
    if (!(await hasCongregation(congregationId))) {
      return response.badRequest({ message: 'A congregação selecionada não existe.' })
    }

    const classId = id('class')
    await db.table('classes').insert({
      id: classId,
      name,
      description: description || null,
      start_date: startDate,
      lesson_weekday: lessonWeekday,
      lesson_time: lessonTime,
      congregation_id: congregationId,
    })

    await writeAuditLog(db, request, {
      action: 'class.create',
      entityType: 'class',
      entityId: classId,
      details: { name, description },
    })
    return response.ok(await getState(getCongregationId(request)))
  }

  async updateClassStartDate({ request, params, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    const payload = await request.validateUsing(classStartDateValidator)
    const startDate = safeString(payload.startDate)
    const classRow = await db
      .from('classes')
      .where('id', params.id)
      .where('congregation_id', congregationId)
      .whereNull('deleted_at')
      .first()
    if (!classRow) return response.notFound({ message: 'Turma não encontrada nesta congregação.' })
    const requestedWeekday = payload.weekday
    const lessonWeekday =
      requestedWeekday === undefined || requestedWeekday === null
        ? Number(classRow.lesson_weekday ?? 0)
        : Number(requestedWeekday)
    const requestedLessonTime = payload.lessonTime
    const lessonTime =
      requestedLessonTime === undefined ||
      requestedLessonTime === null ||
      requestedLessonTime === ''
        ? String(classRow.lesson_time || '09:00')
        : safeString(requestedLessonTime)
    if (!Number.isInteger(lessonWeekday) || lessonWeekday < 0 || lessonWeekday > 6) {
      return response.badRequest({ message: 'Selecione um dia da semana válido para a turma.' })
    }
    if (
      !isValidIsoDate(startDate) ||
      new Date(`${startDate}T12:00:00Z`).getUTCDay() !== lessonWeekday
    ) {
      return response.badRequest({
        message: 'A data de início deve corresponder ao dia semanal escolhido para a turma.',
      })
    }
    if (!isValidLessonTime(lessonTime))
      return response.badRequest({ message: 'Informe um horário válido para as aulas da turma.' })
    const previousStartDate = normalizeDateForClient(classRow.start_date) || startDate
    const previousTime = new Date(`${previousStartDate}T00:00:00Z`).getTime()
    const nextTime = new Date(`${startDate}T00:00:00Z`).getTime()
    const dayShift = Math.round((nextTime - previousTime) / 86_400_000)
    await db.transaction(async (trx) => {
      await trx
        .from('classes')
        .where('id', params.id)
        .where('congregation_id', congregationId)
        .update({
          start_date: startDate,
          lesson_weekday: lessonWeekday,
          lesson_time: lessonTime,
          updated_at: new Date(),
        })
      if (dayShift) {
        const scheduleRows = await trx
          .from('discipleship_schedule')
          .select('id', 'lesson_date')
          .where('class_id', params.id)
          .where('congregation_id', congregationId)
        for (const lesson of scheduleRows) {
          await trx
            .from('discipleship_schedule')
            .where('id', lesson.id)
            .update({
              lesson_date: addDaysToIsoDate(normalizeDateForClient(lesson.lesson_date), 10_000),
            })
        }
        for (const lesson of scheduleRows) {
          await trx
            .from('discipleship_schedule')
            .where('id', lesson.id)
            .update({
              lesson_date: addDaysToIsoDate(normalizeDateForClient(lesson.lesson_date), dayShift),
              updated_at: new Date(),
            })
        }
      }
    })
    await writeAuditLog(db, request, {
      action: 'class.start_date.update',
      entityType: 'class',
      entityId: String(params.id),
      details: { previousStartDate, startDate, dayShift },
    })
    return response.ok(await getState(congregationId))
  }

  async deleteClass({ request, params, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    const existing = await db
      .from('classes')
      .where('id', params.id)
      .where('congregation_id', congregationId)
      .first()
    if (!existing) return response.notFound({ message: 'Turma não encontrada nesta congregação.' })
    const deletedAt = new Date()

    await db
      .from('classes')
      .where('id', params.id)
      .where('congregation_id', congregationId)
      .update({ deleted_at: deletedAt })
    await db.from('class_students').where('class_id', params.id).update({ deleted_at: deletedAt })

    const recordRows = await db
      .from('attendance_records')
      .select('id')
      .where('class_id', params.id)
      .whereNull('attendance_records.deleted_at')
    const recordIds = recordRows.map((row) => String(row.id))

    if (recordIds.length > 0) {
      await db.from('attendance_records').whereIn('id', recordIds).update({ deleted_at: deletedAt })
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

    return response.ok(await getState(getCongregationId(request)))
  }

  async saveClassScale({ request, params, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    const classRow = await db
      .from('classes')
      .where('id', params.id)
      .where('congregation_id', congregationId)
      .whereNull('deleted_at')
      .first()
    if (!classRow) return response.notFound({ message: 'Turma não encontrada nesta congregação.' })
    const lessons = request.input('lessons')
    if (!Array.isArray(lessons))
      return response.badRequest({ message: 'A escala enviada é inválida.' })
    const existingRows = await db
      .from('discipleship_schedule')
      .select('*')
      .where('class_id', params.id)
      .where('congregation_id', congregationId)
    const existingById = new Map(existingRows.map((row) => [String(row.id), row]))
    const lessonWeekday = Number(classRow.lesson_weekday ?? 0)
    const normalized: Array<{
      id: string
      congregation_id: string
      class_id: string
      lesson_date: string
      title: string
      teacher_id: string | null
      justification: string | null
      content: string | null
      lesson_time: string | null
    }> = []
    const seenDates = new Set<string>()
    const seenIds = new Set<string>()
    for (const lesson of lessons) {
      const date = safeString(lesson?.date)
      const title = safeString(lesson?.title)
      const teacherId = safeString(lesson?.teacherId)
      const lessonId = safeString(lesson?.id)
      const previous = lessonId ? existingById.get(lessonId) : undefined
      if (lessonId && seenIds.has(lessonId))
        return response.badRequest({
          message: 'Uma aula não pode aparecer duas vezes na mesma escala.',
        })
      if (lessonId) seenIds.add(lessonId)
      const justification = safeString(lesson?.justification)
      const { content, lessonTime, id: preservedId } = preserveScheduleFields(lesson, previous)
      const previousDate = previous ? normalizeDateForClient(previous.lesson_date) : undefined
      if (!isValidIsoDate(date) || !title) {
        return response.badRequest({
          message: 'Cada aula precisa ter um título e uma data válida.',
        })
      }
      if (lessonId && previousDate === undefined)
        return response.badRequest({ message: 'Uma das aulas não pertence à escala desta turma.' })
      const dateChanged = previousDate !== undefined && previousDate !== date
      const changedWeekday = new Date(`${date}T12:00:00Z`).getUTCDay() !== lessonWeekday
      if ((dateChanged || changedWeekday) && !justification)
        return response.badRequest({
          message:
            'Informe uma justificativa ao alterar a data da aula ou transferi-la para outro dia da semana.',
        })
      if (lessonTime && !isValidLessonTime(lessonTime))
        return response.badRequest({ message: 'Informe um horário válido para a aula.' })
      if (content.length > 10000)
        return response.badRequest({
          message: 'O conteúdo da lição deve ter no máximo 10.000 caracteres.',
        })
      if (seenDates.has(date))
        return response.badRequest({ message: 'Não pode haver mais de uma aula na mesma data.' })
      seenDates.add(date)
      if (
        teacherId &&
        !(await db
          .from('teachers')
          .where('id', teacherId)
          .where('congregation_id', congregationId)
          .whereNull('deleted_at')
          .first())
      ) {
        return response.badRequest({ message: 'Selecione um professor válido desta congregação.' })
      }
      normalized.push({
        id: preservedId || id('schedule'),
        congregation_id: congregationId,
        class_id: String(params.id),
        lesson_date: date,
        title,
        teacher_id: teacherId || null,
        justification: justification || null,
        content: content || null,
        lesson_time: lessonTime || null,
      })
    }
    await db.transaction(async (trx) => {
      await trx
        .from('discipleship_schedule')
        .where('class_id', params.id)
        .where('congregation_id', congregationId)
        .delete()
      if (normalized.length) await trx.table('discipleship_schedule').multiInsert(normalized)
    })
    await writeAuditLog(db, request, {
      action: 'discipleship_schedule.update',
      entityType: 'class',
      entityId: String(params.id),
      details: { lessonCount: normalized.length },
    })
    return response.ok(await getState(congregationId))
  }

  async exportClassScale({ request, params, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    const classRow = await db
      .from('classes')
      .where('id', params.id)
      .where('congregation_id', congregationId)
      .whereNull('deleted_at')
      .first()
    if (!classRow) return response.notFound({ message: 'Turma não encontrada nesta congregação.' })

    const [congregation, lessonRows, cycleRows] = await Promise.all([
      db
        .from('congregations')
        .select('id', 'name', 'area', 'sector', 'logo_data', 'justification_contact')
        .where('id', congregationId)
        .first(),
      db
        .from('discipleship_schedule as schedule')
        .leftJoin('teachers as teacher', 'teacher.id', 'schedule.teacher_id')
        .leftJoin('discipleship_lessons as catalog', 'catalog.title', 'schedule.title')
        .leftJoin('discipleship_cycles as cycle', 'cycle.id', 'catalog.cycle_id')
        .select(
          'schedule.lesson_date',
          'schedule.lesson_time',
          'schedule.title',
          'schedule.justification',
          'teacher.name as teacher_name',
          'cycle.id as cycle_id',
          'cycle.name as cycle_name',
          'cycle.color as cycle_color'
        )
        .where('schedule.class_id', params.id)
        .where('schedule.congregation_id', congregationId)
        .orderBy('schedule.lesson_date', 'asc'),
      db
        .from('discipleship_cycles')
        .select('id', 'name', 'color', 'position')
        .orderBy('position', 'asc'),
    ])

    return response.ok({
      congregation: {
        name: congregation?.name || '',
        area: congregation?.area || '',
        sector: congregation?.sector || '',
        logoData: congregation?.logo_data || '',
        justificationContact: congregation?.justification_contact || '',
      },
      class: {
        id: String(classRow.id),
        name: classRow.name,
        startDate: normalizeDateForClient(classRow.start_date),
        lessonWeekday: Number(classRow.lesson_weekday ?? 0),
        lessonTime: String(classRow.lesson_time || '09:00'),
      },
      cycles: cycleRows.map((cycle) => ({
        id: String(cycle.id),
        name: cycle.name,
        color: cycle.color,
        position: Number(cycle.position),
      })),
      lessons: lessonRows.map((lesson) => ({
        date: normalizeDateForClient(lesson.lesson_date),
        time: String(lesson.lesson_time || classRow.lesson_time || '09:00'),
        title: lesson.title,
        teacher: lesson.teacher_name || 'A definir',
        justification: lesson.justification || '',
        cycleId: lesson.cycle_id ? String(lesson.cycle_id) : '',
        cycleName: lesson.cycle_name || 'Sem ciclo',
        cycleColor: lesson.cycle_color || '#64748B',
      })),
    })
  }

  async createStudent({ request, response }: HttpContext) {
    const payload = await request.validateUsing(studentValidator)
    const name = safeString(payload.name)
    const congregationId = getCongregationId(request)

    if (!name) {
      return response.badRequest({ message: 'Nome do aluno eh obrigatorio.' })
    }
    if (!(await hasCongregation(congregationId))) {
      return response.badRequest({ message: 'A congregação selecionada não existe.' })
    }

    const classIds = normalizeIdArray(payload.classIds)
    if (classIds.length > 0) {
      const classes = await db
        .from('classes')
        .whereIn('id', classIds)
        .where('congregation_id', congregationId)
        .whereNull('deleted_at')
      if (classes.length !== classIds.length) {
        return response.badRequest({
          message: 'Todas as turmas devem pertencer à congregação selecionada.',
        })
      }
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
      congregation_id: congregationId,
    })

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
    return response.ok(await getState(getCongregationId(request)))
  }

  async deleteStudent({ request, params, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    const existing = await db
      .from('students')
      .where('id', params.id)
      .where('congregation_id', congregationId)
      .first()
    if (!existing) return response.notFound({ message: 'Aluno não encontrado nesta congregação.' })
    const deletedAt = new Date()

    await db
      .from('students')
      .where('id', params.id)
      .where('congregation_id', congregationId)
      .update({ deleted_at: deletedAt })
    await db.from('class_students').where('student_id', params.id).update({ deleted_at: deletedAt })

    await writeAuditLog(db, request, {
      action: 'student.delete',
      entityType: 'student',
      entityId: params.id,
      details: { name: existing?.name ?? '' },
    })

    return response.ok(await getState(getCongregationId(request)))
  }

  async assignStudentToClass({ request, response }: HttpContext) {
    const { classId, studentId } = await request.validateUsing(classStudentLinkValidator)
    const congregationId = getCongregationId(request)

    if (!classId || !studentId) {
      return response.badRequest({ message: 'classId e studentId sao obrigatorios.' })
    }
    const [classGroup, student] = await Promise.all([
      db.from('classes').where('id', classId).where('congregation_id', congregationId).first(),
      db.from('students').where('id', studentId).where('congregation_id', congregationId).first(),
    ])
    if (!classGroup || !student)
      return response.badRequest({
        message: 'Turma e aluno devem pertencer à congregação selecionada.',
      })

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
      await db.from('class_students').where('id', alreadyLinked.id).update({ deleted_at: null })

      await writeAuditLog(db, request, {
        action: 'class_students.assign',
        entityType: 'class_students',
        entityId: classId,
        details: { studentId, restored: true },
      })
    }

    return response.ok(await getState(getCongregationId(request)))
  }

  async removeStudentFromClass({ request, response }: HttpContext) {
    const { classId, studentId } = await request.validateUsing(classStudentLinkValidator)
    const congregationId = getCongregationId(request)

    if (!classId || !studentId) {
      return response.badRequest({ message: 'classId e studentId sao obrigatorios.' })
    }
    const classGroup = await db
      .from('classes')
      .where('id', classId)
      .where('congregation_id', congregationId)
      .first()
    if (!classGroup)
      return response.notFound({ message: 'Turma não encontrada nesta congregação.' })

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

    return response.ok(await getState(getCongregationId(request)))
  }

  async createTeacher({ request, response }: HttpContext) {
    const payload = await request.validateUsing(teacherValidator)
    const name = safeString(payload.name)
    const phone = safeString(payload.phone)
    const gender = payload.gender || 'male'
    const congregationId = getCongregationId(request)

    if (!name) {
      return response.badRequest({ message: 'Nome do professor eh obrigatorio.' })
    }
    if (!['male', 'female'].includes(gender)) {
      return response.badRequest({ message: 'Selecione se o professor é homem ou mulher.' })
    }
    if (!(await hasCongregation(congregationId))) {
      return response.badRequest({ message: 'A congregação selecionada não existe.' })
    }

    const teacherId = id('teacher')
    await db.table('teachers').insert({
      id: teacherId,
      name,
      phone: phone || null,
      gender,
      congregation_id: congregationId,
    })

    await writeAuditLog(db, request, {
      action: 'teacher.create',
      entityType: 'teacher',
      entityId: teacherId,
      details: { name, gender },
    })
    return response.ok(await getState(getCongregationId(request)))
  }

  async updateTeacher({ request, params, response }: HttpContext) {
    const { gender } = await request.validateUsing(teacherGenderValidator)
    const congregationId = getCongregationId(request)
    const existing = await db
      .from('teachers')
      .where('id', params.id)
      .where('congregation_id', congregationId)
      .whereNull('deleted_at')
      .first()
    if (!existing)
      return response.notFound({ message: 'Professor não encontrado nesta congregação.' })
    await db
      .from('teachers')
      .where('id', params.id)
      .where('congregation_id', congregationId)
      .update({ gender, updated_at: new Date() })
    await writeAuditLog(db, request, {
      action: 'teacher.update_gender',
      entityType: 'teacher',
      entityId: String(params.id),
      details: { gender },
    })
    return response.ok(await getState(congregationId))
  }

  async deleteTeacher({ request, params, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    const existing = await db
      .from('teachers')
      .where('id', params.id)
      .where('congregation_id', congregationId)
      .first()
    if (!existing)
      return response.notFound({ message: 'Professor não encontrado nesta congregação.' })
    await db
      .from('teachers')
      .where('id', params.id)
      .where('congregation_id', congregationId)
      .update({ deleted_at: new Date() })

    await writeAuditLog(db, request, {
      action: 'teacher.delete',
      entityType: 'teacher',
      entityId: params.id,
      details: { name: existing?.name ?? '' },
    })

    return response.ok(await getState(getCongregationId(request)))
  }

  async saveAttendance({ request, response }: HttpContext) {
    const payload = await request.validateUsing(attendanceValidator)
    const attendanceId = safeString(payload.id) || id('attendance')
    const classId = safeString(payload.classId)
    const lessonName = safeString(payload.lessonName)
    const teacherIds = normalizeIdArray(payload.teacherIds)
    const date = safeString(payload.date)
    const notes = safeString(payload.notes)
    const entries = Array.isArray(payload.entries) ? payload.entries : []
    const congregationId = getCongregationId(request)

    if (!classId || !lessonName || !date || teacherIds.length === 0) {
      return response.badRequest({
        message: 'classId, lessonName, date e teacherIds sao obrigatorios.',
      })
    }
    const [classGroup, validTeachers] = await Promise.all([
      db
        .from('classes')
        .where('id', classId)
        .where('congregation_id', congregationId)
        .whereNull('deleted_at')
        .first(),
      db
        .from('teachers')
        .whereIn('id', teacherIds)
        .where('congregation_id', congregationId)
        .whereNull('deleted_at'),
    ])
    if (!classGroup || validTeachers.length !== teacherIds.length) {
      return response.badRequest({
        message: 'Turma e professores devem pertencer à congregação selecionada.',
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
        const existingRecord = await trx
          .from('attendance_records')
          .innerJoin('classes', 'classes.id', 'attendance_records.class_id')
          .where('attendance_records.id', attendanceId)
          .where('classes.congregation_id', congregationId)
          .first()
        if (!existingRecord) throw new Error('Chamada não encontrada nesta congregação.')
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
          const status: AttendanceStatus = entry.status
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

      const classStudentRows = await trx
        .from('class_students')
        .select('student_id')
        .where('class_id', classId)
        .whereNull('deleted_at')
      const validStudentIds = new Set(classStudentRows.map((row) => String(row.student_id)))
      if (normalizedEntries.some((entry) => !validStudentIds.has(entry.student_id))) {
        throw new Error('Os participantes da chamada devem estar vinculados à turma selecionada.')
      }
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
      return response.ok(await getState(getCongregationId(request)))
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  async deleteAttendance({ request, params, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    const existing = await db
      .from('attendance_records')
      .select('attendance_records.*')
      .innerJoin('classes', 'classes.id', 'attendance_records.class_id')
      .where('attendance_records.id', params.id)
      .where('classes.congregation_id', congregationId)
      .first()
    if (!existing)
      return response.notFound({ message: 'Chamada não encontrada nesta congregação.' })
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

    return response.ok(await getState(getCongregationId(request)))
  }
}
