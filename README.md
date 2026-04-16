# Financeiro

App de controle financeiro pessoal.

## Tech Stack

- Next.js 16 (App Router)
- SQL.js (SQLite via WebAssembly)
- React 19
- Tailwind CSS 4

## Setup

```bash
pnpm install
pnpm dev
```

Acesse http://localhost:3000

## Comandos

```bash
pnpm dev          # Modo desenvolvimento (banco data/finance.db)
pnpm mock         # Modo mock (mock.db)
pnpm build        # Build produção
pnpm start        # Executar produção
pnpm seed:mock    # Gerar dados mock
```

## Docker

```bash
docker compose up -d --build
```

Acesse http://localhost:3001

O banco de dados é persistido no volume `./data`.