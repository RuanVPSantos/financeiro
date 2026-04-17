# 💰 Financeiro

[![GitHub Repo stars](https://img.shields.io/github/stars/RuanVPSantos/financeiro?style=for-the-badge&color=cba6f7&logoColor=383330)](https://github.com/RuanVPSantos/financeiro/stargazers)
[![GitHub last commit](https://img.shields.io/github/last-commit/RuanVPSantos/financeiro?color=a6e3a1)](https://github.com/RuanVPSantos/financeiro/commits/main)
[![GitHub repo size](https://img.shields.io/github/repo-size/RuanVPSantos/financeiro?color=cba6f7)](https://github.com/RuanVPSantos/financeiro)
[![License](https://img.shields.io/github/license/RuanVPSantos/financeiro?color=89b4fa)](LICENSE)

> App de controle financeiro pessoal com Next.js, SQL.js e React.

---

## ✨ Features

- Cadastro e gerenciamento de transações financeiras
- Categorização de receitas e despesas
- Visualização de gráficos e resumo mensal
- Banco de dados local SQLite (via WebAssembly)
- Modo desenvolvimento com dados mock para testes
- Suporte a Docker para produção

---

## 🚀 Tech Stack

| Tecnologia | Descrição |
|------------|-----------|
| [Next.js 16](https://nextjs.org/) | App Router, React 19 |
| [SQL.js](https://sql.js.org/) | SQLite via WebAssembly |
| [React 19](https://react.dev/) | UI Library |
| [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first CSS |
| [Recharts](https://recharts.org/) | Gráficos React |

---

## 🛠️ Setup

```bash
# Instalar dependências
pnpm install

# Modo desenvolvimento (banco data/finance.db)
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## 📋 Comandos

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Modo desenvolvimento (banco `data/finance.db`) |
| `pnpm mock` | Modo mock para testes (`mock.db`) |
| `pnpm build` | Build produção |
| `pnpm start` | Executar produção |
| `pnpm seed:mock` | Gerar dados mock |

---

## 🐳 Docker

```bash
docker compose up -d --build
```

Acesse [http://localhost:3001](http://localhost:3001)

O banco de dados é persistido no volume `./data`.

---

## 📁 Estrutura

```
financeiro/
├── src/
│   ├── app/           # Next.js App Router
│   │   ├── api/       # API Routes
│   │   ├── page.tsx   # Página principal
│   │   └── globals.css
│   └── lib/
│       └── db.ts      # Banco de dados SQL.js
├── public/            # Arquivos estáticos
├── data/              # Banco de dados SQLite
├── scripts/           # Scripts auxiliares
└── package.json
```

---

## 📝 License

MIT License - feel free to use this project however you want.

---

## ⭐ Support

If you found this useful, give it a star!