import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { createQuizQuestions, getAiApiKey, type QuizAiProvider } from '#services/chatgpt_service'
import { publishQuizUpdate } from '#services/quiz_websocket_service'

type GenerateQuizPayload = { quizId: string }

const options: JobOptions = {
  queue: 'quiz-generation',
  maxRetries: 3,
  timeout: '3m',
}

type QuizRow = {
  id: string
  congregation_id: string
  class_id: string
  schedule_id: string
  lesson_title: string
  provider: QuizAiProvider
  question_count: number
  status: string
}

function parseQuizRow(value: unknown): QuizRow | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  if (
    !('id' in value) ||
    typeof value.id !== 'string' ||
    !('congregation_id' in value) ||
    typeof value.congregation_id !== 'string' ||
    !('class_id' in value) ||
    typeof value.class_id !== 'string' ||
    !('schedule_id' in value) ||
    typeof value.schedule_id !== 'string' ||
    !('lesson_title' in value) ||
    typeof value.lesson_title !== 'string' ||
    !('question_count' in value) ||
    !Number.isFinite(Number(value.question_count)) ||
    !('status' in value) ||
    typeof value.status !== 'string'
  ) {
    return null
  }
  return {
    id: value.id,
    congregation_id: value.congregation_id,
    class_id: value.class_id,
    schedule_id: value.schedule_id,
    lesson_title: value.lesson_title,
    provider: 'provider' in value && value.provider === 'deepseek' ? 'deepseek' : 'chatgpt',
    question_count: Number(value.question_count),
    status: value.status,
  }
}

export default class GenerateQuizJob extends Job<GenerateQuizPayload> {
  static options = options

  async execute() {
    const quiz = parseQuizRow(
      await db.from('discipleship_quizzes').where('id', this.payload.quizId).first()
    )
    if (!quiz || quiz.status !== 'pending') return

    const lesson = await db
      .from('discipleship_schedule')
      .select('content')
      .where('id', quiz.schedule_id)
      .where('class_id', quiz.class_id)
      .where('congregation_id', quiz.congregation_id)
      .first()
    const content = typeof lesson?.content === 'string' ? lesson.content.trim() : ''
    if (!content) throw new Error('O conteúdo da lição não está mais disponível.')

    const apiKey = await getAiApiKey(quiz.congregation_id, quiz.provider)
    if (!apiKey) throw new Error('A chave da integração de IA não está mais configurada.')
    const questions = await createQuizQuestions(
      quiz.provider,
      apiKey,
      quiz.lesson_title,
      content,
      Number(quiz.question_count)
    )

    await db
      .from('discipleship_quizzes')
      .where('id', quiz.id)
      .where('status', 'pending')
      .update({ status: 'completed', questions: JSON.stringify(questions), updated_at: new Date() })
    await this.publishUpdate(quiz.congregation_id, quiz.id)
  }

  async failed(error: Error) {
    const quiz = parseQuizRow(
      await db.from('discipleship_quizzes').where('id', this.payload.quizId).first()
    )
    if (!quiz || quiz.status !== 'pending') return
    await db
      .from('discipleship_quizzes')
      .where('id', quiz.id)
      .where('status', 'pending')
      .update({
        status: 'failed',
        error_message: error.message.slice(0, 2000),
        updated_at: new Date(),
      })
    logger.error({ err: error, quizId: quiz.id }, 'Quiz generation job failed after retries')
    await this.publishUpdate(quiz.congregation_id, quiz.id)
  }

  private async publishUpdate(congregationId: string, quizId: string) {
    const row = await db.from('discipleship_quizzes').where('id', quizId).first()
    if (!row) return
    publishQuizUpdate(congregationId, {
      id: String(row.id),
      classId: String(row.class_id),
      scheduleId: String(row.schedule_id),
      lessonTitle: row.lesson_title,
      provider: row.provider || 'chatgpt',
      questionCount: Number(row.question_count),
      status: row.status,
      questions:
        typeof row.questions === 'string' ? JSON.parse(row.questions) : row.questions || [],
      error: row.error_message || '',
      createdAt: row.created_at,
    })
  }
}
