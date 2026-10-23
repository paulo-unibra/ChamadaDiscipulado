import { createQuiz, serializeQuiz, QuizValidationError } from '#services/quiz_service'
import type { HttpContext } from '@adonisjs/core/http'
import { randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import { CONVERSION_EVENTS } from '#services/conversion_events'
import {
  getCongregationsForAdmin,
  mcpResource,
  persistentConnectionScopes,
  validateAccessToken,
} from '#services/mcp_oauth_service'
import { createNewConvert, NewConvertValidationError } from '#services/new_convert_service'

const TOOL_SCOPES: Record<string, string> = {
  get_profile: 'congregations:read',
  list_congregations: 'congregations:read',
  search_new_converts: 'converts:read',
  create_new_convert: 'converts:write',
  list_converts_without_discipleship: 'converts:read',
  list_classes: 'classes:read',
  query_attendance: 'attendance:read',
  list_discipleship_lessons: 'quizzes:read',
  list_quizzes: 'quizzes:read',
  get_quiz: 'quizzes:read',
  create_quiz: 'quizzes:write',
}
const PROTOCOL_VERSIONS = ['2025-03-26', '2025-06-18', '2025-11-25']
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

type RpcMessage = Record<string, unknown>
type RpcResult = { jsonrpc: '2.0'; id: unknown; result?: unknown; error?: unknown }

function toolResponse(data: unknown, message = '') {
  return {
    content: [{ type: 'text', text: message || JSON.stringify(data) }],
    structuredContent: data,
    isError: false,
  }
}

function toolError(message: string, challenge?: string) {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
    ...(challenge ? { _meta: { 'mcp/www_authenticate': [challenge] } } : {}),
  }
}

