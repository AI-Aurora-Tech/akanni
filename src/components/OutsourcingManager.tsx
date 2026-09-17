import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Scissors, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Outsourcing {
  id: string;
  order_ref?: string;
  description?: string;
  seamstress?: string;
  exit_date?: string;
  return_deadline?: string;
  notes?: string;
  returned: boolean;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmt = (d?: string) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—');

export const OutsourcingManager = () => {
  const [items, setItems] = useState<Outsourcing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ order_ref: '', description: '', seamstress: '', exit_date: todayISO(), return_deadline: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('outsourcing').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data || []) as Outsourcing[]);
    } catch (err) {
      console.error('Error fetching outsourcing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('outsourcing').insert({
        order_ref: form.order_ref || null,
        description: form.description || null,
        seamstress: form.seamstress || null,
        exit_date: form.exit_date || null,
        return_deadline: form.return_deadline || null,
        notes: form.notes || null,
        returned: false,
      });
      if (error) throw error;
      setForm({ order_ref: '', description: '', seamstress: '', exit_date: todayISO(), return_deadline: '', notes: '' });
      fetchItems();
    } catch (err: any) {
      alert('Erro ao registrar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const markReturned = async (x: Outsourcing) => {
    try {
      const { error } = await supabase.from('outsourcing').update({ returned: !x.returned, returned_at: !x.returned ? new Date().toISOString() : null }).eq('id', x.id);
      if (error) throw error;
      fetchItems();
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este registro?')) return;
    try {
      const { error } = await supabase.from('outsourcing').delete().eq('id', id);
      if (error) throw error;
      fetchItems();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const filtered = items.filter(x =>
    (x.order_ref || '').toLowerCase().includes(search.toLowerCase()) ||
    (x.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (x.seamstress || '').toLowerCase().includes(search.toLowerCase())
  );
  const isLate = (x: Outsourcing) => !x.returned && x.return_deadline && x.return_deadline < todayISO();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2"><Scissors size={24} /> Terceirização</h1>
        <p className="text-zinc-500 text-sm">Toda peça que sai para costura externa — quem está com ela e quando volta.</p>
      </div>

      <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest">+ Nova peça terceirizada</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Pedido nº</label>
            <input type="text" placeholder="Ex: 1042" className="w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={form.order_ref} onChange={(e) => setForm({ ...form, order_ref: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Descrição da peça</label>
            <input type="text" placeholder="Ex: 12 polos gola V, tamanho M" className="w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Costureira</label>
            <input type="text" placeholder="Ex: Dona Maria, Zilma..." className="w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={form.seamstress} onChange={(e) => setForm({ ...form, seamstress: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Saída</label>
              <input type="date" className="w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={form.exit_date} onChange={(e) => setForm({ ...form, exit_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Retorno</label>
              <input type="date" className="w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={form.return_deadline} onChange={(e) => setForm({ ...form, return_deadline: e.target.value })} />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Observações</label>
            <input type="text" placeholder="Opcional" className="w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <button type="submit" disabled={saving} className="px-5 h-11 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Registrar saída
        </button>
      </form>

      <div className="flex bg-white rounded-xl border border-zinc-200 px-5 py-2.5 max-w-md shadow-sm">
        <Search className="text-zinc-400 mr-2" size={20} />
        <input type="text" placeholder="Buscar por pedido, peça ou costureira..." className="bg-transparent border-none focus:ring-0 w-full text-sm outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={18} className="animate-spin" /> Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 text-zinc-400 bg-white rounded-2xl border border-dashed border-zinc-200">
          <Scissors size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Nenhuma peça terceirizada registrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(x => (
            <div key={x.id} className={`bg-white rounded-2xl border p-4 shadow-sm ${isLate(x) ? 'border-red-200 ring-1 ring-red-100' : 'border-zinc-200'} ${x.returned ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <p className="font-bold text-zinc-900 truncate">{x.description || 'Peça sem descrição'}</p>
                  <p className="text-xs text-zinc-500">Pedido {x.order_ref || '—'} · {x.seamstress || 'sem costureira'}</p>
                </div>
                <button onClick={() => handleDelete(x.id)} className="p-1.5 bg-red-50 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100 shrink-0"><Trash2 size={14} /></button>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-zinc-500">Saída {fmt(x.exit_date)} → Retorno {fmt(x.return_deadline)}</span>
                {isLate(x) && <span className="text-red-600 font-bold flex items-center gap-1"><Clock size={12} /> Atrasada</span>}
              </div>
              {x.notes && <p className="text-xs text-zinc-400 italic mt-2">{x.notes}</p>}
              <button onClick={() => markReturned(x)} className={`mt-3 w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${x.returned ? 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                <CheckCircle2 size={14} /> {x.returned ? 'Voltou (desfazer)' : 'Marcar como retornada'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
