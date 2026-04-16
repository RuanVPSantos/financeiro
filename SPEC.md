# Finance Manager - Especificação do Projeto

## 1. Project Overview

- **Nome**: Finance Manager
- **Tipo**: Web Application (Next.js + SQLite)
- **Funcionalidade**: Gerenciador de finanças pessoais para controle de entradas e saídas com status de execução e cálculo de saldos
- **Usuários**: Pessoa física que deseja organizar suas finanças

## 2. UI/UX Specification

### Layout Structure
- **Header**: Logo + título "Finance Manager"
- **Resumo Financeiro**: Cards showing total income, total expenses, balance
- **Ações**: Botão para adicionar nova transação
- **Filtros**: Filtros por tipo (entrada/saida), status (executada/não executada), período
- **Lista de Transações**: Tabela com todas as transações
- **Modal**: Formulário para criar/editar transações

### Visual Design
- **Paleta de Cores**:
  - Background: #0f0f0f
  - Card Background: #1a1a1a
  - Primary (Entradas): #10b981 (verde)
  - Secondary (Saídas): #ef4444 (vermelho)
  - Accent: #6366f1 (indigo)
  - Text Primary: #ffffff
  - Text Secondary: #a1a1aa
  - Border: #27272a
- **Tipografia**: Inter (system-ui fallback)
- **Border Radius**: 8px para cards, 6px para inputs
- **Spacing**: 16px padrão

### Componentes
- **Cards de Resumo**: Income (verde), Expenses (vermelho), Balance (indigo)
- **Transaction Card**: Tipo, descrição, valor, data, status (Executada/Não executada), actions (edit/delete)
- **Filtros**: Selects e inputs para filtrar transações
- **Modal**: Form com campos: tipo, descrição, valor, data, status
- **Botão Adicionar**: Fixed no canto inferior direito

## 3. Functionality Specification

### Funcionalidades Principais
1. **Criar Transação**: Adicionar nova entrada ou saída
2. **Listar Transações**: Mostrar todas as transações com filtros
3. **Editar Transação**: Modificar transação existente
4. **Excluir Transação**: Remover transação
5. **Alternar Status**: Marcar como executada/não executada
6. **Cálculo de Saldos**: 
   - Total de entradas
   - Total de saídas
   - Saldo atual (entradas - saídas)
   - Saldo executado (apenas transações executadas)

### Dados da Transação
- id (auto-generated)
- tipo: 'entrada' | 'saida'
- descricao: string
- valor: number
- data: date
- status: 'executada' | 'nao_executada'
- createdAt: timestamp
- updatedAt: timestamp

### Database (SQLite)
- Tabela: transactions
- Campos conforme acima

## 4. Acceptance Criteria

- [ ] Aplicação inicia sem erros
- [ ] SQLite conecta e persiste dados
- [ ] CRUD completo de transações funciona
- [ ] Filtros funcionam corretamente
- [ ] Cálculos de saldo estão corretos
- [ ] UI responsiva e funcional
- [ ] Status alterna corretamente