# MCP OAuth para ChatGPT

O MCP foi integrado à própria API, separado das rotas da aplicação. O deploy publica os caminhos MCP e OAuth no mesmo domínio HTTPS do site:

- Servidor MCP: `https://discipulado.bibliafoco.com.br/mcp`
- Recurso protegido: `https://discipulado.bibliafoco.com/.well-known/oauth-protected-resource/mcp`
- Descoberta OAuth: `https://discipulado.bibliafoco.com/.well-known/oauth-authorization-server`
- Autorização: `/oauth/authorize`
- Troca/renovação de token: `/oauth/token`
- Registro dinâmico de cliente (DCR): `/oauth/register`
- Revogação: `/oauth/revoke`

O servidor implementa OAuth 2.1 Authorization Code com PKCE S256, DCR para cliente público ChatGPT, tokens opacos armazenados como hashes, access token de 15 minutos, refresh token rotativo de 30 dias e revogação por família de tokens. A senha e o código de verificação são digitados no domínio da aplicação; não são enviados ao ChatGPT.

## Configuração na VPS

Em produção, a URL padrão é `https://discipulado.bibliafoco.com.br`; para esse domínio não é necessária configuração adicional. Se a API for publicada em outro host, defina a URL pública canônica no arquivo privado `/root/ChamadaDiscipulado/api/.env`:

```dotenv
MCP_PUBLIC_URL=https://discipulado.bibliafoco.com.br
```

O deploy configura o `.htaccess` para encaminhar `/mcp`, `/oauth/*` e `/.well-known/*` diretamente à API na porta 2000. As rotas web existentes em `/api` continuam separadas.

Publique a versão da API e aplique a nova migração:

```bash
cd /root/ChamadaDiscipulado
docker compose exec api node ace migration:run --force
docker compose logs --tail=100 api
```

A migração cria o armazenamento de clientes OAuth, fluxos, códigos, tokens e associações de congregações. A conta administrativa existente recebe as congregações que já existem, de acordo com o comportamento atual do sistema. A autenticação atual aceita a conta configurada em `ADMIN_EMAIL` e exige senha mais código enviado por e-mail via Resend.

## Criar o app de desenvolvimento no ChatGPT

O caminho atual é **Configurações do workspace → Apps → Create** (ou **Configurações → Apps → Create**, quando disponível para sua conta):

1. Habilite o Developer Mode, se o workspace/plano oferecer esse recurso.
2. Crie um app/conector MCP personalizado e informe `https://discipulado.bibliafoco.com.br/mcp`.
3. Deixe o ChatGPT descobrir OAuth pelo endpoint do recurso protegido. O authorization server anuncia DCR e clientes públicos sem segredo; não configure uma API key estática.
4. Use **Scan Tools**. Ao conectar, o ChatGPT deve abrir o login da aplicação; entre com a conta cadastrada, confirme o código por e-mail e revise/autorize as permissões.
5. Teste o app como rascunho em uma conversa. **Não publique no catálogo público nem clique em Publish nesta etapa.**

O ChatGPT exige conectividade HTTPS pública para o servidor MCP. O fluxo pode variar conforme plano e controles do workspace. A documentação atual indica suporte a apps MCP personalizados em Business e Enterprise/Edu; contas Pro podem usar Developer Mode para MCP de consulta, sujeito à disponibilidade da conta.

## Escopos e ferramentas

- `congregations:read`: lista as congregações autorizadas.
- `converts:read`: busca convertidos e lista os sem correspondência de aluno.
- `converts:write`: cria novos cadastros de convertidos.
- `classes:read`: consulta turmas.
- `attendance:read`: consulta frequência.
- `offline_access`: permite renovar a conexão sem novo login frequente.

Ferramentas disponíveis: `get_profile`, `list_congregations`, `search_new_converts`, `create_new_convert`, `list_converts_without_discipleship`, `list_classes` e `query_attendance`. O cadastro exige `converts:write`, valida os campos e registra a ação na auditoria. O ChatGPT deve pedir confirmação explícita antes de cadastrar; mantenha a aprovação da ação de escrita habilitada nas configurações do app. Cada chamada consulta token, validade, resource, escopo e associação do usuário com a congregação solicitada.

### Modelo de permissões atual

O backend existente tem uma única credencial administrativa (`ADMIN_EMAIL`) e a API permite que ela selecione congregações. A migração materializa esse acesso em `admin_congregations`; o MCP não confia num `congregationId` enviado sem verificar a associação. A tela “Permissões” da interface atualmente persiste perfis apenas no navegador, sem enforcement no servidor; por isso, esses perfis locais não são usados como autorização OAuth. Para conceder acesso diferente por usuário, primeiro será necessário adicionar gerenciamento de membros e permissões no backend.

`list_converts_without_discipleship` considera sem discipulado os convertidos sem aluno ativo com nome igual (ignorando caixa e espaços externos) na mesma congregação. O banco ainda não tem um vínculo explícito convertido-aluno, então essa consulta é uma aproximação e pode não reconhecer nomes alterados ou variantes.

## Testes

Com Node 24 e a configuração local de teste:

```bash
cd api
MCP_PUBLIC_URL=https://discipulado.bibliafoco.com.br HOST=127.0.0.1 node ace test
```

Os testes cobrem metadados, descoberta das ferramentas, handshake Streamable HTTP, PKCE, callbacks DCR e rejeição de redirects externos. O fluxo que envia o código depende da configuração real de e-mail; a troca e revogação completas de tokens dependem do banco de dados. Faça esse teste de ponta a ponta no app em rascunho após aplicar a migração e configurar Resend.

## Questionários do discipulado

O questionário é elaborado na conversa com o GPT e enviado pronto pelo MCP.

- `list_discipleship_lessons`: consulta a escala e o conteúdo das lições por `classId`.
- `create_quiz`: recebe `classId`, `scheduleId` e `questions` (1 a 30 perguntas). Cada pergunta contém `question`, `options` (quatro alternativas distintas em ordem A–D), `correctAnswer` (A, B, C ou D) e `explanation` opcional. Salva imediatamente com status `completed`, sem chave de IA ou worker.
- `list_quizzes`: lista com paginação (`page`, `limit`) e filtros opcionais `classId`, `scheduleId` e `status`.
- `get_quiz`: recebe `quizId` e retorna status, perguntas, gabarito e eventual erro.

Todas aceitam `congregationId`, obrigatório quando a conta possui mais de uma congregação. As consultas exigem `quizzes:read`; a criação exige `quizzes:write`. Após publicar a API, atualize a descoberta de ferramentas do conector e autorize os novos escopos. Conexões antigas precisam de nova autorização para usar as ferramentas de questionários.

Cada chamada de criação salva um novo questionário e registra auditoria. A geração automática existente na aplicação continua usando sua integração e fila próprias.
