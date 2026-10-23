import { randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import { getAiApiKey, type QuizAiProvider, type QuizQuestion } from '#services/chatgpt_service'
import GenerateQuizJob from '#jobs/generate_quiz_job'

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

export function serializeQuiz(row: QuizDbRow) {
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

export class QuizValidationError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message)
  }
}

export async function generateQuiz(
  congregationId: string,
  classId: string,
  scheduleId: string,
  provider: QuizAiProvider,
  questionCount: number
) {
  const classRow = await db
    .from('classes')
    .where('id', classId)
    .where('congregation_id', congregationId)
    .whereNull('deleted_at')
    .first()
  if (!classRow) throw new QuizValidationError('Turma não encontrada nesta congregação.', 404)
  const lesson = await db
    .from('discipleship_schedule')
    .where('id', scheduleId)
    .where('class_id', classId)
    .where('congregation_id', congregationId)
    .first()
  if (!lesson) throw new QuizValidationError('Lição não encontrada nesta escala.', 404)
  const content = typeof lesson.content === 'string' ? lesson.content.trim() : ''
  if (!content)
    throw new QuizValidationError('Adicione o conteúdo da lição antes de gerar um questionário.')
  const configuredApiKey = await getAiApiKey(congregationId, provider)
  if (!configuredApiKey) {
    throw new QuizValidationError(
      `Configure a integração do ${provider === 'deepseek' ? 'DeepSeek' : 'ChatGPT'} antes de gerar questionários.`
    )
  }
  const jobId = randomUUID()
  const now = new Date()
  await db.table('discipleship_quizzes').insert({
    id: jobId,
    congregation_id: congregationId,
    class_id: String(classId),
    schedule_id: String(scheduleId),
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
    classId: String(classId),
    scheduleId: String(scheduleId),
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
  return pendingQuiz
}

export function validateQuizQuestions(value: unknown): QuizQuestion[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30)
    throw new QuizValidationError('Envie de 1 a 30 perguntas.')
  return value.map((item, index) => {
    const fail = () => {
      throw new QuizValidationError(
        `Questão ${index + 1}: informe pergunta, quatro alternativas distintas e gabarito A, B, C ou D.`
      )
    }
    if (!item || typeof item !== 'object' || Array.isArray(item)) return fail()
    const { question, options, correctAnswer, explanation = '' } = item
    if (
      typeof question !== 'string' ||
      !question.trim() ||
      question.length > 5000 ||
      !Array.isArray(options) ||
      options.length !== 4 ||
      options.some(
        (option) => typeof option !== 'string' || !option.trim() || option.length > 2000
      ) ||
      typeof correctAnswer !== 'string' ||
      !/^[A-D]$/.test(correctAnswer) ||
      typeof explanation !== 'string' ||
      explanation.length > 5000
    )
      return fail()
    const normalizedOptions = options.map((option: string) => option.trim())
    if (
      new Set(
        normalizedOptions.map((option: string) =>
          option
            .replace(/^[A-D][).]\s*/, '')
            .trim()
            .toLowerCase()
        )
      ).size !== 4
    )
      return fail()
    return {
      question: question.trim(),
      options: normalizedOptions,
      correctAnswer,
      explanation: explanation.trim(),
    }
  })
}

export async function createQuiz(
  congregationId: string,
  classId: string,
  scheduleId: string,
  inputQuestions: unknown,
  audit: { ip: string | null; userAgent: string | null }
) {
  const questions = validateQuizQuestions(inputQuestions)
  return db.transaction(async (trx) => {
    const lesson = await trx
      .from('discipleship_schedule as schedule')
      .innerJoin('classes', 'classes.id', 'schedule.class_id')
      .where('schedule.id', scheduleId)
      .where('schedule.class_id', classId)
      .where('schedule.congregation_id', congregationId)
      .where('classes.congregation_id', congregationId)
      .whereNull('classes.deleted_at')
      .select('schedule.title')
      .first()
    if (!lesson)
      throw new QuizValidationError('Lição ou turma não encontrada nesta congregação.', 404)
    const now = new Date()
    const row = {
      id: randomUUID(),
      congregation_id: congregationId,
      class_id: classId,
      schedule_id: scheduleId,
      lesson_title: lesson.title,
      provider: 'chatgpt',
      question_count: questions.length,
      status: 'completed',
      questions: JSON.stringify(questions),
      error_message: null,
      created_at: now,
      updated_at: now,
    }
    await trx.table('discipleship_quizzes').insert(row)
    await trx.table('audit_logs').insert({
      id: randomUUID(),
      action: 'quiz.create',
      entity_type: 'discipleship_quiz',
      entity_id: row.id,
      details: JSON.stringify({
        source: 'mcp',
        congregationId,
        classId,
        scheduleId,
        questionCount: questions.length,
      }),
      ip: audit.ip,
      user_agent: audit.userAgent,
    })
    return serializeQuiz(row)
  })
}
