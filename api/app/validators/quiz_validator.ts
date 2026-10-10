import vine from '@vinejs/vine'

export const quizListValidator = vine.compile(
  vine.object({
    filters: vine.object({
      page: vine.number().min(1).optional(),
      limit: vine.number().min(1).max(100).optional(),
    }),
  })
)

export const generateQuizValidator = vine.compile(
  vine.object({
    provider: vine.enum(['chatgpt', 'deepseek']).optional(),
    questionCount: vine.number().min(1).max(30),
  })
)
