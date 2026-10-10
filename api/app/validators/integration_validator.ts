import vine from '@vinejs/vine'

export const apiKeyValidator = vine.compile(
  vine.object({
    apiKey: vine.string().trim().maxLength(2000),
  })
)

export const markSentValidator = vine.compile(
  vine.object({
    sectionId: vine.enum(['new-converts', 'students', 'classes', 'teachers', 'attendance']),
    recordId: vine.string().trim().minLength(1).maxLength(36),
  })
)

export const saveIntegrationValidator = vine.compile(
  vine.object({
    enabled: vine.boolean(),
    formId: vine.string().trim().maxLength(2048),
    sections: vine.object({}).allowUnknownProperties(),
    fields: vine.object({}).allowUnknownProperties(),
    mappings: vine.object({}).allowUnknownProperties(),
    fixedAnswers: vine.object({}).allowUnknownProperties(),
  })
)
