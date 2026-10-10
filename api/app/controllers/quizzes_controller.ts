import { randomUUID } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { getCongregationId } from '#services/google_forms_service'
import { getAiApiKey, type QuizAiProvider } from '#services/chatgpt_service'
import GenerateQuizJob from '#jobs/generate_quiz_job'
import { generateQuizValidator, quizListValidator } from '#validators/quiz_validator'

function parseQuestions(value: unknown) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return []
    }
  }
  return value || []
}

type QuizDbRow = {
  id: string
  class_id: string
  schedule_id: string
  lesson_title: string
  provider: string | null
  question_count: number
  status: string
  questions: unknown
  error_message: string | null
  created_at: Date
}

function serializeQuiz(row: QuizDbRow) {
  return {
    id: String(row.id),
    classId: String(row.class_id),
    scheduleId: String(row.schedule_id),
    lessonTitle: row.lesson_title,
    provider: row.provider || 'chatgpt',
    questionCount: Number(row.question_count),
    status: row.status,
    questions: parseQuestions(row.questions),
    error: row.error_message || '',
    createdAt: row.created_at,
  }
}

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
    const classRow = await db
      .from('classes')
      .where('id', params.classId)
      .where('congregation_id', congregationId)
      .whereNull('deleted_at')
      .first()
    if (!classRow) return response.notFound({ message: 'Turma não encontrada nesta congregação.' })
    const lesson = await db
      .from('discipleship_schedule')
      .where('id', params.scheduleId)
      .where('class_id', params.classId)
      .where('congregation_id', congregationId)
      .first()
    if (!lesson) return response.notFound({ message: 'Lição não encontrada nesta escala.' })
    const content = typeof lesson.content === 'string' ? lesson.content.trim() : ''
    if (!content)
      return response.badRequest({
        message: 'Adicione o conteúdo da lição antes de gerar um questionário.',
      })
    const { provider: requestedProvider = 'chatgpt', questionCount } =
      await request.validateUsing(generateQuizValidator)
    const provider: QuizAiProvider = requestedProvider
    const configuredApiKey = await getAiApiKey(congregationId, provider)
    if (!configuredApiKey) {
      return response.badRequest({
        message: `Configure a integração do ${provider === 'deepseek' ? 'DeepSeek' : 'ChatGPT'} antes de gerar questionários.`,
      })
    }
    const jobId = randomUUID()
    const now = new Date()
    await db.table('discipleship_quizzes').insert({
      id: jobId,
      congregation_id: congregationId,
      class_id: String(params.classId),
      schedule_id: String(params.scheduleId),
      lesson_title: lesson.title,
      provider,
      question_count: questionCount,
      status: 'pending',
      questions: null,
      error_message: null,
      created_at: now,
      updated_at: now,
    })
    const pendingQuiz = {
      id: jobId,
      classId: String(params.classId),
      scheduleId: String(params.scheduleId),
      lessonTitle: lesson.title,
      provider,
      questionCount,
      status: 'pending',
      questions: [],
      error: '',
      createdAt: now,
    }
    try {
      await GenerateQuizJob.dispatch({ quizId: jobId }).toQueue('quiz-generation')
    } catch (error) {
      await db.from('discipleship_quizzes').where('id', jobId).where('status', 'pending').update({
        status: 'failed',
        error_message: 'Não foi possível enviar a geração para a fila.',
        updated_at: new Date(),
      })
      throw error
    }
    return response.accepted({ quiz: pendingQuiz })
  }
}
