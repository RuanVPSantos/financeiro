'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';

type Subitem = {
  id?: number;
  descricao: string;
  valor: string;
  categoria: string;
  subcategoria: string;
};

type Transaction = {
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

const CATEGORIAS = {
  entrada: [
    { nome: 'Parcela', subcategorias: ['Recebida', 'Pendente'] },
    { nome: 'Manutenção', subcategorias: ['Serviço', 'Reparo'] },
    { nome: 'Entrada', subcategorias: ['Principal', 'Extra'] },
    { nome: 'Assinatura', subcategorias: ['Recorrente', 'Pontual'] },
    { nome: 'Investimentos', subcategorias: ['Rendimentos', 'Dividendos', 'Juros'] },
    { nome: 'Presentes', subcategorias: ['Dinheiro', 'Outro'] },
  ],
  saida: [
    { nome: 'Moradia', subcategorias: ['Aluguel', 'Condomínio', 'IPTU', 'Luz', 'Água', 'Internet'] },
    { nome: 'Transporte', subcategorias: ['Combustível', 'Uber', 'Ônibus', 'Estacionamento'] },
    { nome: 'Alimentação', subcategorias: ['Supermercado', 'Delivery', 'In Loco'] },
    { nome: 'Saúde', subcategorias: ['Plano de saúde', 'Medicamentos', 'Médico', 'Preventiva'] },
    { nome: 'Educação', subcategorias: ['Faculdade', 'Curso', 'Livros', 'Material'] },
    { nome: 'Lazer', subcategorias: ['Streaming', 'Cinema', 'Jogos', 'Bar'] },
    { nome: 'Cartão', subcategorias: ['Parcelas', 'Compras', 'Anuidade'] },
    { nome: 'Casa', subcategorias: ['Eletrodomésticos', 'Móveis', 'Decoração', 'Utensílios', 'Manutenção'] },
    { nome: 'Ferramentas', subcategorias: ['Equipamentos', 'Software', 'Manutenção'] },
    { nome: 'Outros', subcategorias: ['Higiene', 'Seguro', 'Impostos', 'Assinatura'] },
  ],
};

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string[]>(['entrada', 'saida']);
  const [filtroStatus, setFiltroStatus] = useState<string[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string[]>([]);
  const [mesAno, setMesAno] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [pagina, setPagina] = useState(1);
  const [ordenarPor, setOrdenarPor] = useState<'data' | 'data-asc' | 'valor' | 'valor-asc'>('data');
  const [dataFiltroInicio, setDataFiltroInicio] = useState('');
  const [dataFiltroFim, setDataFiltroFim] = useState('');
  const [itensPorPagina, setItensPorPagina] = useState(5);
  const [form, setForm] = useState({
    tipo: 'saida' as 'entrada' | 'saida',
    descricao: '',
    data: '',
    status: 'nao_executada' as 'executada' | 'nao_executada',
    subitems: [] as Subitem[]
  });

  const [alertMsg, setAlertMsg] = useState<{ message: string; type?: 'error' | 'success' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const [totals, setTotals] = useState<{
    entrada: number;
    saida: number;
    entradaExecutada: number;
    saidaExecutada: number;
    porMes: { mes: string; entrada: number; saida: number; saldo: number }[];
  } | null>(null);

  const fetchTransactions = async () => {
    const res = await fetch('/api/transactions');
    const data = await res.json();
    const totalsHeader = res.headers.get('x-totals');
    if (totalsHeader) {
      setTotals(JSON.parse(totalsHeader));
    }
    setTransactions(data);
    setLoading(false);
  };

  useEffect(() => { fetchTransactions(); }, []);

  const filtradasPorMes = transactions.filter(t => {
    const [ano, mes] = t.data.split('-');
    if (`${ano}-${mes}` !== mesAno) return false;
    if (dataFiltroInicio && t.data < dataFiltroInicio) return false;
    if (dataFiltroFim && t.data > dataFiltroFim) return false;
    return true;
  });

  const filtered = filtradasPorMes.filter(t => {
    if (filtroTipo.length > 0 && !filtroTipo.includes(t.tipo)) return false;
    if (filtroStatus.length > 0 && !filtroStatus.includes(t.status)) return false;
    if (filtroCategoria.length > 0) {
      const hasCategoria = t.subitems?.some(s => filtroCategoria.includes(s.categoria || ''));
      if (!hasCategoria) return false;
    }
    return true;
  }).sort((a, b) => {
    if (ordenarPor === 'valor') return b.valor - a.valor;
    if (ordenarPor === 'valor-asc') return a.valor - b.valor;
    if (ordenarPor === 'data-asc') return new Date(a.data).getTime() - new Date(b.data).getTime();
    return new Date(b.data).getTime() - new Date(a.data).getTime();
  });

  const totalPages = Math.ceil(filtered.length / itensPorPagina);
  const transactionsPaginadas = filtered.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina);

  const months = [];
  const firstDate = transactions.length > 0 ? new Date(Math.min(...transactions.map(t => new Date(t.data).getTime()))) : new Date();
  const now = new Date();
  for (let d = new Date(now); d >= firstDate; d.setMonth(d.getMonth() - 1)) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const formatMesAno = (ma: string) => {
    const [ano, mes] = ma.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(mes) - 1]} ${ano}`;
  };

  const totalsExibir = totals ? {
    entrada: totals.entrada,
    saida: totals.saida,
    entradaExecutada: totals.entradaExecutada,
    saidaExecutada: totals.saidaExecutada,
  } : {
    entrada: filtered.filter(t => t.tipo === 'entrada').reduce((a, t) => a + t.valor, 0),
    saida: filtered.filter(t => t.tipo === 'saida').reduce((a, t) => a + t.valor, 0),
    entradaExecutada: filtered.filter(t => t.tipo === 'entrada' && t.status === 'executada').reduce((a, t) => a + t.valor, 0),
    saidaExecutada: filtered.filter(t => t.tipo === 'saida' && t.status === 'executada').reduce((a, t) => a + t.valor, 0),
  };

  const saldoAtual = totalsExibir.entradaExecutada - totalsExibir.saidaExecutada;
  const saldoPrevisto = totalsExibir.entrada - totalsExibir.saida;
  const dataAtual = new Date().toISOString().split('T')[0];
  const vencidos = filtered.filter(t => t.tipo === 'saida' && t.status === 'nao_executada' && t.data < dataAtual).reduce((a, t) => a + t.valor, 0);

  const porCategoria = CATEGORIAS.saida.map(cat => {
    let valor = 0;
    const subcategorias: { nome: string; valor: number }[] = [];

    filtradasPorMes.forEach(t => {
      if (filtroStatus.length > 0 && !filtroStatus.includes(t.status)) return;
      
      if (t.subitems && t.subitems.length > 0) {
        t.subitems.forEach(s => {
          if (filtroCategoria.length > 0 && !filtroCategoria.includes(s.categoria || '')) return;
          const subCat = s.subcategoria || null;
          if (s.categoria === cat.nome) {
            valor += Number(s.valor);
            const subName = subCat || cat.subcategorias[0] || 'Geral';
            const existingSub = subcategorias.find(su => su.nome === subName);
            if (existingSub) {
              existingSub.valor += Number(s.valor);
            } else {
              subcategorias.push({ nome: subName, valor: Number(s.valor) });
            }
          }
        });
      }
    });

    return { nome: cat.nome, valor, subcategorias: subcategorias.filter(s => s.valor > 0) };
  }).filter(c => c.valor > 0).sort((a, b) => b.valor - a.valor);

  const totalSubitems = form.subitems.reduce((a, s) => a + Number(s.valor || 0), 0);

  const chartData = totals?.porMes.slice(-12).map(m => {
    const [, mes] = m.mes.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return { name: `${meses[parseInt(mes) - 1]} `, entrada: m.entrada, saida: m.saida, saldo: m.saldo };
  }) || [];

  const COLORS = ['#8b5cf6', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6'];

  const radarData = porCategoria.slice(0, 6).map((cat, i) => ({
    categoria: cat.nome.length > 8 ? cat.nome.substring(0, 8) + '.' : cat.nome,
    valor: cat.valor,
    fullValue: cat.valor,
    color: COLORS[i % COLORS.length]
  }));

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.subitems.length === 0) {
      setAlertMsg({ message: 'Adicione pelo menos um item', type: 'error' });
      return;
    }
    const validSubitems = form.subitems.filter(s => s.descricao && s.valor && Number(s.valor) > 0);
    if (validSubitems.length === 0) {
      setAlertMsg({ message: 'Adicione pelo menos um item com descrição e valor', type: 'error' });
      return;
    }
    const payload = {
      tipo: form.tipo,
      descricao: form.descricao,
      data: form.data,
      status: form.status,
      subitems: validSubitems
    };
    if (editing) {
      await fetch('/api/transactions', { method: 'PUT', body: JSON.stringify({ id: editing.id, ...payload }) });
    } else {
      await fetch('/api/transactions', { method: 'POST', body: JSON.stringify(payload) });
    }
    setShowModal(false);
    setEditing(null);
    setForm({ tipo: 'saida', descricao: '', data: '', status: 'nao_executada', subitems: [] });
    fetchTransactions();
  };

  const handleEdit = (t: Transaction) => {
    setEditing(t);
    setForm({
      tipo: t.tipo,
      descricao: t.descricao,
      data: t.data,
      status: t.status,
      subitems: t.subitems?.map(s => ({ ...s, valor: String(s.valor) })) || []
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    setConfirmDelete(id);
  };

  const confirmDeleteAction = async () => {
    if (confirmDelete) {
      await fetch('/api/transactions', { method: 'DELETE', body: JSON.stringify({ id: confirmDelete }) });
      setConfirmDelete(null);
      fetchTransactions();
    }
  };

  const handleToggle = async (id: number) => {
    await fetch('/api/transactions', { method: 'PATCH', body: JSON.stringify({ id }) });
    fetchTransactions();
  };

  const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    const dataHoje = today.toISOString().split('T')[0];

  const openNew = () => {
    setEditing(null);
    setForm({ tipo: 'saida', descricao: '', data: dataHoje, status: 'nao_executada', subitems: [] });
    setFiltroCategoria([]);
    setShowModal(true);
  };

  const addSubitem = () => {
    setForm(f => ({ ...f, subitems: [...f.subitems, { descricao: '', valor: '', categoria: '', subcategoria: '' }] }));
  };

  const updateSubitem = (index: number, field: keyof Subitem, value: string) => {
    setForm(f => ({
      ...f,
      subitems: f.subitems.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }));
  };

  const removeSubitem = (index: number) => {
    setForm(f => ({ ...f, subitems: f.subitems.filter((_, i) => i !== index) }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[var(--text-secondary)] text-xs">Carregando...</span>
        </div>
      </div>
    );
  }

  const hasFilters = filtroTipo.length > 0 || filtroStatus.length > 0 || filtroCategoria.length > 0;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto">
        <header className="sticky top-0 z-40 bg-[var(--bg)]/95 glass border-b border-[var(--border)]">
          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-lg font-semibold">Minhas Finanças</h1>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <button 
                    onClick={() => {
                      const [ano, mes] = mesAno.split('-');
                      const prev = new Date(parseInt(ano), parseInt(mes) - 2, 1);
                      setMesAno(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
                      setPagina(1);
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-white hover:bg-[var(--card-hover)] transition-colors"
                  >
                    ‹
                  </button>
                  <select 
                    value={mesAno}
                    onChange={e => { setMesAno(e.target.value); setPagina(1); }}
                    className="bg-transparent text-sm font-medium cursor-pointer appearance-none pr-1 focus:outline-none"
                  >
                    {months.map(m => (
                      <option key={m} value={m} className="bg-[var(--card-bg)]">{formatMesAno(m)}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => {
                      const [ano, mes] = mesAno.split('-');
                      const next = new Date(parseInt(ano), parseInt(mes), 1);
                      setMesAno(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
                      setPagina(1);
                    }}
                    disabled={mesAno >= `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-white hover:bg-[var(--card-hover)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ›
                  </button>
                </div>
              </div>
              <button onClick={openNew} className="bg-[var(--accent)] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:opacity-90 transition-opacity shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span className="hidden xs:inline">Nova</span>
              </button>
            </div>
            
            {(dataFiltroInicio || dataFiltroFim) && (
              <div className="flex items-center gap-2 mt-3 text-xs">
                <span className="text-[var(--text-secondary)]">Período:</span>
                <span className="px-2 py-0.5 bg-[var(--card-bg)] rounded text-[10px]">{dataFiltroInicio || '...'} → {dataFiltroFim || '...'}</span>
                <button onClick={() => { setDataFiltroInicio(''); setDataFiltroFim(''); setPagina(1); }} className="text-[var(--expense)] hover:underline text-[10px]">Limpar</button>
              </div>
            )}
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6">
          <div className="flex flex-col md:flex-row gap-5">
            <div className="flex-1 min-w-0 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">Saldo Atual</p>
                  <p className={`text-2xl font-bold ${saldoAtual >= 0 ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>{formatCurrency(saldoAtual)}</p>
                </div>
                <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">Previsto</p>
                  <p className={`text-2xl font-bold ${saldoPrevisto >= 0 ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>{formatCurrency(saldoPrevisto)}</p>
                </div>
                <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--border)] col-span-2 sm:col-span-1">
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">Vencidos</p>
                  <p className={`text-2xl font-bold ${vencidos > 0 ? 'text-[var(--expense)]' : 'text-[var(--text-secondary)]'}`}>{formatCurrency(vencidos)}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setFiltroTipo(p => p.includes('entrada') ? p.filter(x => x !== 'entrada') : [...p, 'entrada'])}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filtroTipo.includes('entrada') ? 'bg-[var(--income)] text-black' : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-white border border-[var(--border)]'}`}
                  >
                    Entradas
                  </button>
                  <button
                    onClick={() => setFiltroTipo(p => p.includes('saida') ? p.filter(x => x !== 'saida') : [...p, 'saida'])}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filtroTipo.includes('saida') ? 'bg-[var(--expense)] text-white' : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-white border border-[var(--border)]'}`}
                  >
                    Saídas
                  </button>
                  <div className="w-px h-5 bg-[var(--border)] hidden sm:block"></div>
                  <button
                    onClick={() => setFiltroStatus(s => s.includes('executada') ? s.filter(x => x !== 'executada') : [...s, 'executada'])}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filtroStatus.includes('executada') ? 'bg-blue-500 text-white' : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-white border border-[var(--border)]'}`}
                  >
                    Pago
                  </button>
                  <button
                    onClick={() => setFiltroStatus(s => s.includes('nao_executada') ? s.filter(x => x !== 'nao_executada') : [...s, 'nao_executada'])}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filtroStatus.includes('nao_executada') ? 'bg-amber-500 text-white' : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-white border border-[var(--border)]'}`}
                  >
                    Pendente
                  </button>
                </div>
                <select
                  value={ordenarPor}
                  onChange={e => setOrdenarPor(e.target.value as 'data' | 'valor')}
                  className="bg-[var(--card-bg)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm cursor-pointer focus:outline-none appearance-none pr-8"
                  style={{ backgroundImage: 'none' }}
                >
                  <option value="data">Mais recente</option>
                  <option value="data-asc">Mais antigo</option>
                  <option value="valor">Maior valor</option>
                  <option value="valor-asc">Menor valor</option>
                </select>
              </div>

              {porCategoria.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-6 pt-0 bg-[var(--bg)] rounded-lg px-1 mb-2">
                    <button
                      onClick={() => setFiltroCategoria([])}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                        filtroCategoria.length === 0 ? 'bg-[var(--accent)] text-white' : 'bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-secondary)]'
                      }`}
                    >
                      Todas
                    </button>
                    {CATEGORIAS.saida.map(cat => (
                      <button
                        key={cat.nome}
                        onClick={() => setFiltroCategoria(c => c.includes(cat.nome) ? c.filter(x => x !== cat.nome) : [...c, cat.nome])}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                          filtroCategoria.includes(cat.nome) ? 'bg-[var(--expense)] text-white' : 'bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {cat.nome}
                      </button>
                    ))}
                  </div>
              )}

              <div className="space-y-2 px-4 pt-2">
                {transactionsPaginadas.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => handleEdit(t)}
                    className="group bg-[var(--card-bg)] rounded-lg border border-[var(--border)] cursor-pointer hover:border-[var(--border-light)] transition-all"
                  >
                    <div className="p-3 flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggle(t.id); }}
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                          t.status === 'executada' ? 'border-[var(--income)] bg-[var(--income)]' : 'border-[var(--border-light)]'
                        }`}
                      >
                        {t.status === 'executada' && (
                          <svg className="w-2 h-2 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-base font-medium truncate ${t.status === 'executada' ? 'text-[var(--text-secondary)]' : ''}`}>{t.descricao}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${t.tipo === 'entrada' ? 'bg-[var(--income-bg)] text-[var(--income)]' : 'bg-[var(--expense-bg)] text-[var(--expense)]'}`}>
                            {t.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                          </span>
                          {t.subitems && t.subitems.length > 1 && (
                            <span className="text-xs px-2 py-0.5 rounded bg-[var(--accent-bg)] text-[var(--accent)]">
                              {t.subitems.length} itens
                            </span>
                          )}
                          <span className="text-xs text-[var(--text-tertiary)]">
                            {new Date(t.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <p className={`text-lg font-bold shrink-0 ${t.tipo === 'entrada' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
                        {t.tipo === 'entrada' ? '+' : '-'}{formatCurrency(
                          filtroCategoria.length > 0 && t.subitems?.length 
                            ? t.subitems.filter(s => filtroCategoria.includes(s.categoria || '')).reduce((a, s) => a + Number(s.valor), 0)
                            : t.valor
                        )}
                      </p>
                    </div>
                    {t.subitems && t.subitems.length > 0 && (
                      <div className="px-3 pb-2 pt-0 border-t border-[var(--border)]/30">
                        {t.subitems
                          .filter(s => filtroCategoria.length === 0 || filtroCategoria.includes(s.categoria || ''))
                          .map((s, i) => (
                            <div key={i} className="flex justify-between items-center py-1.5 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-[var(--text-tertiary)]">•</span>
                                <span className="text-[var(--text-secondary)]">{s.descricao}</span>
                                {s.categoria && <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--card-hover)] text-[var(--text-tertiary)]">{s.categoria}</span>}
                              </div>
                              <span className="text-[var(--text-secondary)]">{formatCurrency(Number(s.valor))}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--card-bg)] flex items-center justify-center">
                      <svg className="w-8 h-8 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-base text-[var(--text-secondary)] mb-1">Nenhuma transação</p>
                    <p className="text-sm text-[var(--text-tertiary)]">Toque no + para adicionar</p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-secondary)]">Mostrar</span>
                    <select
                      value={itensPorPagina}
                      onChange={e => { setItensPorPagina(Number(e.target.value)); setPagina(1); }}
                      className="bg-[var(--card-bg)] border border-[var(--border)] rounded px-2 py-1 text-xs cursor-pointer focus:outline-none"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setPagina(p => Math.max(1, p - 1))}
                        disabled={pagina === 1}
                        className="w-7 h-7 rounded bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--card-hover)] transition-colors"
                      >
                        ‹
                      </button>
                      <span className="text-xs text-[var(--text-secondary)] px-2">
                        {pagina}/{totalPages}
                      </span>
                      <button 
                        onClick={() => setPagina(p => Math.min(totalPages, p + 1))}
                        disabled={pagina === totalPages}
                        className="w-7 h-7 rounded bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--card-hover)] transition-colors"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full md:w-80 shrink-0 space-y-4">
                <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--border)]">
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Por Categoria</h3>
                {radarData.length > 0 ? (
                  <>
                    <div style={{ height: 192, minHeight: 192 }}>
                      <ResponsiveContainer width="100%" height={192}>
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                          <PolarGrid stroke="#27272a" />
                          <PolarAngleAxis dataKey="categoria" tick={{ fill: '#71717a', fontSize: 10 }} />
                          <Radar name="Gastos" dataKey="valor" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-3">
                      {porCategoria.slice(0, 5).map((cat, i) => (
                        <div key={cat.nome} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                            <span className="text-sm text-[var(--text-primary)]">{cat.nome}</span>
                          </div>
                          <span className="text-sm font-semibold text-[var(--expense)]">{formatCurrency(cat.valor)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[var(--text-tertiary)] text-center py-6">Sem despesas cadastradas</p>
                )}
              </div>

              {chartData.length > 0 && (
                <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--border)]">
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Evolução do Saldo</h3>
                  <div style={{ height: 160, minHeight: 160 }}>
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#fafafa' }}
                          formatter={(value, name) => [formatCurrency(value as number), name === 'saldo' ? 'Saldo' : name]}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="saldo" 
                          stroke="#8b5cf6" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorSaldo)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

      <button 
        onClick={openNew} 
        className="fixed bottom-6 right-6 md:hidden bg-[var(--accent)] text-white w-14 h-14 rounded-2xl flex items-center justify-center active:scale-95 transition-transform shadow-lg shadow-[var(--accent)]/30"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 glass flex items-end md:items-center justify-center p-0 md:p-4 z-50">
          <div className="bg-[var(--card-bg)] w-full md:max-w-lg md:rounded-2xl border-t md:border border-[var(--border)] animate-slide-up max-h-[95vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border)]">
              <h2 className="text-base font-semibold">{editing ? 'Editar' : 'Nova'} Transação</h2>
              <button onClick={() => { setShowModal(false); setEditing(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-white hover:bg-[var(--card-hover)] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              <form id="transaction-form" onSubmit={handleSubmit} className="space-y-5">
                <div className="flex gap-2 p-1 bg-[var(--bg)] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, tipo: 'saida' }))}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${form.tipo === 'saida' ? 'bg-[var(--expense)] text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}
                  >
                    Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, tipo: 'entrada' }))}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${form.tipo === 'entrada' ? 'bg-[var(--income)] text-black' : 'text-[var(--text-secondary)] hover:text-white'}`}
                  >
                    Receita
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Descrição</label>
                  <input 
                    value={form.descricao} 
                    onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} 
                    required 
                    placeholder="Ex: Crédito BB, Salário..." 
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Data</label>
                    <input 
                      type="date" 
                      value={form.data} 
                      onChange={e => setForm(f => ({ ...f, data: e.target.value }))} 
                      required 
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Status</label>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, status: f.status === 'executada' ? 'nao_executada' : 'executada' }))}
                      className={`w-full py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${form.status === 'executada' ? 'bg-[var(--income-bg)] text-[var(--income)] border border-[var(--income)]' : 'bg-[var(--bg)] text-[var(--text-secondary)] border border-[var(--border)]'}`}
                    >
                      {form.status === 'executada' ? (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                          Pago
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Pendente
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="border-t border-[var(--border)] pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Itens *</label>
                    <button type="button" onClick={addSubitem} className="text-xs text-[var(--accent)] hover:underline font-medium">+ Adicionar</button>
                  </div>
                  
                  {form.subitems.length === 0 ? (
                    <div className="p-4 rounded-xl border-2 border-dashed border-[var(--border)] text-center">
                      <p className="text-sm text-[var(--text-secondary)]">Adicione pelo menos um item</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[var(--text-secondary)]">Valor Total</span>
                          <span className="text-2xl font-bold text-[var(--accent)]">{formatCurrency(totalSubitems)}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {form.subitems.map((item, i) => (
                          <div key={i} className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
                            <div className="flex gap-2">
                              <input
                                value={item.descricao}
                                onChange={e => updateSubitem(i, 'descricao', e.target.value)}
                                placeholder="Descrição"
                                className="flex-1 px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] transition-all"
                              />
                              <div className="w-28 flex items-center bg-[var(--card-bg)] border border-[var(--border)] rounded-lg overflow-hidden">
                                <span className="pl-2 text-[var(--text-secondary)] text-xs">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.valor}
                                  onChange={e => updateSubitem(i, 'valor', e.target.value)}
                                  placeholder="0,00"
                                  className="w-full px-2 py-2 bg-transparent text-right text-sm focus:outline-none"
                                />
                              </div>
                              <button type="button" onClick={() => removeSubitem(i)} className="w-9 h-9 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--expense)] hover:bg-[var(--expense-bg)] rounded-lg transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                            <select
                              value={item.categoria}
                              onChange={e => updateSubitem(i, 'categoria', e.target.value)}
                              className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-sm cursor-pointer focus:outline-none focus:border-[var(--accent)] transition-all"
                            >
                              <option value="">Categoria</option>
                              {(form.tipo === 'entrada' ? CATEGORIAS.entrada : CATEGORIAS.saida).map(cat => (
                                <option key={cat.nome} value={cat.nome}>{cat.nome}</option>
                              ))}
                            </select>
                            {item.categoria && (
                              <select
                                value={item.subcategoria}
                                onChange={e => updateSubitem(i, 'subcategoria', e.target.value)}
                                className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-sm cursor-pointer focus:outline-none focus:border-[var(--accent)] transition-all"
                              >
                                <option value="">Subcategoria</option>
                                {(form.tipo === 'entrada' ? CATEGORIAS.entrada : CATEGORIAS.saida).find(c => c.nome === item.categoria)?.subcategorias.map(sub => (
                                  <option key={sub} value={sub}>{sub}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </form>
            </div>

            <div className="p-4 sm:p-5 border-t border-[var(--border)] flex gap-3">
              {editing && (
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); setTimeout(() => setConfirmDelete(editing.id), 300); }} 
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--expense)] hover:bg-[var(--expense-bg)] transition-colors"
                >
                  Excluir
                </button>
              )}
              <button 
                type="button" 
                onClick={() => { setShowModal(false); setEditing(null); }} 
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--card-hover)] transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="transaction-form"
                className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {alertMsg && (
        <div className="fixed inset-0 bg-black/70 glass flex items-center justify-center p-4 z-50" onClick={() => setAlertMsg(null)}>
          <div className="bg-[var(--card-bg)] rounded-2xl p-5 max-w-sm w-full border border-[var(--border)] animate-fade-in" onClick={e => e.stopPropagation()}>
            <p className={`text-sm text-center mb-4 ${alertMsg.type === 'error' ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>
              {alertMsg.message}
            </p>
            <button 
              onClick={() => setAlertMsg(null)}
              className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 glass flex items-center justify-center p-4 z-50" onClick={() => setConfirmDelete(null)}>
          <div className="bg-[var(--card-bg)] rounded-2xl p-5 max-w-sm w-full border border-[var(--border)] animate-fade-in" onClick={e => e.stopPropagation()}>
            <p className="text-sm text-center text-[var(--text-primary)] mb-4">
              Excluir transação?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--card-hover)] transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteAction}
                className="flex-1 py-2.5 rounded-xl bg-[var(--expense)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
