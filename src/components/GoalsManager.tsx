import React, { useState, useEffect } from 'react';
import { Target, Save, Loader2, Trash2, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Goal {
  id: string;
  month: string;
  target_pieces: number;
  target_revenue?: number;
}

const currentMonth = () => new Date().toISOString().slice(0, 7);
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const monthLabel = (m: string) => {
  const [y, mo] = m.split('-');
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${names[Number(mo) - 1]}/${y}`;
};

export const GoalsManager = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [pieces, setPieces] = useState('');
  const [revenue, setRevenue] = useState('');
  const [soldThisMonth, setSoldThisMonth] = useState(0);
  const [revenueThisMonth, setRevenueThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('goals').select('*').order('month', { ascending: false });
      if (error) throw error;
      setGoals((data || []).map((g: any) => ({ ...g, target_pieces: Number(g.target_pieces) || 0, target_revenue: Number(g.target_revenue) || 0 })));
    } catch (err) {
      console.error('Error fetching goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSold = async (m: string) => {
    try {
      const start = `${m}-01`;
      const d = new Date(`${m}-01T00:00:00`);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);
      const { data } = await supabase.from('sales').select('quantity,value,is_bonus').gte('sale_date', start).lt('sale_date', end);
      const rows = (data || []).filter((r: any) => !r.is_bonus);
      setSoldThisMonth(rows.reduce((s: number, r: any) => s + (Number(r.quantity) || 0), 0));
      setRevenueThisMonth(rows.reduce((s: number, r: any) => s + (Number(r.value) || 0), 0));
    } catch { setSoldThisMonth(0); setRevenueThisMonth(0); }
  };

  useEffect(() => { fetchGoals(); }, []);
  useEffect(() => { fetchSold(month); }, [month]);

  useEffect(() => {
    const g = goals.find(x => x.month === month);
    setPieces(g ? String(g.target_pieces) : '');
    setRevenue(g && g.target_revenue ? String(g.target_revenue) : '');
  }, [month, goals]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        month,
        target_pieces: Number(pieces) || 0,
        target_revenue: Number(String(revenue).replace(',', '.')) || 0,
      };
      const existing = goals.find(g => g.month === month);
      if (existing) {
        const { error } = await supabase.from('goals').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('goals').insert(payload);
        if (error) throw error;
      }
      fetchGoals();
    } catch (err: any) {
      alert('Erro ao salvar meta: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta meta?')) return;
    try {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
      fetchGoals();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const currentGoal = goals.find(g => g.month === month);
  const target = currentGoal?.target_pieces || 0;
  const pct = target > 0 ? Math.min(100, Math.round((soldThisMonth / target) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2"><Target size={24} /> Metas de Venda</h1>
        <p className="text-zinc-500 text-sm">Defina a meta mensal em peças e acompanhe o desenvolvimento em tempo real.</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
        <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-4">Definir meta do mês</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Mês</label>
            <input type="month" className="w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Meta (em peças)</label>
            <input type="number" min={0} placeholder="Ex: 10000" className="w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={pieces} onChange={(e) => setPieces(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Meta faturamento (opcional)</label>
            <input type="text" inputMode="decimal" placeholder="R$ 0,00" className="w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={revenue} onChange={(e) => setRevenue(e.target.value)} />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="mt-4 px-5 h-11 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar meta do mês
        </button>
      </div>

      {/* Progresso */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2"><TrendingUp size={18} /> Desenvolvimento — {monthLabel(month)}</h3>
          <span className="text-sm font-black text-zinc-900">{pct}%</span>
        </div>
        {target > 0 ? (
          <>
            <div className="h-4 bg-zinc-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between mt-3 text-sm">
              <span className="text-zinc-600"><strong className="text-zinc-900">{soldThisMonth.toLocaleString('pt-BR')}</strong> de {target.toLocaleString('pt-BR')} peças</span>
              <span className="text-zinc-500">Faturamento: {brl(revenueThisMonth)}</span>
            </div>
          </>
        ) : (
          <p className="text-zinc-400 text-sm italic">Nenhuma meta definida para {monthLabel(month)}. Defina acima para ver o desenvolvimento.</p>
        )}
      </div>

      {/* Histórico */}
      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={18} className="animate-spin" /> Carregando...</div>
      ) : goals.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-left text-[11px] uppercase tracking-widest">
                <th className="px-5 py-3 font-bold">Mês</th>
                <th className="px-5 py-3 font-bold text-right">Meta (peças)</th>
                <th className="px-5 py-3 font-bold text-right">Meta faturamento</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {goals.map(g => (
                <tr key={g.id} className="border-t border-zinc-100">
                  <td className="px-5 py-3 font-semibold text-zinc-900">{monthLabel(g.month)}</td>
                  <td className="px-5 py-3 text-right">{g.target_pieces.toLocaleString('pt-BR')}</td>
                  <td className="px-5 py-3 text-right text-zinc-500">{g.target_revenue ? brl(g.target_revenue) : '—'}</td>
                  <td className="px-5 py-3 text-right"><button onClick={() => handleDelete(g.id)} className="p-1.5 bg-red-50 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100"><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
