# Chamada EBD

Front-end mobile para chamada da Escola Biblica Dominical, desenvolvido com Expo SDK 54 + Expo Router.

## O que ja esta pronto

- Cadastro de turmas
- Grade fixa de 22 aulas do discipulado (aplicada automaticamente a toda turma)
- Cadastro completo de alunos (dados pessoais e responsavel)
- Vinculo de aluno em multiplas turmas
- Cadastro de professores
- Registro de chamada com selecao obrigatoria de um ou mais professores
- Status de chamada: presente, falta, justificada e atrasado
- Observacao por aluno na chamada
- Edicao e exclusao de chamada
- Aviso de impacto ao apagar turma/professor (sem bloqueio)
- Importacao de alunos por CSV (modo mock)
- Area exclusiva de relatorios e exportacoes (modo mock)
- Dashboard com resumo de turmas, alunos, professores e chamadas

## Tecnologias

- Expo SDK 54
- Expo Router (file-based routing)
- React Native 0.81
- React 19
- Reanimated 4
- TypeScript

## Rodando o projeto

1. Instale dependencias:

```bash
npm install
```

2. Inicie o app:

```bash
npx expo start
```

3. Abra no Android, iOS ou web usando os atalhos exibidos no terminal.

## Estrutura principal

- `app/(tabs)/index.tsx`: dashboard
- `app/(tabs)/turmas.tsx`: turmas, grade fixa de aulas, cadastro de aluno, vinculos multi-turma e importacao CSV
- `app/(tabs)/professores.tsx`: CRUD de professores
- `app/(tabs)/chamadas.tsx`: chamada com multiplos professores, status atrasado e observacao por aluno
- `app/(tabs)/relatorios.tsx`: espaco de relatorios/exportacoes
- `context/school-data-context.tsx`: estado global em memoria com API mock online

## Proximos passos sugeridos

- Integrar com API real (online)
- Implementar exportacao real em PDF/Excel/WhatsApp
- Criar filtros avancados de relatorio por periodo, turma e professor
- Evoluir importacao CSV com validacao visual por linha
