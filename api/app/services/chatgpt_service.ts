import encryption from '@adonisjs/core/services/encryption'
import db from '@adonisjs/lucid/services/db'

export type QuizQuestion = {
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
}

export type QuizAiProvider = 'chatgpt' | 'deepseek'

const providerConfig = {
  chatgpt: {
    column: 'chatgpt_api_key',
    purpose: 'chatgpt-api-key',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    label: 'ChatGPT',
  },
  deepseek: {
    column: 'deepseek_api_key',
    purpose: 'deepseek-api-key',
    endpoint: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    label: 'DeepSeek',
  },
} satisfies Record<QuizAiProvider, { column: string; purpose: string; endpoint: string; model: string; label: string }>

export async function getAiApiKey(congregationId: string, provider: QuizAiProvider) {
  const config = providerConfig[provider]
  const row = await db
    .from('google_forms_integrations')
    .select(config.column)
    .where('congregation_id', congregationId)
    .first()
  const encryptedApiKey = row?.[config.column]
  if (!encryptedApiKey) return ''
  return encryption.decrypt<string>(encryptedApiKey, config.purpose) || ''
}

export async function saveAiApiKey(congregationId: string, provider: QuizAiProvider, value: unknown) {
  const config = providerConfig[provider]
  if (typeof value !== 'string' || value.trim().length > 2000) {
    throw new Error('Informe um token válido de até 2.000 caracteres.')
  }
  const apiKey = value.trim()
  const existing = await db
    .from('google_forms_integrations')
    .where('congregation_id', congregationId)
    .first()
  const encryptedKey = apiKey ? encryption.encrypt(apiKey, undefined, config.purpose) : null
  if (existing) {
    await db
      .from('google_forms_integrations')
      .where('congregation_id', congregationId)
      .update({ [config.column]: encryptedKey, updated_at: new Date() })
  } else {
    await db.table('google_forms_integrations').insert({
      congregation_id: congregationId,
      enabled: false,
      form_id: '',
      apps_script_url: '',
      section_config: JSON.stringify({ sections: {}, fields: {}, mappings: {}, fixedAnswers: {} }),
      [config.column]: encryptedKey,
      created_at: new Date(),
      updated_at: new Date(),
    })
  }
  return { configured: Boolean(apiKey), apiKey }
}

export const getChatGptApiKey = (congregationId: string) => getAiApiKey(congregationId, 'chatgpt')
export const saveChatGptApiKey = (congregationId: string, value: unknown) => saveAiApiKey(congregationId, 'chatgpt', value)

export async function createQuizQuestions(
  provider: QuizAiProvider,
  apiKey: string,
  lessonTitle: string,
  lessonContent: string,
  count: number
): Promise<QuizQuestion[]> {
  const config = providerConfig[provider]
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      model: config.model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Você é um educador cristão que cria questionários em português do Brasil a partir do conteúdo fornecido. Retorne somente JSON válido no formato {"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":"A","explanation":"..."}]}. Crie questões claras, variadas e fiéis ao texto; cada questão deve ter exatamente quatro alternativas e somente uma resposta correta. Não invente informações que não estejam no conteúdo.',
        },
        {
          role: 'user',
          content: `Crie exatamente ${count} questões de múltipla escolha para a lição "${lessonTitle}" com base exclusivamente no conteúdo a seguir.\n\nCONTEÚDO DA LIÇÃO:\n${lessonContent}`,
        },
      ],
    }),
  })
  const payload: any = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload?.error?.message
    throw new Error(
      typeof message === 'string' ? message : `A API do ${config.label} respondeu com HTTP ${response.status}.`
    )
  }
  const raw = payload?.choices?.[0]?.message?.content
  if (typeof raw !== 'string') throw new Error(`O ${config.label} não retornou o questionário.`)
  let parsed: { questions?: unknown[] }
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`O ${config.label} retornou um questionário em formato inválido.`)
  }
  if (!Array.isArray(parsed.questions) || parsed.questions.length !== count) {
    throw new Error(`O ${config.label} não retornou a quantidade de questões solicitada.`)
  }
  return parsed.questions.map((item, index) => {
    const question = item as Partial<QuizQuestion>
    if (
      typeof question.question !== 'string' ||
      !Array.isArray(question.options) ||
      question.options.length !== 4 ||
      !question.options.every((option) => typeof option === 'string') ||
      typeof question.correctAnswer !== 'string'
    ) {
      throw new Error(`A questão ${index + 1} veio incompleta. Tente gerar novamente.`)
    }
    return {
      question: question.question,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: typeof question.explanation === 'string' ? question.explanation : '',
    }
  })
}