function toolDefinitions() {
  const scope = (value: string) => [{ type: 'oauth2', scopes: persistentConnectionScopes([value]) }]
  const quizTools = [
    {
      name: 'list_discipleship_lessons',
      title: 'Consultar lições da turma',
      description:
        'Lista as lições da escala de uma turma autorizada, incluindo o conteúdo usado para gerar questionários.',
      properties: {
        classId: { type: 'string', minLength: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
      },
      required: ['classId'],
    },
    {
      name: 'list_quizzes',
      title: 'Listar questionários',
      description:
        'Lista questionários da congregação, com filtros opcionais por turma, lição e status. Use get_quiz para consultar perguntas e gabarito.',
      properties: {
        classId: { type: 'string' },
        scheduleId: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
        page: { type: 'integer', minimum: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
      },
      required: [],
    },
    {
      name: 'get_quiz',
      title: 'Consultar questionário',
      description:
        'Consulta status, perguntas e gabarito de um questionário autorizado. Para geração em andamento, consulte novamente depois.',
      properties: { quizId: { type: 'string', minLength: 1 } },
      required: ['quizId'],
    },
    {
      name: 'create_quiz',
      title: 'Criar questionário do discipulado',
      description:
        'Salva um questionário pronto criado nesta conversa, vinculado à turma e lição informadas. Envie todas as perguntas, quatro alternativas por pergunta, gabarito e explicação opcional. Não chama APIs de IA. Retorna status completed. Cada chamada cria um novo questionário.',
      properties: {
        classId: { type: 'string', minLength: 1 },
        scheduleId: { type: 'string', minLength: 1 },
        questions: {
          type: 'array',
          minItems: 1,
          maxItems: 30,
          items: {
            type: 'object',
            properties: {
              question: { type: 'string', minLength: 1, maxLength: 5000 },
              options: {
                type: 'array',
                minItems: 4,
                maxItems: 4,
                uniqueItems: true,
                items: { type: 'string', minLength: 1, maxLength: 2000 },
              },
              correctAnswer: {
                type: 'string',
                enum: ['A', 'B', 'C', 'D'],
                description: 'Letra da alternativa correta, na ordem de options.',
              },
              explanation: { type: 'string', maxLength: 5000 },
            },
            required: ['question', 'options', 'correctAnswer'],
            additionalProperties: false,
          },
        },
      },
      required: ['classId', 'scheduleId', 'questions'],
    },
  ].map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: {
      type: 'object',
      properties: { congregationId: { type: 'string' }, ...tool.properties },
      required: tool.required,
      additionalProperties: false,
    },
    securitySchemes: scope(TOOL_SCOPES[tool.name]),
    annotations: {
      readOnlyHint: tool.name !== 'create_quiz',
      destructiveHint: false,
      idempotentHint: tool.name !== 'create_quiz',
      openWorldHint: false,
    },
  }))
  return [
    ...quizTools,
    {
      name: 'get_profile',
      title: 'Identificar a conta conectada',
      description:
        'Retorna um identificador estável e o e-mail da conta autenticada neste conector.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      outputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', minLength: 1 },
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['id'],
        additionalProperties: false,
      },
      securitySchemes: scope(TOOL_SCOPES.get_profile),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      _meta: { 'openai/profile': true },
    },
    {
      name: 'list_congregations',
      title: 'Listar congregações disponíveis',
      description: 'Lista apenas as congregações autorizadas para a conta conectada.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      outputSchema: {
        type: 'object',
        properties: { congregations: { type: 'array', items: { type: 'object' } } },
        required: ['congregations'],
        additionalProperties: false,
      },
      securitySchemes: scope(TOOL_SCOPES.list_congregations),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    {
      name: 'search_new_converts',
      title: 'Buscar novos convertidos',
      description:
        'Busca convertidos por nome, atividade ou telefone dentro de uma congregação autorizada. Retorna dados mínimos de identificação e contato.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', minLength: 1, maxLength: 120 },
          congregationId: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 50 },
        },
        required: ['query'],
        additionalProperties: false,
      },
      outputSchema: {
        type: 'object',
        properties: {
          congregationId: { type: 'string' },
          results: { type: 'array', items: { type: 'object' } },
        },
        required: ['congregationId', 'results'],
        additionalProperties: false,
      },
      securitySchemes: scope(TOOL_SCOPES.search_new_converts),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    {
      name: 'create_new_convert',
      title: 'Cadastrar novo convertido',
      description:
        'Cria um cadastro de novo convertido na congregação autorizada. Colete os dados necessários e peça confirmação explícita ao usuário antes de cadastrar. Se houver dúvida sobre cadastro existente, use primeiro search_new_converts.',
      inputSchema: {
        type: 'object',
        properties: {
          congregationId: {
            type: 'string',
            description: 'ID da congregação autorizada; opcional se houver apenas uma.',
          },
          name: { type: 'string', minLength: 1, maxLength: 255 },
          eventName: { type: 'string', enum: CONVERSION_EVENTS },
          conversionDate: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$',
            description: 'Data da conversão no formato AAAA-MM-DD.',
          },
          birthDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          contactPhone: { type: 'string', maxLength: 40 },
          cep: { type: 'string', description: 'CEP com 8 dígitos.' },
          street: { type: 'string', maxLength: 255 },
          number: { type: 'string', maxLength: 255 },
          complement: { type: 'string', maxLength: 255 },
          neighborhood: { type: 'string', maxLength: 255 },
          city: { type: 'string', maxLength: 255 },
          state: { type: 'string', maxLength: 2, description: 'UF do estado.' },
        },
        required: ['name', 'eventName', 'conversionDate'],
        additionalProperties: false,
      },
      outputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          congregationId: { type: 'string' },
          name: { type: 'string' },
          eventName: { type: 'string' },
          conversionDate: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['id', 'congregationId', 'name', 'eventName', 'conversionDate', 'message'],
        additionalProperties: false,
      },
      securitySchemes: scope(TOOL_SCOPES.create_new_convert),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    {
      name: 'list_converts_without_discipleship',
      title: 'Listar convertidos sem discipulado',
      description:
        'Lista novos convertidos sem aluno com nome exatamente igual na mesma congregação. O cadastro atual não possui vínculo direto entre convertido e aluno; alterações de nome podem afetar a correspondência.',
      inputSchema: {
        type: 'object',
        properties: {
          congregationId: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 100 },
        },
        additionalProperties: false,
      },
      outputSchema: {
        type: 'object',
        properties: {
          congregationId: { type: 'string' },
          matchingRule: { type: 'string' },
          results: { type: 'array', items: { type: 'object' } },
        },
        required: ['congregationId', 'matchingRule', 'results'],
        additionalProperties: false,
      },
      securitySchemes: scope(TOOL_SCOPES.list_converts_without_discipleship),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    {
      name: 'list_classes',
      title: 'Consultar turmas',
      description: 'Lista turmas e quantidades de alunos na congregação autorizada.',
      inputSchema: {
        type: 'object',
        properties: {
          congregationId: { type: 'string' },
          query: { type: 'string', maxLength: 120 },
          limit: { type: 'integer', minimum: 1, maximum: 100 },
        },
        additionalProperties: false,
      },
      outputSchema: {
        type: 'object',
        properties: {
          congregationId: { type: 'string' },
          results: { type: 'array', items: { type: 'object' } },
        },
        required: ['congregationId', 'results'],
        additionalProperties: false,
      },
      securitySchemes: scope(TOOL_SCOPES.list_classes),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    {
      name: 'query_attendance',
      title: 'Consultar frequência',
      description:
        'Consulta chamadas por turma, aluno e intervalo de datas. Registros e alunos ficam limitados à congregação autorizada.',
      inputSchema: {
        type: 'object',
        properties: {
          congregationId: { type: 'string' },
          classId: { type: 'string' },
          studentName: { type: 'string', maxLength: 120 },
          from: { type: 'string', description: 'Data inicial AAAA-MM-DD.' },
          to: { type: 'string', description: 'Data final AAAA-MM-DD.' },
          limit: { type: 'integer', minimum: 1, maximum: 100 },
        },
        additionalProperties: false,
      },
      outputSchema: {
        type: 'object',
        properties: {
          congregationId: { type: 'string' },
          results: { type: 'array', items: { type: 'object' } },
        },
        required: ['congregationId', 'results'],
        additionalProperties: false,
      },
      securitySchemes: scope(TOOL_SCOPES.query_attendance),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
  ]
}

