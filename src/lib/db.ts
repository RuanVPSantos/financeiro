import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

let db: SqlJsDatabase;
let dbPath: string;

export type Transaction = {
  id: number;
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: number;
  data: string;
  status: 'executada' | 'nao_executada';
  categoria: string;
  subcategoria: string;
  createdAt: string;
  updatedAt: string;
  subitems?: Subitem[];
};

export type Subitem = {
  id: number;
  transaction_id: number;
  descricao: string;
  valor: number;
  categoria: string;
  subcategoria: string;
};

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'subitems'>;

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export async function initDb() {
  const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  const SQL = await initSqlJs({
    locateFile: () => wasmPath
  });
  
  const isDocker = process.env.DOCKER === 'true';
  const dbFileName = process.env.SQLITE_FILE || 'finance.db';
  let dbDir: string;
  
  if (process.env.SQLITE_PATH) {
    dbDir = path.dirname(process.env.SQLITE_PATH);
  } else if (isDocker) {
    dbDir = '/app/data';
  } else {
    dbDir = process.env.SQLITE_FILE ? process.cwd() : path.join(process.cwd(), 'data');
  }
  
  dbPath = process.env.SQLITE_PATH || path.join(dbDir, dbFileName);
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    
    db.run("UPDATE transactions SET data = substr(data, 7, 4) || '-' || substr(data, 4, 2) || '-' || substr(data, 1, 2) WHERE data LIKE '__/__/____'");
    db.run("UPDATE transactions SET updatedAt = datetime('now') WHERE updatedAt IN ('Receita', 'Despesas')");
    saveDb();
    
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'")[0]?.values.map(v => v[0]) || [];
    if (!tables.includes('subitems')) {
      db.run(`
        CREATE TABLE IF NOT EXISTS subitems (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_id INTEGER NOT NULL,
          descricao TEXT NOT NULL,
          valor REAL NOT NULL,
          categoria TEXT DEFAULT '',
          subcategoria TEXT DEFAULT '',
          FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
        )
      `);
      saveDb();
    }
  } else {
    db = new SQL.Database();
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'saida')),
        descricao TEXT NOT NULL,
        valor REAL NOT NULL,
        data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'nao_executada' CHECK(status IN ('executada', 'nao_executada')),
        categoria TEXT DEFAULT '',
        subcategoria TEXT DEFAULT '',
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS subitems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL,
        descricao TEXT NOT NULL,
        valor REAL NOT NULL,
        categoria TEXT DEFAULT '',
        subcategoria TEXT DEFAULT '',
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
      )
    `);
    saveDb();
  }
  
  return db;
}

function queryAll(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql: string, params: any[] = []): any {
  const results = queryAll(sql, params);
  return results[0] || null;
}

function run(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
  db.run(sql, params);
  const lastId = db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] as number || 0;
  const changes = db.getRowsModified();
  saveDb();
  return { lastInsertRowid: lastId, changes };
}

export const getTransactions = (): Transaction[] => {
  const transactions = queryAll('SELECT * FROM transactions ORDER BY data DESC, id DESC');
  const subitems = queryAll('SELECT * FROM subitems');
  
  return transactions.map(t => ({
    ...t,
    subitems: subitems.filter((s: Subitem) => s.transaction_id === t.id)
  }));
};

export const getTotals = (transactions: Transaction[]) => {
  const totals = {
    entrada: 0,
    saida: 0,
    entradaExecutada: 0,
    saidaExecutada: 0,
    porCategoria: [] as { nome: string; valor: number }[],
    porMes: [] as { mes: string; entrada: number; saida: number; saldo: number }[]
  };
  
  transactions.forEach(t => {
    const valor = t.valor;
    if (t.tipo === 'entrada') {
      totals.entrada += valor;
      if (t.status === 'executada') totals.entradaExecutada += valor;
    } else {
      totals.saida += valor;
      if (t.status === 'executada') totals.saidaExecutada += valor;
    }
  });
  
  const porMesObj: { [key: string]: { entrada: number; saida: number } } = {};
  transactions.forEach(t => {
    const mes = t.data.substring(0, 7);
    if (!porMesObj[mes]) porMesObj[mes] = { entrada: 0, saida: 0 };
    if (t.tipo === 'entrada') {
      porMesObj[mes].entrada += t.valor;
    } else {
      porMesObj[mes].saida += t.valor;
    }
  });
  
  totals.porMes = Object.keys(porMesObj).sort().map(mes => ({
    mes,
    entrada: porMesObj[mes].entrada,
    saida: porMesObj[mes].saida,
    saldo: porMesObj[mes].entrada - porMesObj[mes].saida
  }));
  
  return totals;
};

export const createTransaction = (t: NewTransaction): Transaction => {
  const { subitems, data, ...rest } = t as any;
  const valor = subitems?.reduce((a: number, s: any) => a + Number(s.valor || 0), 0) || 0;
  const now = new Date().toISOString();
  
  const result = run(
    `INSERT INTO transactions (tipo, descricao, valor, data, status, categoria, subcategoria, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, '', '', ?, ?)`,
    [rest.tipo, rest.descricao, valor, data, rest.status, now, now]
  );
  
  if (subitems?.length) {
    for (const s of subitems) {
      run(
        `INSERT INTO subitems (transaction_id, descricao, valor, categoria, subcategoria)
         VALUES (?, ?, ?, ?, ?)`,
        [result.lastInsertRowid, s.descricao, s.valor, s.categoria || '', s.subcategoria || '']
      );
    }
  }
  
  return getTransactionById(result.lastInsertRowid)!;
};

export const getTransactionById = (id: number): Transaction | null => {
  const t = queryOne('SELECT * FROM transactions WHERE id = ?', [id]);
  if (!t) return null;
  const subitems = queryAll('SELECT * FROM subitems WHERE transaction_id = ?', [id]);
  return { ...t, subitems };
};

export const updateTransaction = (id: number, t: Partial<NewTransaction>): Transaction => {
  const { subitems, ...rest } = t as any;
  const now = new Date().toISOString();
  
  if (Object.keys(rest).length > 0) {
    const fields = Object.keys(rest).map(k => `${k} = ?`).join(', ') + ', updatedAt = ?';
    const values = [...Object.values(rest), now, id];
    run(`UPDATE transactions SET ${fields} WHERE id = ?`, values);
  }
  
  if (subitems !== undefined) {
    run('DELETE FROM subitems WHERE transaction_id = ?', [id]);
    if (subitems?.length) {
      for (const s of subitems) {
        if (s.descricao && s.valor > 0) {
          run(
            `INSERT INTO subitems (transaction_id, descricao, valor, categoria, subcategoria) VALUES (?, ?, ?, ?, ?)`,
            [id, s.descricao, s.valor, s.categoria || '', s.subcategoria || '']
          );
        }
      }
    }
  }
  
  return getTransactionById(id)!;
};

export const deleteTransaction = (id: number): void => {
  run('DELETE FROM subitems WHERE transaction_id = ?', [id]);
  run('DELETE FROM transactions WHERE id = ?', [id]);
};

export const toggleStatus = (id: number): Transaction => {
  const t = getTransactionById(id);
  const newStatus = t?.status === 'executada' ? 'nao_executada' : 'executada';
  const now = new Date().toISOString();
  run('UPDATE transactions SET status = ?, updatedAt = ? WHERE id = ?', [newStatus, now, id]);
  return getTransactionById(id)!;
};

export const CATEGORIAS = {
  entrada: [
    { nome: 'Salário', subcategorias: ['Principal', 'Extra', 'Bonificação'] },
    { nome: 'Freelance', subcategorias: ['Projeto', 'Consultoria', 'Serviço'] },
    { nome: 'Investimentos', subcategorias: ['Rendimentos', 'Dividendos', 'Juros'] },
    { nome: 'Outros', subcategorias: ['Presente', 'Reembolso', 'Venda'] },
  ],
  saida: [
    { nome: 'Moradia', subcategorias: ['Aluguel', 'Condomínio', 'IPTU', 'Luz', 'Água', 'Internet'] },
    { nome: 'Transporte', subcategorias: ['Combustível', 'Uber', 'Ônibus', 'Estacionamento'] },
    { nome: 'Alimentação', subcategorias: ['Supermercado', 'Delivery', 'In Loco'] },
    { nome: 'Saúde', subcategorias: ['Plano de saúde', 'Medicamentos', 'Médico', 'Preventiva'] },
    { nome: 'Educação', subcategorias: ['Faculdade', 'Curso', 'Livros', 'Material'] },
    { nome: 'Lazer', subcategorias: ['Streaming', 'Cinema', 'Jogos', 'Bar'] },
    { nome: 'Cartão', subcategorias: ['Parcelas', 'Compras', 'Anuidade'] },
    { nome: 'Ferramentas', subcategorias: ['Equipamentos', 'Software', 'Manutenção'] },
    { nome: 'Outros', subcategorias: ['Higiene', 'Seguro', 'Impostos', 'Assinatura'] },
  ],
};

export const fixDates = (): void => {
  const transactions = queryAll('SELECT id, data FROM transactions');
  for (const t of transactions) {
    const date = new Date(t.data + 'T00:00:00');
    date.setDate(date.getDate() + 1);
    const fixedDate = date.toISOString().split('T')[0];
    run('UPDATE transactions SET data = ? WHERE id = ?', [fixedDate, t.id]);
  }
};

export function getDb() {
  return db;
}
