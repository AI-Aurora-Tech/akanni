import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, RefreshCcw, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Rework {
  id: string;
  order_ref?: string;
  stage?: string;
  responsible?: string;
  event_date?: string;
  reason?: string;
  notes?: string;
}

const STAGES = ['Arte / Designer', 'Impressão', 'Corte', 'Bordado / DTF', 'Calandra', 'Costura', 'Acabamento', 'Expedição'];
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmt = (d?: string) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—');

export const ReworkLog = () => {
  const [items, setItems] = useState<Rework[]>([]);
  const [reasons, setReasons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ order_ref: '', stage: '', responsible: '', event_date: todayISO(), reason: '', notes: '' });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('rework').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data || []) as Rework[]);
    } catch (err) {
      console.error('Error fetching rework:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReasons = async () => {
    try {
      const { data } = await supabase.from('variant_options').select('value').eq('category', 'motivo_retrabalho').order('value');
      setReasons((data || []).map((d: any) => d.value));
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchItems(); fetchReasons(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('rework').insert({
        order_ref: form.order_ref || null,
        stage: form.stage || null,
        responsible: form.responsible || null,
        event_date: form.event_date || null,
        reason: form.reason || null,
        notes: form.notes || null,
      });
      if (error) throw error;
      setForm({ order_ref: '', stage: '', responsible: '', event_date: todayISO(), reason: '', notes: '' });
      fetchItems();
    } catch (err: any) {
      alert('Erro ao registrar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este registro?')) return;
    try {
      const { error } = await supabase.from('rework').delete().eq('id', id);
      if (error) throw error;
      fetchItems();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const filtered = items.filter(x =>
    (x.order_ref || '').toLowerCase().includes(search.toLowerCase()) ||
    (x.reason || '').toLowerCase().includes(search.toLowerCase()) ||
    (x.stage || '').toLowerCase().includes(search.toLowerCase())
  );

  const selectCls = "w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2"><RefreshCcw size={24} /> Retrabalho / Defeito</h1>
        <p className="text-zinc-500 text-sm">Toda peça que voltou por defeito — dá para ver depois se o problema se repete numa etapa ou fornecedor.</p>
      </div>

      <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest">+ Novo registro</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Pedido nº</label>
            <input type="text" placeholder="Ex: 1042" className={selectCls} value={form.order_ref} onChange={(e) => setForm({ ...form, order_ref: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Etapa onde foi percebido</label>
            <select className={selectCls} value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              <option value="">Selecione...</option>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Responsável</label>
            <input type="text" placeholder="Quem identificou / corrigiu" className={selectCls} value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Data</label>
            <input type="date" className={selectCls} value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Motivo</label>
            <select className={selectCls} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
              <option value="">Selecione...</option>
              {reasons.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Observações</label>
            <input type="text" placeholder="Opcional" className={selectCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <button type="submit" disabled={saving} className="px-5 h-11 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Registrar
        </button>
      </form>

      <div className="flex bg-white rounded-xl border border-zinc-200 px-5 py-2.5 max-w-md shadow-sm">
        <Search className="text-zinc-400 mr-2" size={20} />
        <input type="text" placeholder="Buscar por pedido, motivo ou etapa..." className="bg-transparent border-none focus:ring-0 w-full text-sm outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={18} className="animate-spin" /> Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 text-zinc-400 bg-white rounded-2xl border border-dashed border-zinc-200">
          <AlertTriangle size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Nenhum retrabalho registrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-x-auto shadow-sm">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-left text-[11px] uppercase tracking-widest">
                <th className="px-5 py-3 font-bold">Data</th>
                <th className="px-5 py-3 font-bold">Pedido</th>
                <th className="px-5 py-3 font-bold">Etapa</th>
                <th className="px-5 py-3 font-bold">Motivo</th>
                <th className="px-5 py-3 font-bold">Responsável</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(x => (
                <tr key={x.id} className="border-t border-zinc-100">
                  <td className="px-5 py-3 text-zinc-500">{fmt(x.event_date)}</td>
                  <td className="px-5 py-3 font-semibold text-zinc-900">{x.order_ref || '—'}</td>
                  <td className="px-5 py-3 text-zinc-600">{x.stage || '—'}</td>
                  <td className="px-5 py-3"><span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-1 rounded-lg">{x.reason || '—'}</span></td>
                  <td className="px-5 py-3 text-zinc-600">{x.responsible || '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => handleDelete(x.id)} className="p-1.5 bg-red-50 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