function rpcError(id: unknown, code: number, message: string): RpcResult {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
}

function hasScope(token: { scopes: string }, expected: string) {
  return String(token.scopes).split(/\s+/).includes(expected)
}

function intLimit(value: unknown, fallback: number, max: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback
}

export function resolveAuthorizedCongregation(
  available: Array<{ id: string | number; name: string }>,
  requestedId: string
) {
  if (!available.length) throw new Error('Sua conta não possui congregações autorizadas.')
  if (!requestedId && available.length === 1) return String(available[0].id)
  const congregation = available.find((row) => String(row.id) === requestedId)
  if (!congregation) {
    if (!requestedId)
      throw new Error('Informe congregationId; sua conta tem mais de uma congregação disponível.')
    throw new Error('A conta conectada não tem acesso a essa congregação.')
  }
  return String(congregation.id)
}

export default class McpController {
  async get({ response }: HttpContext) {
    response.header('Allow', 'POST')
    return response.status(405).send(null)
  }

  async handle({ request, response }: HttpContext) {
    const origin = request.header('origin')
    if (
      origin &&
      !['https://chatgpt.com', 'https://chat.openai.com', new URL(mcpResource()).origin].includes(
        origin
      )
    ) {
      return response.status(403).send({ error: 'Origin não autorizado.' })
    }
    const body: unknown = request.body()
    if (Array.isArray(body)) {
      if (!body.length) return response.badRequest(rpcError(null, -32600, 'Lote JSON-RPC vazio.'))
      const results: RpcResult[] = []
      for (const item of body) {
        const result = await this.processMessage(item, request)
        if (result) results.push(result)
      }
      if (!results.length) return response.status(202).send(null)
      response.header('MCP-Protocol-Version', PROTOCOL_VERSIONS[2])
      return response.ok(results)
    }
    const result = await this.processMessage(body, request)
    if (!result) return response.status(202).send(null)
    const rpc = body as Record<string, unknown>
    const negotiated =
      rpc.method === 'initialize' &&
      rpc.params &&
      typeof rpc.params === 'object' &&
      'protocolVersion' in rpc.params &&
      PROTOCOL_VERSIONS.includes(String((rpc.params as Record<string, unknown>).protocolVersion))
        ? String((rpc.params as Record<string, unknown>).protocolVersion)
        : PROTOCOL_VERSIONS[2]
    response.header('MCP-Protocol-Version', negotiated)
    return response.ok(result)
  }

