# Campanha Evangelizadora — Web

Versão independente em React para navegador. O app Expo continua disponível na raiz do projeto.

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
