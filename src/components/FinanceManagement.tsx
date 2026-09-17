import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Search, Loader2, Trash2, Download, Scale, BarChart3, Repeat, Ticket, TrendingUp, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PasswordGate } from './PasswordGate';

interface Sale {
  id: string;
  sale_date: string;
  value: number;
  quantity: number;
  segment?: string;
  channel?: string;
  client_note?: string;
  is_bonus: boolean;
}

const currentMonth = () => new Date().toISOString().slice(0, 7);
const todayISO = () => new Date().toISOString().slice(0, 10);
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (d?: string) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—');
const monthRange = (m: string) => {
  const start = `${m}-01`;
  const d = new Date(`${m}-01T00:00:00`);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);
  return { start, end };
};

// ------------------------- Aba Vendas -------------------------
const VendasTab = () => {
  const [form, setForm] = useState({ sale_date: todayISO(), value: '', quantity: '1', segment: '', channel: '', client_note: '', is_bonus: false });
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Sale[]>([]);
  const [segments, setSegments] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);

  const fetchRecent = async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase.from('sales').select('*').gte('sale_date', twoDaysAgo).order('created_at', { ascending: false });
    setRecent((data || []) as Sale[]);
  };

  const fetchDims = async () => {
    const { data } = await supabase.from('sales').select('segment,channel');
    const segs = new Set<string>(); const chs = new Set<string>();
    (data || []).forEach((r: any) => { if (r.segment) segs.add(r.segment); if (r.channel) chs.add(r.channel); });
    setSegments([...segs]); setChannels([...chs]);
  };

  useEffect(() => { fetchRecent(); fetchDims(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('sales').insert({
        sale_date: form.sale_date,
        value: Number(String(form.value).replace(',', '.')) || 0,
        quantity: Number(form.quantity) || 1,
        segment: form.segment || null,
        channel: form.channel || null,
        client_note: form.client_note || null,
        is_bonus: form.is_bonus,
      });
      if (error) throw error;
      setForm({ sale_date: todayISO(), value: '', quantity: '1', segment: '', channel: '', client_note: '', is_bonus: false });
      fetchRecent(); fetchDims();
    } catch (err: any) {
      alert('Erro ao registrar venda: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const doSearch = async (term: string) => {
    setSearch(term);
    if (term.trim().length < 2) { setResults([]); return; }
    const { data } = await supabase.from('sales').select('*').or(`client_note.ilike.%${term}%,segment.ilike.%${term}%,channel.ilike.%${term}%`).order('sale_date', { ascending: false }).limit(50);
    setResults((data || []) as Sale[]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta venda?')) return;
    await supabase.from('sales').delete().eq('id', id);
    fetchRecent();
    if (search) doSearch(search);
  };

  const inputCls = "w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm";

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest">Registrar nova venda</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Data</label>
            <input type="date" className={inputCls} value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Valor (R$)</label>
            <input required type="text" inputMode="decimal" placeholder="0,00" className={inputCls} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Qtd. peças</label>
            <input type="number" min={0} className={inputCls} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Segmento</label>
            <input type="text" list="seg-list" placeholder="Ramo do cliente" className={inputCls} value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} />
            <datalist id="seg-list">{segments.map(s => <option key={s} value={s} />)}</datalist>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Canal de aquisição</label>
            <input type="text" list="ch-list" placeholder="De onde veio" className={inputCls} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} />
            <datalist id="ch-list">{channels.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Cliente / observação</label>
            <input type="text" placeholder="Nome do cliente ou nº do pedido" className={inputCls} value={form.client_note} onChange={(e) => setForm({ ...form, client_note: e.target.value })} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
          <input type="checkbox" checked={form.is_bonus} onChange={(e) => setForm({ ...form, is_bonus: e.target.checked })} className="w-4 h-4 rounded" />
          Bonificação (produto teste/demonstração — não entra no total geral)
        </label>
        <button type="submit" disabled={saving} className="px-5 h-11 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Registrar venda
        </button>
      </form>

      <div>
        <div className="flex bg-white rounded-xl border border-zinc-200 px-5 py-2.5 max-w-md shadow-sm mb-4">
          <Search className="text-zinc-400 mr-2" size={20} />
          <input type="text" placeholder="Buscar venda por cliente, segmento ou canal..." className="bg-transparent border-none focus:ring-0 w-full text-sm outline-none" value={search} onChange={(e) => doSearch(e.target.value)} />
        </div>

        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">{search ? 'Resultados da busca' : 'Vendas dos últimos 2 dias'}</h3>
        <p className="text-xs text-zinc-400 mb-3 italic">Só para conferir se a venda foi lançada — sem valores de lucro. O relatório completo fica na aba Relatórios.</p>
        <div className="space-y-2">
          {(search ? results : recent).length === 0 ? (
            <p className="text-sm text-zinc-400 italic">{search ? 'Nenhuma venda encontrada.' : 'Nenhuma venda lançada nos últimos 2 dias.'}</p>
          ) : (search ? results : recent).map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-zinc-200 p-3 flex items-center justify-between text-sm shadow-sm">
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 truncate">{s.client_note || 'Venda'} {s.is_bonus && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold ml-1">BONIFICAÇÃO</span>}</p>
                <p className="text-xs text-zinc-500">{fmt(s.sale_date)} · {s.quantity} pç {s.segment ? `· ${s.segment}` : ''} {s.channel ? `· ${s.channel}` : ''}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-bold text-zinc-900">{brl(Number(s.value) || 0)}</span>
                <button onClick={() => handleDelete(s.id)} className="p-1.5 bg-red-50 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ------------------------- Aba Relatórios -------------------------
const RelatoriosInner = () => {
  const [month, setMonth] = useState(currentMonth());
  const [sales, setSales] = useState<Sale[]>([]);
  const [fixedTotal, setFixedTotal] = useState(0);
  const [traffic, setTraffic] = useState<{ id?: string; channel: string; amount: number }[]>([]);
  const [newTraffic, setNewTraffic] = useState({ channel: '', amount: '' });
  const [clientsRepurchase, setClientsRepurchase] = useState({ total: 0, repurchased: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { start, end } = monthRange(month);
      const [{ data: salesData }, { data: fixedData }, { data: trafficData }, { data: allSales }] = await Promise.all([
        supabase.from('sales').select('*').gte('sale_date', start).lt('sale_date', end),
        supabase.from('fixed_expenses').select('amount,active'),
        supabase.from('traffic_spend').select('*').eq('month', month),
        supabase.from('sales').select('client_note,is_bonus'),
      ]);
      setSales((salesData || []) as Sale[]);
      setFixedTotal((fixedData || []).filter((f: any) => f.active).reduce((s: number, f: any) => s + (Number(f.amount) || 0), 0));
      setTraffic((trafficData || []).map((t: any) => ({ id: t.id, channel: t.channel, amount: Number(t.amount) || 0 })));

      // taxa de recompra (histórico): clientes com mais de 1 venda
      const counts: Record<string, number> = {};
      (allSales || []).forEach((r: any) => { if (!r.is_bonus && r.client_note) { const k = r.client_note.trim().toLowerCase(); counts[k] = (counts[k] || 0) + 1; } });
      const keys = Object.keys(counts);
      setClientsRepurchase({ total: keys.length, repurchased: keys.filter(k => counts[k] > 1).length });
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month]);

  const validSales = sales.filter(s => !s.is_bonus);
  const totalRevenue = validSales.reduce((s, r) => s + (Number(r.value) || 0), 0);
  const totalPieces = validSales.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  const ticket = validSales.length > 0 ? totalRevenue / validSales.length : 0;
  const breakEvenPct = fixedTotal > 0 ? Math.round((totalRevenue / fixedTotal) * 100) : 0;
  const repurchaseRate = clientsRepurchase.total > 0 ? Math.round((clientsRepurchase.repurchased / clientsRepurchase.total) * 100) : 0;

  const groupBy = (key: 'segment' | 'channel') => {
    const g: Record<string, number> = {};
    validSales.forEach(s => { const k = (s[key] || 'Sem informação') as string; g[k] = (g[k] || 0) + (Number(s.value) || 0); });
    return Object.entries(g).sort((a, b) => b[1] - a[1]);
  };

  const addTraffic = async () => {
    if (!newTraffic.channel.trim()) return;
    try {
      const { error } = await supabase.from('traffic_spend').upsert({ month, channel: newTraffic.channel.trim(), amount: Number(String(newTraffic.amount).replace(',', '.')) || 0 }, { onConflict: 'month,channel' });
      if (error) throw error;
      setNewTraffic({ channel: '', amount: '' });
      load();
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const removeTraffic = async (id?: string) => {
    if (!id) return;
    await supabase.from('traffic_spend').delete().eq('id', id);
    load();
  };

  const revenueByChannel = (ch: string) => validSales.filter(s => (s.channel || '') === ch).reduce((s, r) => s + (Number(r.value) || 0), 0);

  const exportCsv = () => {
    const header = ['Data', 'Valor', 'Qtd', 'Segmento', 'Canal', 'Cliente/Obs', 'Bonificação'];
    const rows = sales.map(s => [fmt(s.sale_date), String(s.value).replace('.', ','), String(s.quantity), s.segment || '', s.channel || '', (s.client_note || '').replace(/;/g, ','), s.is_bonus ? 'Sim' : 'Não']);
    const csv = [header, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `vendas_${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const Card: React.FC<{ icon: React.ReactNode; title: string; value: string; hint?: string; accent?: string }> = ({ icon, title, value, hint, accent }) => (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-zinc-400 mb-2">{icon}<span className="text-[11px] font-black uppercase tracking-widest">{title}</span></div>
      <p className={`text-2xl font-black ${accent || 'text-zinc-900'}`}>{value}</p>
      {hint && <p className="text-xs text-zinc-400 mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-[11px] font-bold uppercase text-zinc-400 tracking-widest">Mês</label>
          <input type="month" className="px-4 h-10 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <button onClick={exportCsv} className="px-4 h-10 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-colors flex items-center gap-2"><Download size={16} /> Baixar Excel/CSV</button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={18} className="animate-spin" /> Carregando...</div>
      ) : (
        <>
          {/* Total */}
          <div className="bg-zinc-900 text-white rounded-2xl p-6 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Total de vendas no período</p>
              <p className="text-3xl font-black mt-1">{brl(totalRevenue)}</p>
              <p className="text-xs text-zinc-400 mt-1">{validSales.length} vendas · {totalPieces.toLocaleString('pt-BR')} peças</p>
            </div>
            <DollarSign size={44} className="opacity-20" />
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card icon={<Ticket size={16} />} title="Ticket médio" value={brl(ticket)} hint="Receita ÷ nº de vendas" />
            <Card icon={<Repeat size={16} />} title="Taxa de recompra" value={`${repurchaseRate}%`} hint={`${clientsRepurchase.repurchased} de ${clientsRepurchase.total} clientes (histórico)`} />
            <Card icon={<Scale size={16} />} title="Ponto de equilíbrio" value={`${breakEvenPct}%`} hint={`Receita ${brl(totalRevenue)} vs. despesas fixas ${brl(fixedTotal)}`} accent={breakEvenPct >= 100 ? 'text-emerald-600' : 'text-amber-600'} />
          </div>

          {/* Por segmento / canal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
              <h3 className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-1.5"><BarChart3 size={14} /> Por segmento</h3>
              {groupBy('segment').length === 0 ? <p className="text-sm text-zinc-400 italic">Sem vendas no período.</p> : groupBy('segment').map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1.5 border-b border-zinc-50 last:border-0 text-sm">
                  <span className="text-zinc-600">{k}</span><span className="font-bold text-zinc-900">{brl(v)}</span>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
              <h3 className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-1.5"><BarChart3 size={14} /> Por canal de aquisição</h3>
              {groupBy('channel').length === 0 ? <p className="text-sm text-zinc-400 italic">Sem vendas no período.</p> : groupBy('channel').map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1.5 border-b border-zinc-50 last:border-0 text-sm">
                  <span className="text-zinc-600">{k}</span><span className="font-bold text-zinc-900">{brl(v)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ROI de tráfego */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
            <h3 className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-1.5"><TrendingUp size={14} /> Retorno sobre investimento em tráfego (ROI)</h3>
            <p className="text-xs text-zinc-400 mb-4">Preencha quanto foi gasto em tráfego pago por canal neste mês — o retorno é calculado automaticamente com a receita do canal.</p>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input type="text" placeholder="Canal (ex: Instagram Ads)" className="flex-1 px-4 h-10 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-sm" value={newTraffic.channel} onChange={(e) => setNewTraffic({ ...newTraffic, channel: e.target.value })} />
              <input type="text" inputMode="decimal" placeholder="Gasto R$" className="w-32 px-4 h-10 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-sm" value={newTraffic.amount} onChange={(e) => setNewTraffic({ ...newTraffic, amount: e.target.value })} />
              <button onClick={addTraffic} className="px-4 h-10 bg-zinc-900 text-white rounded-xl font-bold text-sm flex items-center gap-1"><Save size={15} /> Salvar</button>
            </div>
            {traffic.length === 0 ? <p className="text-sm text-zinc-400 italic">Nenhum canal cadastrado neste mês.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="text-zinc-400 text-left text-[11px] uppercase tracking-widest"><th className="py-2">Canal</th><th className="py-2 text-right">Gasto</th><th className="py-2 text-right">Receita</th><th className="py-2 text-right">ROI</th><th></th></tr></thead>
                <tbody>
                  {traffic.map(t => {
                    const rev = revenueByChannel(t.channel);
                    const roi = t.amount > 0 ? ((rev - t.amount) / t.amount) * 100 : 0;
                    return (
                      <tr key={t.channel} className="border-t border-zinc-50">
                        <td className="py-2 text-zinc-700">{t.channel}</td>
                        <td className="py-2 text-right text-zinc-600">{brl(t.amount)}</td>
                        <td className="py-2 text-right text-zinc-600">{brl(rev)}</td>
                        <td className={`py-2 text-right font-bold ${roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{t.amount > 0 ? `${roi.toFixed(0)}%` : '—'}</td>
                        <td className="py-2 text-right"><button onClick={() => removeTraffic(t.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={13} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ------------------------- Container -------------------------
export const FinanceManagement = () => {
  const [tab, setTab] = useState<'vendas' | 'relatorios'>('vendas');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2"><DollarSign size={24} /> Financeiro / Vendas</h1>
        <p className="text-zinc-500 text-sm">Registre vendas e acompanhe os relatórios do negócio.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('vendas')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'vendas' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>Vendas</button>
        <button onClick={() => setTab('relatorios')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'relatorios' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>Relatórios Financeiros</button>
      </div>

      {tab === 'vendas' ? <VendasTab /> : (
        <PasswordGate gateId="financeiro" title="Relatórios — Acesso Restrito" description="Os relatórios mostram valores em R$. Digite a senha para acessar.">
          <RelatoriosInner />
        </PasswordGate>
      )}
    </div>
  );
};
