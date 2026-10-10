import { randomUUID } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { getCongregationId } from '#services/google_forms_service'
import { createQuizQuestions, getAiApiKey, type QuizAiProvider } from '#services/chatgpt_service'
import { publishQuizUpdate } from '#services/quiz_websocket_service'

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

function serializeQuiz(row: any) {
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
    const rows = await db
      .from('discipleship_quizzes')
      .where('congregation_id', congregationId)
      .orderBy('created_at', 'desc')
    return response.ok({ quizzes: rows.map(serializeQuiz) })
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
    if (!content) return response.badRequest({ message: 'Adicione o conteúdo da lição antes de gerar um questionário.' })
    const requestedProvider = request.input('provider') ?? 'chatgpt'
    if (requestedProvider !== 'chatgpt' && requestedProvider !== 'deepseek') {
      return response.badRequest({ message: 'Selecione uma integração de IA válida.' })
    }
    const provider = requestedProvider as QuizAiProvider
    const configuredApiKey = await getAiApiKey(congregationId, provider)
    if (!configuredApiKey) {
      return response.badRequest({ message: `Configure a integração do ${provider === 'deepseek' ? 'DeepSeek' : 'ChatGPT'} antes de gerar questionários.` })
    }
    const questionCount = Number(request.input('questionCount'))
    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 30) {
      return response.badRequest({ message: 'Escolha de 1 a 30 questões.' })
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
    void this.generateInBackground({
      jobId,
      congregationId,
      apiKey: configuredApiKey,
      provider,
      lessonTitle: lesson.title,
      lessonContent: content,
      questionCount,
    }).catch(() => undefined)
    return response.accepted({ quiz: pendingQuiz })
  }

  private async generateInBackground({
    jobId,
    congregationId,
    apiKey,
    provider,
    lessonTitle,
    lessonContent,
    questionCount,
  }: {
    jobId: string
    congregationId: string
    apiKey: string
    provider: QuizAiProvider
    lessonTitle: string
    lessonContent: string
    questionCount: number
  }) {
    try {
      const questions = await createQuizQuestions(provider, apiKey, lessonTitle, lessonContent, questionCount)
      await db
        .from('discipleship_quizzes')
        .where('id', jobId)
        .where('congregation_id', congregationId)
        .update({ status: 'completed', questions: JSON.stringify(questions), updated_at: new Date() })
      const row = await db
        .from('discipleship_quizzes')
        .where('id', jobId)
        .where('congregation_id', congregationId)
        .first()
      if (row) publishQuizUpdate(congregationId, serializeQuiz(row))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível gerar o questionário.'
      await db
        .from('discipleship_quizzes')
        .where('id', jobId)
        .where('congregation_id', congregationId)
        .update({ status: 'failed', error_message: message.slice(0, 2000), updated_at: new Date() })
      const row = await db
        .from('discipleship_quizzes')
        .where('id', jobId)
        .where('congregation_id', congregationId)
        .first()
      if (row) publishQuizUpdate(congregationId, serializeQuiz(row))
    }
  }
}
