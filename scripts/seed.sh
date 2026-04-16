#!/bin/bash

DB_FILE="mock.db"

echo "Criando banco mock.db..."
rm -f "$DB_FILE"

echo "Criando tabelas e inserindo dados..."

node -e "
const initSqlJs = require('sql.js');
const fs = require('fs');

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(\`
    CREATE TABLE transactions (
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
  \`);

  db.run(\`
    CREATE TABLE subitems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      categoria TEXT DEFAULT '',
      subcategoria TEXT DEFAULT '',
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    )
  \`);

  const now = new Date();
  const data = [];

  // Salário base
  const salario = 8500;
  
  // Meta de saldo por mês (a partir de abril/2026, indo para trás)
  // Ajustado para acumulado ficar ~zero
  const saldoMeta = {
    3: 200,     // Abr/2026 - atual, levemente positivo
    2: 500,     // Mar/2026 - positivo
    1: -500,    // Fev/2026 - negativo (carnaval)
    0: 100,     // Jan/2026 - levemente positivo
    11: 1800,   // Dez/2025 - bom (13º)
    10: -1200,  // Nov/2025 - negativo (Black Friday)
    9: 100,     // Out/2025 - equilibrado
    8: -800,    // Set/2025 - negativo (volta às aulas)
    7: -1500,   // Ago/2025 - negativo (pós-férias)
    6: -1800,   // Jul/2025 - negativo (férias!)
    5: 2000,    // Jun/2025 - positivo (freelance)
    4: 400      // Mai/2025 - positivo
  };

  // Base de gastos fixos
  const fixos = {
    aluguel: 1800,
    condominio: 450,
    internet: 100,
    streaming: 65,
    planoSaude: 350,
    faculdade: 850
  };
  
  const totalFixos = Object.values(fixos).reduce((a, b) => a + b, 0); // ~3615

  for (let m = 0; m < 12; m++) {
    const baseDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const year = baseDate.getFullYear();
    const month = String(baseDate.getMonth() + 1).padStart(2, '0');
    const mes = baseDate.getMonth();
    const isCurrentMonth = m === 0;

    // SALÁRIO
    data.push({
      tipo: 'entrada',
      descricao: 'Salário',
      data: year + '-' + month + '-01',
      status: 'executada',
      subitems: [{ descricao: 'Salário', valor: salario, categoria: 'Salário', subcategoria: 'Principal' }]
    });

    // ENTRADA EXTRA (freelance baseado no saldoMeta)
    const meta = saldoMeta[mes];
    if (mes === 5 || mes === 8) { // Jun ou Set - freelance
      data.push({
        tipo: 'entrada',
        descricao: 'Freelance',
        data: year + '-' + month + '-15',
        status: 'executada',
        subitems: [{ descricao: 'Projeto', valor: 2000, categoria: 'Freelance', subcategoria: 'Projeto' }]
      });
    }
    if (mes === 11) { // Dez - 13o
      data.push({
        tipo: 'entrada',
        descricao: '13º Salário',
        data: year + '-' + month + '-15',
        status: 'executada',
        subitems: [{ descricao: '13º', valor: 8500, categoria: 'Salário', subcategoria: 'Extra' }]
      });
    }

    // ENTRADA TOTAL
    const entradaExtra = (mes === 5 ? 2000 : 0) + (mes === 8 ? 2000 : 0) + (mes === 11 ? 8500 : 0);
    const entradaTotal = salario + entradaExtra;
    
    // GASTOS PARA ATINGIR META DE SALDO
    const gastosTotais = entradaTotal - meta;
    
    // Gastos fixos
    let gastosFixos = totalFixos;
    
    // Ajustes sazonais
    if (mes === 6 || mes === 7) gastosFixos += 800; // Férias
    if (mes === 11) gastosFixos += 500; // Natal
    if (mes === 1) gastosFixos += 150; // Carnaval
    if (mes === 0 || mes === 6 || mes === 7) gastosFixos += 70; // Energia maior
    
    // Gastos variáveis = total - fixos
    const gastosVariaveis = gastosTotais - gastosFixos;
    
    // Divisão proporcional
    const supermercado = Math.round(gastosVariaveis * 0.30);
    const cartao = Math.round(gastosVariaveis * 0.35);
    const transporte = Math.round(gastosVariaveis * 0.20);
    const outros = Math.round(gastosVariaveis * 0.15);

    // GASTOS FIXOS
    data.push({ tipo: 'saida', descricao: 'Aluguel', data: year + '-' + month + '-05', status: 'executada', subitems: [{ descricao: 'Aluguel', valor: fixos.aluguel, categoria: 'Moradia', subcategoria: 'Aluguel' }] });
    data.push({ tipo: 'saida', descricao: 'Condomínio', data: year + '-' + month + '-05', status: 'executada', subitems: [{ descricao: 'Condomínio', valor: fixos.condominio, categoria: 'Moradia', subcategoria: 'Condomínio' }] });
    data.push({ tipo: 'saida', descricao: 'Internet', data: year + '-' + month + '-05', status: 'executada', subitems: [{ descricao: 'Vivo Fibra', valor: fixos.internet, categoria: 'Moradia', subcategoria: 'Internet' }] });
    data.push({ tipo: 'saida', descricao: 'Streaming', data: year + '-' + month + '-08', status: 'executada', subitems: [{ descricao: 'Netflix', valor: 45, categoria: 'Lazer', subcategoria: 'Streaming' }, { descricao: 'Spotify', valor: 20, categoria: 'Lazer', subcategoria: 'Streaming' }] });
    data.push({ tipo: 'saida', descricao: 'Plano de Saúde', data: year + '-' + month + '-12', status: 'executada', subitems: [{ descricao: 'Unimed', valor: fixos.planoSaude, categoria: 'Saúde', subcategoria: 'Plano de saúde' }] });
    data.push({ tipo: 'saida', descricao: 'Faculdade', data: year + '-' + month + '-15', status: 'executada', subitems: [{ descricao: 'Parcela', valor: fixos.faculdade, categoria: 'Educação', subcategoria: 'Faculdade' }] });

    // SUPERMERCADO (2x)
    data.push({ tipo: 'saida', descricao: 'Supermercado', data: year + '-' + month + '-10', status: 'executada', subitems: [{ descricao: 'Compras', valor: Math.round(supermercado / 2), categoria: 'Alimentação', subcategoria: 'Supermercado' }] });
    data.push({ tipo: 'saida', descricao: 'Supermercado', data: year + '-' + month + '-25', status: 'executada', subitems: [{ descricao: 'Compras', valor: Math.round(supermercado / 2), categoria: 'Alimentação', subcategoria: 'Supermercado' }] });

    // TRANSPORTE
    const uberCount = mes === 6 || mes === 7 ? 5 : 3;
    [5, 12, 20, 27].slice(0, uberCount).forEach(day => {
      data.push({ tipo: 'saida', descricao: 'Uber', data: year + '-' + month + '-' + String(day).padStart(2, '0'), status: 'executada', subitems: [{ descricao: 'Corridas', valor: Math.round(transporte / uberCount), categoria: 'Transporte', subcategoria: 'Uber' }] });
    });

    // ENERGIA
    const energia = mes === 0 || mes === 6 || mes === 7 ? 250 : 180;
    data.push({ tipo: 'saida', descricao: 'Energia', data: year + '-' + month + '-20', status: isCurrentMonth ? 'nao_executada' : 'executada', subitems: [{ descricao: 'Conta Luz', valor: energia, categoria: 'Moradia', subcategoria: 'Luz' }] });

    // CARTÃO
    data.push({ tipo: 'saida', descricao: 'Cartão Crédito', data: year + '-' + month + '-28', status: isCurrentMonth ? 'nao_executada' : 'executada', subitems: [{ descricao: 'Compras', valor: cartao, categoria: 'Cartão', subcategoria: 'Compras' }] });

    // OUTROS (lazer, etc)
    if (mes === 6 || mes === 7) { // Férias
      data.push({ tipo: 'saida', descricao: 'Lazer', data: year + '-' + month + '-15', status: 'executada', subitems: [{ descricao: 'Passeio', valor: Math.round(outros * 0.6), categoria: 'Lazer', subcategoria: 'Viagem' }, { descricao: 'Restaurante', valor: Math.round(outros * 0.4), categoria: 'Alimentação', subcategoria: 'In Loco' }] });
    } else if (mes === 11) { // Natal
      data.push({ tipo: 'saida', descricao: 'Presentes', data: year + '-' + month + '-15', status: 'executada', subitems: [{ descricao: 'Presentes', valor: Math.round(outros), categoria: 'Outros', subcategoria: 'Presente' }] });
    } else if (outros > 200) {
      data.push({ tipo: 'saida', descricao: 'Outros', data: year + '-' + month + '-18', status: 'executada', subitems: [{ descricao: 'Diversos', valor: outros, categoria: 'Outros', subcategoria: 'Outros' }] });
    }

    // DIVIDENDOS
    if ([2, 5, 8, 11].includes(mes)) {
      data.push({ tipo: 'entrada', descricao: 'Dividendos', data: year + '-' + month + '-28', status: 'executada', subitems: [{ descricao: 'ETFs', valor: 250, categoria: 'Investimentos', subcategoria: 'Dividendos' }] });
    }
  }

  // Ordena por data
  data.sort((a, b) => new Date(a.data) - new Date(b.data));

  for (const t of data) {
    const valor = t.subitems.reduce((a, s) => a + s.valor, 0);
    db.run('INSERT INTO transactions (tipo, descricao, valor, data, status) VALUES (?, ?, ?, ?, ?)',
      [t.tipo, t.descricao, valor, t.data, t.status]);
    const lastId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
    for (const s of t.subitems) {
      db.run('INSERT INTO subitems (transaction_id, descricao, valor, categoria, subcategoria) VALUES (?, ?, ?, ?, ?)',
        [lastId, s.descricao, s.valor, s.categoria, s.subcategoria]);
    }
  }

  const dataBuffer = db.export();
  fs.writeFileSync('$DB_FILE', Buffer.from(dataBuffer));
  
  console.log(data.length + ' transações inseridas');
  console.log('\\nResumo por mês:');
  
  const byMonth = {};
  data.forEach(t => {
    const ym = t.data.substring(0, 7);
    if (!byMonth[ym]) byMonth[ym] = { entrada: 0, saida: 0 };
    if (t.tipo === 'entrada') byMonth[ym].entrada += t.subitems.reduce((a, s) => a + s.valor, 0);
    else byMonth[ym].saida += t.subitems.reduce((a, s) => a + s.valor, 0);
  });
  
  Object.entries(byMonth).reverse().forEach(([ym, v]) => {
    const saldo = v.entrada - v.saida;
    const sinal = saldo >= 0 ? '+' : '';
    console.log(ym + ': Entrada ' + v.entrada.toLocaleString('pt-BR', {style:'currency', currency:'BRL'}) + ' | Saída ' + v.saida.toLocaleString('pt-BR', {style:'currency', currency:'BRL'}) + ' | Saldo ' + sinal + saldo.toLocaleString('pt-BR', {style:'currency', currency:'BRL'}));
  });
  
  db.close();
}

main().catch(err => { console.error('ERRO:', err); process.exit(1); });
"
