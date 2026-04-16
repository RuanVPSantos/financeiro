import { NextResponse } from 'next/server';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, toggleStatus, fixDates, initDb, NewTransaction } from '@/lib/db';

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
  const transactions = getTransactions();
  return NextResponse.json(transactions);
}

export async function POST(request: Request) {
  await ensureInit();
  const body: NewTransaction = await request.json();
  const transaction = createTransaction(body);
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
