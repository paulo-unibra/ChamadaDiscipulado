# Chamada EBD

Front-end mobile para chamada da Escola Biblica Dominical, desenvolvido com Expo SDK 54 + Expo Router.

## O que ja esta pronto

- Cadastro de turmas
- Cadastro de alunos por turma
- Cadastro de professores
- Registro de chamada com selecao obrigatoria do professor
- Edicao de chamada
- Exclusao de chamada
- Exclusao de aluno
- Exclusao de turma
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
- `app/(tabs)/turmas.tsx`: CRUD de turmas e alunos
- `app/(tabs)/professores.tsx`: CRUD de professores
- `app/(tabs)/chamadas.tsx`: registro/edicao/historico de chamada
- `context/school-data-context.tsx`: estado global local (memoria)

## Proximos passos sugeridos

- Persistencia local (AsyncStorage ou SQLite)
- Exportacao de relatorios em PDF
- Sincronizacao com backend
- Login e controle de perfis (admin/professor)
