# Campanha Evangelizadora — Web

Versão independente em React para navegador. O app Expo continua disponível na raiz do projeto. A congregação inicial é **Zumbi do Pacheco 1** (Área 10, Setor 10). Use o seletor no cabeçalho para trocar ou cadastrar congregações. Novos convertidos ficam em **Membros → Novos convertidos**; Google Forms, ChatGPT e DeepSeek ficam em **Configurações → Integrações**.

## Executar

```bash
cd web
npm install
npm run dev
```

Por padrão, a aplicação usa a API configurada atualmente pelo projeto (`http://146.190.138.248:2000`). Para apontar para outra instância, crie `web/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:2000
```

O painel mantém o fluxo de login com código de verificação por e-mail e requer uma API ativa para consultar ou salvar cadastros e chamadas.

## Build de produção

```bash
npm run build
npm run preview
```

## Qualidade e testes

```bash
npm run check
```

Executa ESLint (incluindo Hooks e acessibilidade, sem avisos), verificação de tipos dos módulos TypeScript, testes Vitest e build. O código JSX existente mantém JavaScript; os módulos de API, integrações, questionários e PDF possuem contratos TypeScript. O CI executa lint, tipos e testes antes de publicar.

Os testes usam APIs simuladas, sem consumir tokens ou alterar dados de produção. Cobrem troca de congregação com respostas atrasadas, preservação da escala, edição do conteúdo, estados da geração e PDF com alternativas multilinha.

## Organização

- `src/main.jsx`: navegação e telas existentes; estado reiniciado por sessão e congregação.
- `src/use-api.ts`: requisições canceláveis e expiração de sessão centralizada.
- `src/use-ai-integration.ts`: configuração salva separada do rascunho do token.
- `src/use-quizzes.ts`: atualização por WebSocket e contingência HTTP.
- `src/ScaleDialogs.jsx`, `src/QuizDialogs.jsx`, `src/Modal.jsx`: formulários e diálogos.
- `src/DialogAccessibility.jsx`: foco inicial, Tab, Escape e retorno de foco.
- `src/pdf/`: exportação sob demanda, medição e layout do questionário.

A preparação de uma escala vazia é uma ação explícita. Abrir a página não recria aulas existentes. IDs, conteúdo e horários são preservados ao editar, mantendo os vínculos dos questionários.