  private async processMessage(
    raw: unknown,
    request: HttpContext['request']
  ): Promise<RpcResult | null> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
      return rpcError(null, -32600, 'Requisição MCP inválida.')
    const rpc = raw as RpcMessage
    if (rpc.jsonrpc !== '2.0' || typeof rpc.method !== 'string')
      return rpcError(rpc.id, -32600, 'Requisição JSON-RPC inválida.')
    if (!Object.hasOwn(rpc, 'id')) return null
    if (rpc.method === 'initialize') {
      const requested =
        rpc.params && typeof rpc.params === 'object'
          ? String((rpc.params as Record<string, unknown>).protocolVersion ?? '')
          : ''
      return {
        jsonrpc: '2.0',
        id: rpc.id,
        result: {
          protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[2],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'chamada-discipulado', version: '1.1.0' },
        },
      }
    }
    if (rpc.method === 'ping') return { jsonrpc: '2.0', id: rpc.id, result: {} }
    if (rpc.method === 'tools/list')
      return { jsonrpc: '2.0', id: rpc.id, result: { tools: toolDefinitions() } }
    if (rpc.method !== 'tools/call') return rpcError(rpc.id, -32601, 'Método MCP não encontrado.')
    return this.callTool(rpc, request)
  }

  private async callTool(rpc: RpcMessage, request: HttpContext['request']): Promise<RpcResult> {
    const params = rpc.params
    if (!params || typeof params !== 'object' || Array.isArray(params))
      return rpcError(rpc.id, -32602, 'Parâmetros inválidos.')
    const { name, arguments: args } = params as Record<string, unknown>
    if (typeof name !== 'string' || !(name in TOOL_SCOPES))
      return rpcError(rpc.id, -32602, 'Ferramenta desconhecida.')
    const challenge = `Bearer resource_metadata="${mcpResource().replace(/\/mcp$/, '/.well-known/oauth-protected-resource/mcp')}", scope="${persistentConnectionScopes([TOOL_SCOPES[name]]).join(' ')}", error="invalid_token", error_description="Conecte sua conta para usar esta ferramenta"`
    const tokenString = request.header('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? ''
    const token = await validateAccessToken(tokenString, mcpResource())
    if (!token) {
      return {
        jsonrpc: '2.0',
        id: rpc.id,
        result: {
          content: [
            { type: 'text', text: 'Conecte sua conta Chamada Discipulado para continuar.' },
          ],
          isError: true,
          _meta: { 'mcp/www_authenticate': [challenge] },
        },
      }
    }
    if (!hasScope(token, TOOL_SCOPES[name])) {
      const scopedChallenge = challenge
        .replace('error="invalid_token"', 'error="insufficient_scope"')
        .replace(
          'error_description="Conecte sua conta para usar esta ferramenta"',
          'error_description="Permissão ausente"'
        )
      return {
        jsonrpc: '2.0',
        id: rpc.id,
        result: toolError('A conexão não recebeu a permissão necessária.', scopedChallenge),
      }
    }
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      return {
        jsonrpc: '2.0',
        id: rpc.id,
        result: toolError('Os argumentos da ferramenta são inválidos.'),
      }
    }
    try {
      const data = await this.executeTool(
        name,
        args as Record<string, unknown>,
        String(token.subject),
        request
      )
      return { jsonrpc: '2.0', id: rpc.id, result: toolResponse(data) }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: rpc.id,
        result: toolError(
          error instanceof NewConvertValidationError || error instanceof QuizValidationError
            ? error.message
            : error instanceof Error && !['create_new_convert', 'create_quiz'].includes(name)
              ? error.message
              : 'Não foi possível executar esta ferramenta.'
        ),
      }
    }
  }

  private async authorizedCongregation(email: string, requestedId: string) {
    const available = await getCongregationsForAdmin(email)
    return resolveAuthorizedCongregation(available, requestedId)
  }

  private async executeTool(
    name: string,
    args: Record<string, unknown>,
    email: string,
    request: HttpContext['request']
  ) {
    if (name === 'get_profile') {
      const { createHash } = await import('node:crypto')
      const opaqueId = createHash('sha256').update(email).digest('hex').slice(0, 32)
      const profile = { id: `acct_${opaqueId}`, name: email, email }
      return profile
    }
    if (name === 'list_congregations') {
      const congregations = await getCongregationsForAdmin(email)
      return { congregations: congregations.map((row) => ({ id: String(row.id), name: row.name })) }
    }
    const requestedId = text(args.congregationId)
    const congregationId = await this.authorizedCongregation(email, requestedId)
    if (['list_discipleship_lessons', 'list_quizzes', 'get_quiz', 'create_quiz'].includes(name)) {
      for (const field of ['classId', 'scheduleId', 'quizId']) {
        if (args[field] !== undefined && (typeof args[field] !== 'string' || !text(args[field])))
          throw new QuizValidationError('Informe um ' + field + ' válido.')
      }
      if (['create_quiz', 'list_discipleship_lessons'].includes(name) && !text(args.classId))
        throw new QuizValidationError('Informe classId.')
      if (name === 'create_quiz') {
        if (!text(args.scheduleId)) throw new QuizValidationError('Informe scheduleId.')
        const quiz = await createQuiz(
          congregationId,
          text(args.classId),
          text(args.scheduleId),
          args.questions,
          {
            ip: request.ip() || null,
            userAgent: (request.header('user-agent') || '').slice(0, 255) || null,
          }
        )
        return { congregationId, quiz }
      }
      if (name === 'list_discipleship_lessons') {
        const rows = await db
          .from('discipleship_schedule as schedule')
          .innerJoin('classes', 'classes.id', 'schedule.class_id')
          .where('schedule.congregation_id', congregationId)
          .where('classes.congregation_id', congregationId)
          .whereNull('classes.deleted_at')
          .where('schedule.class_id', text(args.classId))
          .select(
            'schedule.id as scheduleId',
            'schedule.class_id as classId',
            'schedule.title',
            'schedule.lesson_date as lessonDate',
            'schedule.content'
          )
          .orderBy('schedule.lesson_date', 'desc')
          .limit(intLimit(args.limit, 50, 100))
        return { congregationId, lessons: rows }
      }
      const query = db.from('discipleship_quizzes').where('congregation_id', congregationId)
      if (name === 'get_quiz') {
        if (!text(args.quizId)) throw new QuizValidationError('Informe quizId.')
        const row = await query.where('id', text(args.quizId)).first()
        if (!row) throw new QuizValidationError('Questionário não encontrado nesta congregação.')
        return { congregationId, quiz: serializeQuiz(row) }
      }
      if (
        args.status !== undefined &&
        !['pending', 'processing', 'completed', 'failed'].includes(String(args.status))
      )
        throw new QuizValidationError('Status inválido.')
      if (text(args.classId)) query.where('class_id', text(args.classId))
      if (text(args.scheduleId)) query.where('schedule_id', text(args.scheduleId))
      if (text(args.status)) query.where('status', text(args.status))
      const page = intLimit(args.page, 1, 100000)
      const limit = intLimit(args.limit, 25, 100)
      const [{ total }] = await query.clone().count('* as total')
      const rows = await query
        .select(
          'id',
          'class_id',
          'schedule_id',
          'lesson_title',
          'provider',
          'question_count',
          'status',
          'error_message',
          'created_at'
        )
        .orderBy('created_at', 'desc')
        .orderBy('id', 'desc')
        .offset((page - 1) * limit)
        .limit(limit)
      return {
        congregationId,
        quizzes: rows.map((row) => {
          const { questions, ...summary } = serializeQuiz(row)
          return summary
        }),
        page,
        limit,
        total: Number(total),
      }
    }
    if (name === 'create_new_convert') {
      return db.transaction(async (trx) => {
        const created = await createNewConvert(trx, args, congregationId)
        await trx.table('audit_logs').insert({
          id: randomUUID(),
          action: 'new_convert.create',
          entity_type: 'new_convert',
          entity_id: created.id,
          details: JSON.stringify({
            name: created.name,
            eventName: created.eventName,
            conversionDate: created.conversionDate,
            source: 'mcp',
          }),
          ip: request.ip() || null,
          user_agent: (request.header('user-agent') || '').slice(0, 255) || null,
        })
        return {
          id: created.id,
          congregationId,
          name: created.name,
          eventName: created.eventName,
          conversionDate: created.conversionDate,
          message: 'Cadastro de novo convertido criado com sucesso.',
        }
      })
    }
    if (name === 'search_new_converts') {
      const query = text(args.query)
      if (!query) throw new Error('Informe o nome, atividade ou telefone para buscar.')
      if (query.length > 120) throw new Error('A busca deve ter no máximo 120 caracteres.')
      const pattern = `%${query}%`
      const rows = await db
        .from('new_converts')
        .select('id', 'name', 'event_name', 'conversion_date', 'contact_phone', 'city', 'state')
        .where('congregation_id', congregationId)
        .whereNull('deleted_at')
        .where((builder) =>
          builder
            .whereRaw('LOWER(name) LIKE LOWER(?)', [pattern])
            .orWhereRaw('LOWER(event_name) LIKE LOWER(?)', [pattern])
            .orWhereRaw('LOWER(contact_phone) LIKE LOWER(?)', [pattern])
        )
        .orderBy('conversion_date', 'desc')
        .limit(intLimit(args.limit, 20, 50))
      return { congregationId, results: rows }
    }
    if (name === 'list_converts_without_discipleship') {
      const rows = await db
        .from('new_converts')
        .select(
          'new_converts.id',
          'new_converts.name',
          'new_converts.event_name',
          'new_converts.conversion_date',
          'new_converts.contact_phone',
          'new_converts.city'
        )
        .where('new_converts.congregation_id', congregationId)
        .whereNull('new_converts.deleted_at')
        .whereNotExists((builder) => {
          builder
            .select('*')
            .from('students')
            .whereColumn('students.congregation_id', 'new_converts.congregation_id')
            .whereRaw('LOWER(TRIM(students.name)) = LOWER(TRIM(new_converts.name))')
            .whereNull('students.deleted_at')
        })
        .orderBy('new_converts.conversion_date', 'desc')
        .limit(intLimit(args.limit, 50, 100))
      return {
        congregationId,
        matchingRule:
          'Sem aluno ativo na mesma congregação com nome correspondente sem diferenciar maiúsculas/minúsculas e espaços externos.',
        results: rows,
      }
    }
    if (name === 'list_classes') {
      const query = text(args.query)
      if (query.length > 120) throw new Error('A busca deve ter no máximo 120 caracteres.')
      let classesQuery = db
        .from('classes')
        .select(
          'classes.id',
          'classes.name',
          'classes.description',
          'classes.start_date',
          'classes.lesson_weekday',
          'classes.lesson_time'
        )
        .select(
          db.raw(
            '(SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = classes.id AND cs.deleted_at IS NULL) AS students_count'
          )
        )
        .where('classes.congregation_id', congregationId)
        .whereNull('classes.deleted_at')
      if (query)
        classesQuery = classesQuery.whereRaw('LOWER(classes.name) LIKE LOWER(?)', [`%${query}%`])
      const rows = await classesQuery
        .orderBy('classes.name', 'asc')
        .limit(intLimit(args.limit, 50, 100))
      return { congregationId, results: rows }
    }
    if (name === 'query_attendance') {
      const from = text(args.from)
      const to = text(args.to)
      const studentName = text(args.studentName)
      if (studentName.length > 120)
        throw new Error('O nome do aluno deve ter no máximo 120 caracteres.')
      if (from && !this.isIsoDate(from))
        throw new Error('A data inicial deve estar no formato AAAA-MM-DD.')
      if (to && !this.isIsoDate(to))
        throw new Error('A data final deve estar no formato AAAA-MM-DD.')
      if (from && to && from > to) throw new Error('A data inicial deve ser anterior à data final.')
      let query = db
        .from('attendance_entries')
        .innerJoin(
          'attendance_records',
          'attendance_records.id',
          'attendance_entries.attendance_record_id'
        )
        .innerJoin('classes', 'classes.id', 'attendance_records.class_id')
        .innerJoin('students', 'students.id', 'attendance_entries.student_id')
        .select(
          'attendance_records.id as attendanceId',
          'attendance_records.date',
          'attendance_records.lesson_name as lessonName',
          'classes.id as classId',
          'classes.name as className',
          'students.id as studentId',
          'students.name as studentName',
          'attendance_entries.status'
        )
        .where('classes.congregation_id', congregationId)
        .where('students.congregation_id', congregationId)
        .whereNull('attendance_entries.deleted_at')
        .whereNull('attendance_records.deleted_at')
        .whereNull('classes.deleted_at')
        .whereNull('students.deleted_at')
      if (text(args.classId)) query = query.where('classes.id', text(args.classId))
      if (studentName)
        query = query.whereRaw('LOWER(students.name) LIKE LOWER(?)', [`%${studentName}%`])
      if (from) query = query.where('attendance_records.date', '>=', from)
      if (to) query = query.where('attendance_records.date', '<=', to)
      query = query.orderBy('attendance_records.date', 'desc').limit(intLimit(args.limit, 50, 100))
      return { congregationId, results: await query }
    }
    throw new Error('Ferramenta não implementada.')
  }

  private isIsoDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const date = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }
}
