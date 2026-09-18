import React, { useState, useEffect } from 'react';
import { Bell, Phone, MessageSquare, Wallet, CalendarClock, CalendarDays, Star, Loader2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OrderRow {
  id: string;
  customer_name: string;
  created_at?: string;
  delivery_date?: string;
  status?: string;
  order_kind?: string;
  return_date?: string;
  total_value?: number;
  amount_paid?: number;
  items?: any[];
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.floor((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
const fmt = (d?: string) => (d ? new Date(d.length > 10 ? d : d + 'T00:00:00').toLocaleDateString('pt-BR') : '—');

interface Category {
  key: string; title: string; icon: React.ReactNode; color: string; hint: string;
  rows: { id: string; main: string; sub: string }[];
}

export const Pendencias = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [expenses, setExpenses] = useState<{ name: string; due_day?: number; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [{ data: ord }, { data: exp }] = await Promise.all([
        supabase.from('orders').select('id, customer_name, created_at, delivery_date, status, order_kind, return_date, total_value, amount_paid, items').order('created_at', { ascending: false }),
        supabase.from('fixed_expenses').select('name, due_day, amount, active'),
      ]);
      setOrders((ord || []) as OrderRow[]);
      setExpenses((exp || []).filter((e: any) => e.active).map((e: any) => ({ name: e.name, due_day: e.due_day, amount: Number(e.amount) || 0 })));
    } catch (err) {
      console.error('Error loading pendencias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const today = todayISO();
  const todayDay = new Date().getDate();

  const recontatar = orders.filter(o => o.created_at && daysBetween(today, o.created_at.slice(0, 10)) >= 60 && o.status !== 'delivered');
  const orcamentos = orders.filter(o => (o.order_kind === 'orcamento') && o.created_at && daysBetween(today, o.created_at.slice(0, 10)) >= 1);
  const cobrar = orders.filter(o => (Number(o.amount_paid) || 0) < (Number(o.total_value) || 0) && o.delivery_date && o.delivery_date.slice(0, 10) <= today && (Number(o.total_value) || 0) > 0);
  const retornoHoje = orders.filter(o => o.return_date && o.return_date.slice(0, 10) === today);
  const retornosFuturos = orders.filter(o => o.return_date && o.return_date.slice(0, 10) >= today);
  const avaliacao = orders.filter(o => o.status === 'delivered');
  const contas = expenses.filter(e => e.due_day && (e.due_day === todayDay || e.due_day === todayDay + 1));

  const orderSub = (o: OrderRow, extra?: string) => `#${o.id.slice(0, 8).toUpperCase()} · ${(o.items || []).length} itens${extra ? ' · ' + extra : ''}`;

  const categories: Category[] = [
    { key: 'recontatar', title: 'Hora de recontatar', icon: <Phone size={16} />, color: 'amber', hint: 'Cliente com pedido há uns 60 dias — hora de saber se está tudo certo.', rows: recontatar.map(o => ({ id: o.id, main: o.customer_name, sub: orderSub(o) })) },
    { key: 'orcamentos', title: 'Orçamentos aguardando retorno', icon: <MessageSquare size={16} />, color: 'red', hint: 'Orçamento feito há 1 dia ou mais, sem retorno do cliente ainda.', rows: orcamentos.map(o => ({ id: o.id, main: o.customer_name, sub: orderSub(o, fmt(o.created_at)) })) },
    { key: 'cobrar', title: 'Falta cobrar o restante do pagamento', icon: <Wallet size={16} />, color: 'yellow', hint: 'Prazo de envio venceu e o pedido ainda não está 100% pago.', rows: cobrar.map(o => ({ id: o.id, main: o.customer_name, sub: orderSub(o, `pago ${(Number(o.amount_paid) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de ${(Number(o.total_value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`) })) },
    { key: 'retornoHoje', title: 'Retorno agendado (hoje)', icon: <CalendarClock size={16} />, color: 'purple', hint: 'Cliente pediu para ser procurado numa data — chegou o dia.', rows: retornoHoje.map(o => ({ id: o.id, main: o.customer_name, sub: orderSub(o) })) },
    { key: 'retornosFuturos', title: 'Todos os retornos agendados', icon: <CalendarDays size={16} />, color: 'cyan', hint: 'Visão de todo mundo que pediu retorno — para se planejar.', rows: retornosFuturos.map(o => ({ id: o.id, main: o.customer_name, sub: orderSub(o, fmt(o.return_date)) })) },
    { key: 'contas', title: 'Contas a vencer', icon: <CalendarClock size={16} />, color: 'orange', hint: 'Despesas fixas com vencimento hoje ou amanhã.', rows: contas.map((e, i) => ({ id: 'exp' + i, main: e.name, sub: `Vence dia ${e.due_day} · ${e.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` })) },
    { key: 'avaliacao', title: 'Pedir avaliação / seguir', icon: <Star size={16} />, color: 'amber', hint: 'Pedido despachado — bom momento para pedir avaliação no Google e seguir no Instagram.', rows: avaliacao.map(o => ({ id: o.id, main: o.customer_name, sub: orderSub(o) })) },
  ];

  const colorMap: Record<string, string> = {
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  };

  const term = search.trim().toLowerCase();
  const matchRows = (rows: Category['rows']) => term ? rows.filter(r => r.main.toLowerCase().includes(term) || r.sub.toLowerCase().includes(term)) : rows;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2"><Bell size={24} /> Pendências</h1>
        <p className="text-zinc-500 text-sm">O que precisa de atenção hoje — recontatos, cobranças, retornos e contas.</p>
      </div>

      <div className="flex bg-white rounded-xl border border-zinc-200 px-5 py-2.5 max-w-md shadow-sm">
        <Search className="text-zinc-400 mr-2" size={20} />
        <input type="text" placeholder="Buscar por cliente ou pedido em todas as categorias..." className="bg-transparent border-none focus:ring-0 w-full text-sm outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={18} className="animate-spin" /> Carregando...</div>
      ) : (
        <div className="space-y-4">
          {categories.map(cat => {
            const rows = matchRows(cat.rows);
            return (
              <div key={cat.key} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                <div className={`px-5 py-3 border-l-4 flex items-center justify-between ${colorMap[cat.color]}`}>
                  <div className="flex items-center gap-2">
                    {cat.icon}
                    <span className="text-xs font-black uppercase tracking-widest">{cat.title}</span>
                  </div>
                  <span className="bg-white/60 text-zinc-700 text-[11px] font-bold px-2 py-0.5 rounded-full">{rows.length}</span>
                </div>
                <div className="px-5 py-3">
                  <p className="text-xs text-zinc-400 mb-2">{cat.hint}</p>
                  {rows.length === 0 ? (
                    <p className="text-sm text-zinc-400 italic">Nada por aqui no momento. ✓</p>
                  ) : (
                    <div className="space-y-1.5">
                      {rows.map(r => (
                        <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-zinc-50 last:border-0">
                          <span className="text-sm font-semibold text-zinc-900">{r.main}</span>
                          <span className="text-xs text-zinc-500">{r.sub}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
