import vine from '@vinejs/vine'

const optionalText = () => vine.string().trim().maxLength(4000).nullable().optional()

export const newConvertValidator = vine.compile(
  vine.object({
    eventName: vine.string().trim().minLength(1).maxLength(255),
    name: vine.string().trim().minLength(1).maxLength(255),
    conversionDate: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    cep: optionalText(),
    street: optionalText(),
    number: optionalText(),
    complement: optionalText(),
    neighborhood: optionalText(),
    city: optionalText(),
    state: vine.string().trim().maxLength(2).nullable().optional(),
    birthDate: vine
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    contactPhone: optionalText(),
  })
)

export const studentValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(255),
    birthDate: vine.string().maxLength(10).nullable().optional(),
    studentPhone: optionalText(),
    email: vine.string().trim().email().maxLength(254).nullable().optional(),
    guardianName: optionalText(),
    guardianPhone: optionalText(),
    address: optionalText(),
    notes: optionalText(),
    classIds: vine.array(vine.string().trim().minLength(1).maxLength(36)).maxLength(100).optional(),
  })
)

export const attendanceValidator = vine.compile(
  vine.object({
    id: vine.string().trim().maxLength(36).optional(),
    classId: vine.string().trim().minLength(1).maxLength(36),
    lessonName: vine.string().trim().minLength(1).maxLength(255),
    teacherIds: vine
      .array(vine.string().trim().minLength(1).maxLength(36))
      .minLength(1)
      .maxLength(100),
    date: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: optionalText(),
    entries: vine
      .array(
        vine.object({
          studentId: vine.string().trim().minLength(1).maxLength(36),
          status: vine.enum(['present', 'absent', 'justified', 'late']),
          note: optionalText(),
        })
      )
      .maxLength(1000),
  })
)

export const congregationValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(255),
    area: vine.string().trim().maxLength(100).nullable().optional(),
    sector: vine.string().trim().maxLength(100).nullable().optional(),
    justificationContact: vine.string().trim().maxLength(30).nullable().optional(),
    scaleMessageTemplate: vine.string().maxLength(5000).nullable().optional(),
    logoData: vine.string().maxLength(1_800_000).nullable().optional(),
  })
)

export const classValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(255),
    description: vine.string().trim().maxLength(2000).nullable().optional(),
    startDate: vine
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    weekday: vine.number().min(0).max(6).optional(),
    lessonTime: vine
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
  })
)

export const classStudentLinkValidator = vine.compile(
  vine.object({
    classId: vine.string().trim().minLength(1).maxLength(36),
    studentId: vine.string().trim().minLength(1).maxLength(36),
  })
)

export const teacherValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(255),
    phone: vine.string().trim().maxLength(40).nullable().optional(),
    gender: vine.enum(['male', 'female']).optional(),
  })
)

export const teacherGenderValidator = vine.compile(
  vine.object({ gender: vine.enum(['male', 'female']) })
)

export const classStartDateValidator = vine.compile(
  vine.object({
    startDate: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    weekday: vine.number().min(0).max(6).optional(),
    lessonTime: vine
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
  })
)
