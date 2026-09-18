import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, Wallet, CalendarClock, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PasswordGate } from './PasswordGate';
import { motion, AnimatePresence } from 'motion/react';

interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  due_day?: number | null;
  category?: string;
  active: boolean;
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ExpensesInner = () => {
  const [items, setItems] = useState<FixedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<FixedExpense | null>(null);
  const [form, setForm] = useState({ name: '', amount: '', due_day: '', category: '' });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('fixed_expenses').select('*').order('name');
      if (error) throw error;
      setItems((data || []).map((d: any) => ({ ...d, amount: Number(d.amount) || 0 })));
    } catch (err) {
      console.error('Error fetching fixed expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const openModal = (x?: FixedExpense) => {
    if (x) {
      setEditing(x);
      setForm({ name: x.name, amount: String(x.amount), due_day: x.due_day ? String(x.due_day) : '', category: x.category || '' });
    } else {
      setEditing(null);
      setForm({ name: '', amount: '', due_day: '', category: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        amount: Number(String(form.amount).replace(',', '.')) || 0,
        due_day: form.due_day ? Number(form.due_day) : null,
        category: form.category || null,
      };
      if (editing) {
        const { error } = await supabase.from('fixed_expenses').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('fixed_expenses').insert({ ...payload, active: true });
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (err: any) {
      alert('Erro ao salvar despesa: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta despesa fixa?')) return;
    try {
      const { error } = await supabase.from('fixed_expenses').delete().eq('id', id);
      if (error) throw error;
      fetchItems();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const toggleActive = async (x: FixedExpense) => {
    try {
      const { error } = await supabase.from('fixed_expenses').update({ active: !x.active }).eq('id', x.id);
      if (error) throw error;
      fetchItems();
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const total = items.filter(i => i.active).reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2"><Wallet size={24} /> Despesas Fixas</h1>
          <p className="text-zinc-500 text-sm">Custo fixo mensal da fábrica — alimenta o COP e o ponto de equilíbrio.</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center space-x-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors shadow-sm">
          <Plus size={18} /><span>Nova Despesa</span>
        </button>
      </div>

      <div className="bg-zinc-900 text-white rounded-2xl p-6 flex items-center justify-between shadow-lg">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Total de despesas fixas (ativas)</p>
          <p className="text-3xl font-black mt-1">{brl(total)}<span className="text-sm font-medium text-zinc-400"> / mês</span></p>
        </div>
        <Wallet size={40} className="opacity-20" />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={18} className="animate-spin" /> Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 bg-white rounded-2xl border border-dashed border-zinc-200">
          <Wallet size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Nenhuma despesa fixa cadastrada ainda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-x-auto shadow-sm">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-left text-[11px] uppercase tracking-widest">
                <th className="px-5 py-3 font-bold">Despesa</th>
                <th className="px-5 py-3 font-bold">Categoria</th>
                <th className="px-5 py-3 font-bold">Vencimento</th>
                <th className="px-5 py-3 font-bold text-right">Valor</th>
                <th className="px-5 py-3 font-bold text-center">Ativa</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(x => (
                <tr key={x.id} className={`border-t border-zinc-100 ${x.active ? '' : 'opacity-50'}`}>
                  <td className="px-5 py-3 font-semibold text-zinc-900">{x.name}</td>
                  <td className="px-5 py-3 text-zinc-500">{x.category || '—'}</td>
                  <td className="px-5 py-3 text-zinc-500">{x.due_day ? <span className="inline-flex items-center gap-1"><CalendarClock size={13} /> dia {x.due_day}</span> : '—'}</td>
                  <td className="px-5 py-3 text-right font-bold text-zinc-900">{brl(x.amount)}</td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => toggleActive(x)} className={`text-[10px] font-bold px-2 py-1 rounded-lg ${x.active ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>{x.active ? 'ATIVA' : 'INATIVA'}</button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => openModal(x)} className="p-1.5 bg-zinc-50 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(x.id)} className="p-1.5 bg-red-50 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-lg overflow-hidden relative shadow-2xl">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h2 className="text-xl font-bold text-zinc-900">{editing ? 'Editar Despesa' : 'Nova Despesa Fixa'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors"><Plus size={20} className="rotate-45" /></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Nome da despesa *</label>
                  <input required type="text" placeholder="Ex: Aluguel, Salários, Energia..." className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Valor mensal (R$) *</label>
                    <input required type="text" inputMode="decimal" placeholder="0,00" className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Dia venc.</label>
                    <input type="number" min={1} max={31} placeholder="1-31" className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={form.due_day} onChange={(e) => setForm({ ...form, due_day: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Categoria</label>
                  <input type="text" placeholder="Opcional" className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-zinc-600 hover:bg-zinc-100 rounded-xl font-medium transition-colors">Cancelar</button>
                  <button type="submit" className="px-8 py-2.5 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors shadow-lg"><Save size={18} className="inline mr-2" />Salvar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const FixedExpenses = () => (
  <PasswordGate gateId="despesas" title="Despesas Fixas — Acesso Restrito" description="Essa área mostra valores sensíveis (como salários). Digite a senha para continuar.">
    <ExpensesInner />
  </PasswordGate>
);
