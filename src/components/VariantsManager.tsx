import React, { useState, useEffect } from 'react';
import { Plus, X, Tags, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface VariantOption {
  id: string;
  category: string;
  value: string;
}

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'produto', label: 'Produtos' },
  { key: 'gola', label: 'Tipo de Gola' },
  { key: 'manga', label: 'Tipo de Manga' },
  { key: 'modelo_bandeira', label: 'Modelo de Bandeira' },
  { key: 'tamanho', label: 'Tamanho' },
  { key: 'modelo_corte', label: 'Modelo (Corte)' },
  { key: 'motivo_retrabalho', label: 'Motivo de Retrabalho' },
];

const CategoryBlock: React.FC<{
  category: string;
  label: string;
  options: VariantOption[];
  onAdd: (category: string, value: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}> = ({ category, label, options, onAdd, onRemove }) => {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const v = value.trim();
    if (!v) return;
    setBusy(true);
    await onAdd(category, v);
    setValue('');
    setBusy(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
      <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-3">{label}</h3>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Adicionar novo..."
          className="flex-1 px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
        />
        <button onClick={submit} disabled={busy} className="px-4 h-11 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors flex items-center gap-1 disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Adicionar
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.length === 0 ? (
          <span className="text-xs text-zinc-400 italic">Nenhum item cadastrado.</span>
        ) : options.map(o => (
          <span key={o.id} className="inline-flex items-center gap-1.5 bg-zinc-100 text-zinc-800 text-sm px-3 py-1.5 rounded-lg">
            {o.value}
            <button onClick={() => onRemove(o.id)} className="text-zinc-400 hover:text-red-600 transition-colors"><X size={14} /></button>
          </span>
        ))}
      </div>
    </div>
  );
};

export const VariantsManager = () => {
  const [options, setOptions] = useState<VariantOption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('variant_options').select('*').order('value');
      if (error) throw error;
      setOptions((data || []) as VariantOption[]);
    } catch (err) {
      console.error('Error fetching variant options:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOptions(); }, []);

  const handleAdd = async (category: string, value: string) => {
    try {
      const { error } = await supabase.from('variant_options').insert({ category, value });
      if (error && !String(error.message).includes('duplicate')) throw error;
      fetchOptions();
    } catch (err: any) {
      alert('Erro ao adicionar: ' + err.message);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const { error } = await supabase.from('variant_options').delete().eq('id', id);
      if (error) throw error;
      setOptions(prev => prev.filter(o => o.id !== id));
    } catch (err: any) {
      alert('Erro ao remover: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2"><Tags size={24} /> Produtos & Variantes</h1>
        <p className="text-zinc-500 text-sm">Essas listas alimentam os campos de cada item do Pedido. Adicione conforme surgirem novos tipos — sem mexer em código.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={18} className="animate-spin" /> Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {CATEGORIES.map(c => (
            <CategoryBlock
              key={c.key}
              category={c.key}
              label={c.label}
              options={options.filter(o => o.category === c.key)}
              onAdd={handleAdd}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
};
