import { NextResponse } from 'next/server';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, toggleStatus, fixDates, initDb, getTotals, NewTransaction, getCategorias, saveCategorias } from '@/lib/db';

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

export async function GET(request: Request) {
  await ensureInit();
  const { searchParams } = new URL(request.url);
  if (searchParams.get('fixDates') === 'true') {
    fixDates();
    return NextResponse.json({ success: true, message: 'Datas corrigidas' });
  }
  if (searchParams.get('categorias') === 'true') {
    const categorias = getCategorias();
    return NextResponse.json(categorias);
  }
  const transactions = getTransactions();
  const totals = getTotals(transactions);
  return NextResponse.json(transactions, { headers: { 'x-totals': JSON.stringify(totals) } });
}

export async function POST(request: Request) {
  await ensureInit();
  const body = await request.json();
  
  if (body.entrada && body.saida) {
    saveCategorias(body);
    return NextResponse.json({ success: true });
  }
  
  const transaction = createTransaction(body as NewTransaction);
  return NextResponse.json(transaction);
}

export async function PUT(request: Request) {
  await ensureInit();
  const { id, ...body } = await request.json();
  const transaction = updateTransaction(id, body);
  return NextResponse.json(transaction);
}

export async function DELETE(request: Request) {
  await ensureInit();
  const { id } = await request.json();
  deleteTransaction(id);
  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  await ensureInit();
  const { id } = await request.json();
  const transaction = toggleStatus(id);
  return NextResponse.json(transaction);
}

export async function GET_CATEGORIAS(request: Request) {
  await ensureInit();
  const categorias = getCategorias();
  return NextResponse.json(categorias);
}

export async function POST_CATEGORIAS(request: Request) {
  await ensureInit();
  const categorias = await request.json();
  saveCategorias(categorias);
  return NextResponse.json({ success: true });
}
