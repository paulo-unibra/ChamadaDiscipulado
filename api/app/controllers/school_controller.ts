import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

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

type NewConvertPayload = {
  eventName: string
  name: string
  conversionDate: string
  cep?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  birthDate?: string
  contactPhone?: string
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
const DEFAULT_CONGREGATION_ID = 'cong-zumbi-pacheco-1'

type AuditEntry = {
  action: string
  entityType: string
  entityId?: string
  details?: Record<string, unknown>
}

async function writeAuditLog(connection: any, request: HttpContext['request'], entry: AuditEntry) {
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

function nearestSundayDate() {
  const now = new Date()
  const daysSinceSunday = now.getDay()
  const daysUntilSunday = (7 - daysSinceSunday) % 7
  const offset = daysSinceSunday < daysUntilSunday ? -daysSinceSunday : daysUntilSunday
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offset)).toISOString().slice(0, 10)
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
    db.from('discipleship_schedule').select('*').where('congregation_id', congregationId).orderBy('lesson_date', 'asc'),
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
    await db.from('classes').whereIn('id', legacyAutoClassIds).update({ deleted_at: new Date() })
  }

  const legacyAutoClassIdSet = new Set(legacyAutoClassIds)

  const classes = classesRows
    .filter((row) => !legacyAutoClassIdSet.has(String(row.id)))
    .map((row) => ({
      id: String(row.id),
      name: row.name,
       description: row.description ?? '',
       startDate: normalizeDateForClient(row.start_date) ||
         scheduleRows.filter((lesson) => String(lesson.class_id) === String(row.id)).map((lesson) => normalizeDateForClient(lesson.lesson_date)).sort()[0] ||
         attendanceRows.filter((lesson) => String(lesson.class_id) === String(row.id)).map((lesson) => normalizeDateForClient(lesson.date)).sort()[0] ||
         nearestSundayDate(),
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

  return {
    congregations: congregationsRows.map((row) => ({
      id: String(row.id),
      name: row.name,
      area: row.area ?? '',
      sector: row.sector ?? '',
      logoData: row.logo_data ?? '',
      createdAt: row.created_at,
    })),
    activeCongregationId: congregationId,
    classes,
    discipleshipLessons: [...DISCIPLESHIP_LESSONS],
    students,
    teachers,
    attendanceRecords,
    newConverts,
    discipleshipSchedule: scheduleRows.map((row) => ({
      id: String(row.id),
      classId: String(row.class_id),
      date: normalizeDateForClient(row.lesson_date),
      title: row.title,
      teacherId: row.teacher_id ? String(row.teacher_id) : '',
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

  async state({ request, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    if (!(await hasCongregation(congregationId))) {
      return response.badRequest({ message: 'A congregação selecionada não existe.' })
    }
    return response.ok(await getState(congregationId))
  }

  async createCongregation({ request, response }: HttpContext) {
    const name = safeString(request.input('name'))
    const area = safeString(request.input('area'))
    const sector = safeString(request.input('sector'))
    if (!name) {
      return response.badRequest({ message: 'O nome da congregação é obrigatório.' })
    }

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
    const name = safeString(request.input('name'))
    const area = safeString(request.input('area'))
    const sector = safeString(request.input('sector'))
    const logoData = safeString(request.input('logoData'))
    const congregationId = String(params.id)
    const existing = await db.from('congregations').where('id', congregationId).first()
    if (!existing) return response.notFound({ message: 'Congregação não encontrada.' })
    if (!name) return response.badRequest({ message: 'O nome da congregação é obrigatório.' })
    if (logoData && (logoData.length > 1_800_000 || !/^data:image\/(?:png|jpe?g|webp);base64,[A-Za-z0-9+/]+=*$/.test(logoData))) {
      return response.badRequest({ message: 'A logo deve ser uma imagem PNG, JPEG ou WebP de até 1,8 MB após a compressão.' })
    }
    await db.from('congregations').where('id', congregationId).update({ name, area, sector, logo_data: logoData || null, updated_at: new Date() })
    await writeAuditLog(db, request, { action: 'congregation.update', entityType: 'congregation', entityId: congregationId, details: { name, area, sector, hasLogo: Boolean(logoData) } })
    return response.ok(await getState(getCongregationId(request)))
  }

  async createNewConvert({ request, response }: HttpContext) {
    const payload = request.body() as NewConvertPayload
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
    const payload = request.body() as NewConvertPayload
    const congregationId = getCongregationId(request)
    const eventName = safeString(payload.eventName)
    const name = safeString(payload.name)
    const conversionDate = safeString(payload.conversionDate)
    const birthDate = safeString(payload.birthDate)
    const cep = safeString(payload.cep).replace(/\D/g, '')

    if (!name || !eventName || !conversionDate) {
      return response.badRequest({ message: 'Atividade, nome e data da conversão são obrigatórios.' })
    }
    if (!CONVERSION_EVENTS.includes(eventName as (typeof CONVERSION_EVENTS)[number])) {
      return response.badRequest({ message: 'Selecione uma atividade válida.' })
    }
    if (!isValidIsoDate(conversionDate) || (birthDate && !isValidIsoDate(birthDate))) {
      return response.badRequest({ message: 'Informe datas válidas para conversão e nascimento.' })
    }
    if (birthDate && birthDate > conversionDate) {
      return response.badRequest({ message: 'A data de nascimento não pode ser posterior à conversão.' })
    }
    if (cep && cep.length !== 8) return response.badRequest({ message: 'O CEP deve conter 8 dígitos.' })

    const existing = await db.from('new_converts')
      .where('id', params.id)
      .where('congregation_id', congregationId)
      .whereNull('deleted_at')
      .first()
    if (!existing) return response.notFound({ message: 'Cadastro não encontrado nesta congregação.' })

    await db.from('new_converts')
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
    await db.from('google_forms_sent_items')
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
    const requestedStartDate = safeString(request.input('startDate'))
    const startDate = requestedStartDate || nearestSundayDate()
    const congregationId = getCongregationId(request)

    if (!name) {
      return response.badRequest({ message: 'Nome da turma eh obrigatorio.' })
    }
    if (!isValidIsoDate(startDate) || new Date(`${startDate}T12:00:00Z`).getUTCDay() !== 0) {
      return response.badRequest({ message: 'A data de início da turma deve ser um domingo válido.' })
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
    const startDate = safeString(request.input('startDate'))
    const classRow = await db.from('classes').where('id', params.id).where('congregation_id', congregationId).whereNull('deleted_at').first()
    if (!classRow) return response.notFound({ message: 'Turma não encontrada nesta congregação.' })
    if (!isValidIsoDate(startDate) || new Date(`${startDate}T12:00:00Z`).getUTCDay() !== 0) {
      return response.badRequest({ message: 'A data de início da turma deve ser um domingo válido.' })
    }
    const previousStartDate = normalizeDateForClient(classRow.start_date) || startDate
    const previousTime = new Date(`${previousStartDate}T00:00:00Z`).getTime()
    const nextTime = new Date(`${startDate}T00:00:00Z`).getTime()
    const dayShift = Math.round((nextTime - previousTime) / 86_400_000)
    await db.transaction(async (trx) => {
      await trx.from('classes').where('id', params.id).where('congregation_id', congregationId).update({ start_date: startDate, updated_at: new Date() })
      if (dayShift) {
        const scheduleRows = await trx.from('discipleship_schedule').select('id', 'lesson_date').where('class_id', params.id).where('congregation_id', congregationId)
        for (const lesson of scheduleRows) {
          await trx.from('discipleship_schedule').where('id', lesson.id).update({ lesson_date: addDaysToIsoDate(normalizeDateForClient(lesson.lesson_date), 10_000) })
        }
        for (const lesson of scheduleRows) {
          await trx.from('discipleship_schedule').where('id', lesson.id).update({ lesson_date: addDaysToIsoDate(normalizeDateForClient(lesson.lesson_date), dayShift), updated_at: new Date() })
        }
      }
    })
    await writeAuditLog(db, request, { action: 'class.start_date.update', entityType: 'class', entityId: String(params.id), details: { previousStartDate, startDate, dayShift } })
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
    const recordIds = recordRows.map((row: any) => String(row.id))

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
    const classRow = await db.from('classes').where('id', params.id).where('congregation_id', congregationId).whereNull('deleted_at').first()
    if (!classRow) return response.notFound({ message: 'Turma não encontrada nesta congregação.' })
    const lessons = request.input('lessons')
    if (!Array.isArray(lessons)) return response.badRequest({ message: 'A escala enviada é inválida.' })
    const normalized: Array<{
      id: string
      congregation_id: string
      class_id: string
      lesson_date: string
      title: string
      teacher_id: string | null
    }> = []
    const seenDates = new Set<string>()
    for (const lesson of lessons) {
      const date = safeString(lesson?.date)
      const title = safeString(lesson?.title)
      const teacherId = safeString(lesson?.teacherId)
      if (!isValidIsoDate(date) || new Date(`${date}T12:00:00Z`).getUTCDay() !== 0 || !title) {
        return response.badRequest({ message: 'Cada aula precisa ter um título e uma data de domingo válida.' })
      }
      if (seenDates.has(date)) return response.badRequest({ message: 'Não pode haver mais de uma aula na mesma data.' })
      seenDates.add(date)
      if (teacherId && !(await db.from('teachers').where('id', teacherId).where('congregation_id', congregationId).whereNull('deleted_at').first())) {
        return response.badRequest({ message: 'Selecione um professor válido desta congregação.' })
      }
      normalized.push({ id: id('schedule'), congregation_id: congregationId, class_id: String(params.id), lesson_date: date, title, teacher_id: teacherId || null })
    }
    await db.transaction(async (trx) => {
      await trx.from('discipleship_schedule').where('class_id', params.id).where('congregation_id', congregationId).delete()
      if (normalized.length) await trx.table('discipleship_schedule').multiInsert(normalized)
    })
    await writeAuditLog(db, request, { action: 'discipleship_schedule.update', entityType: 'class', entityId: String(params.id), details: { lessonCount: normalized.length } })
    return response.ok(await getState(congregationId))
  }

  async createStudent({ request, response }: HttpContext) {
    const payload = request.body() as StudentPayload
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
    const classId = safeString(request.input('classId'))
    const studentId = safeString(request.input('studentId'))
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
    const classId = safeString(request.input('classId'))
    const studentId = safeString(request.input('studentId'))
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
    const name = safeString(request.input('name'))
    const phone = safeString(request.input('phone'))
    const congregationId = getCongregationId(request)

    if (!name) {
      return response.badRequest({ message: 'Nome do professor eh obrigatorio.' })
    }
    if (!(await hasCongregation(congregationId))) {
      return response.badRequest({ message: 'A congregação selecionada não existe.' })
    }

    const teacherId = id('teacher')
    await db.table('teachers').insert({
      id: teacherId,
      name,
      phone: phone || null,
      congregation_id: congregationId,
    })

    await writeAuditLog(db, request, {
      action: 'teacher.create',
      entityType: 'teacher',
      entityId: teacherId,
      details: { name },
    })
    return response.ok(await getState(getCongregationId(request)))
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
    const payload = request.body() as AttendancePayload & { id?: string }
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

      const classStudentRows = await trx
        .from('class_students')
        .select('student_id')
        .where('class_id', classId)
        .whereNull('deleted_at')
      const validStudentIds = new Set(classStudentRows.map((row: any) => String(row.student_id)))
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
