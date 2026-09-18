import React, { useState, useEffect } from 'react';
import { Coins, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Cost {
  id: string;
  model: string;
  material_cost: number;
  labor_cost: number;
  other_cost: number;
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (v: string) => Number(String(v).replace(',', '.')) || 0;

export const ProductionCosts = () => {
  const [costs, setCosts] = useState<Cost[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ model: '', material_cost: '', labor_cost: '', other_cost: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [{ data: c }, { data: m }] = await Promise.all([
        supabase.from('production_costs').select('*').order('model'),
        supabase.from('variant_options').select('value').eq('category', 'produto').order('value'),
      ]);
      setCosts((c || []).map((r: any) => ({ ...r, material_cost: Number(r.material_cost) || 0, labor_cost: Number(r.labor_cost) || 0, other_cost: Number(r.other_cost) || 0 })));
      setModels((m || []).map((r: any) => r.value));
    } catch (err) {
      console.error('Error loading costs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.model.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('production_costs').upsert({
        model: form.model.trim(),
        material_cost: num(form.material_cost),
        labor_cost: num(form.labor_cost),
        other_cost: num(form.other_cost),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'model' });
      if (error) throw error;
      setForm({ model: '', material_cost: '', labor_cost: '', other_cost: '' });
      load();
    } catch (err: any) {
      alert('Erro ao salvar custo: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este custo?')) return;
    await supabase.from('production_costs').delete().eq('id', id);
    load();
  };

  const inputCls = "w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2"><Coins size={24} /> Custos de Produção</h1>
        <p className="text-zinc-500 text-sm">Custo para fazer 1 peça de cada modelo (material + mão de obra + outros). Usado na Calculadora e na Precificação.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
        <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-4">Custo por peça, por modelo</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Modelo</label>
            <input type="text" list="model-list" placeholder="Ex: Camiseta" className={inputCls} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            <datalist id="model-list">{models.map(m => <option key={m} value={m} />)}</datalist>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Material (R$)</label>
            <input type="text" inputMode="decimal" placeholder="0,00" className={inputCls} value={form.material_cost} onChange={(e) => setForm({ ...form, material_cost: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Mão de obra (R$)</label>
            <input type="text" inputMode="decimal" placeholder="0,00" className={inputCls} value={form.labor_cost} onChange={(e) => setForm({ ...form, labor_cost: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Outros (R$)</label>
            <input type="text" inputMode="decimal" placeholder="0,00" className={inputCls} value={form.other_cost} onChange={(e) => setForm({ ...form, other_cost: e.target.value })} />
          </div>
        </div>
        <button type="submit" disabled={saving} className="mt-4 px-5 h-11 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar custo do modelo
        </button>
      </form>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={18} className="animate-spin" /> Carregando...</div>
      ) : costs.length === 0 ? (
        <div className="text-center py-14 text-zinc-400 bg-white rounded-2xl border border-dashed border-zinc-200">
          <Coins size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Nenhum custo cadastrado ainda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-x-auto shadow-sm">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-left text-[11px] uppercase tracking-widest">
                <th className="px-5 py-3 font-bold">Modelo</th>
                <th className="px-5 py-3 font-bold text-right">Material</th>
                <th className="px-5 py-3 font-bold text-right">Mão de obra</th>
                <th className="px-5 py-3 font-bold text-right">Outros</th>
                <th className="px-5 py-3 font-bold text-right">Custo total</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {costs.map(c => {
                const total = c.material_cost + c.labor_cost + c.other_cost;
                return (
                  <tr key={c.id} className="border-t border-zinc-100">
                    <td className="px-5 py-3 font-semibold text-zinc-900">{c.model}</td>
                    <td className="px-5 py-3 text-right text-zinc-600">{brl(c.material_cost)}</td>
                    <td className="px-5 py-3 text-right text-zinc-600">{brl(c.labor_cost)}</td>
                    <td className="px-5 py-3 text-right text-zinc-600">{brl(c.other_cost)}</td>
                    <td className="px-5 py-3 text-right font-bold text-zinc-900">{brl(total)}</td>
                    <td className="px-5 py-3 text-right"><button onClick={() => handleDelete(c.id)} className="p-1.5 bg-red-50 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100"><Trash2 size={14} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
