import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { getCongregationId } from '#services/google_forms_service'
import { generateQuiz, serializeQuiz, QuizValidationError } from '#services/quiz_service'
import { generateQuizValidator, quizListValidator } from '#validators/quiz_validator'

export default class QuizzesController {
  async list({ request, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    const { filters } = await quizListValidator.validate({ filters: request.qs() })
    const page = filters.page ?? 1
    const limit = filters.limit ?? 25
    const rows = await db
      .from('discipleship_quizzes')
      .where('congregation_id', congregationId)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .offset((page - 1) * limit)
      .limit(limit)
    const [{ total }] = await db
      .from('discipleship_quizzes')
      .where('congregation_id', congregationId)
      .count('* as total')
    return response.ok({ quizzes: rows.map(serializeQuiz), page, limit, total: Number(total) })
  }

  async generate({ request, params, response }: HttpContext) {
    const congregationId = getCongregationId(request)
    const { provider = 'chatgpt', questionCount } =
      await request.validateUsing(generateQuizValidator)
    try {
      const quiz = await generateQuiz(
        congregationId,
        params.classId,
        params.scheduleId,
        provider,
        questionCount
      )
      return response.accepted({ quiz })
    } catch (error) {
      if (error instanceof QuizValidationError)
        return response.status(error.status).send({ message: error.message })
      throw error
    }
  }
}
