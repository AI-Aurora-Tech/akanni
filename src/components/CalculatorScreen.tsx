import React, { useState, useEffect } from 'react';
import { Calculator, Plus, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CostMap { [model: string]: number; }
interface Row { model: string; qty: number; }

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const CalculatorScreen = () => {
  const [costs, setCosts] = useState<CostMap>({});
  const [models, setModels] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([{ model: '', qty: 1 }]);
  const [nfPct, setNfPct] = useState('4');
  const [marginPct, setMarginPct] = useState('40');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('production_costs').select('*');
        const map: CostMap = {};
        (data || []).forEach((c: any) => { map[c.model] = (Number(c.material_cost) || 0) + (Number(c.labor_cost) || 0) + (Number(c.other_cost) || 0); });
        setCosts(map);
        setModels(Object.keys(map));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const nf = Number(nfPct) || 0;
  const margin = Number(marginPct) || 0;

  const pricePerPiece = (model: string) => {
    const cost = costs[model] || 0;
    // preço por margem: custo / (1 - margem/100), depois acresce imposto sobre o preço
    const base = margin < 100 ? cost / (1 - margin / 100) : cost;
    const withNf = nf > 0 ? base / (1 - nf / 100) : base;
    return withNf;
  };

  const addRow = () => setRows([...rows, { model: '', qty: 1 }]);
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<Row>) => setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));

  const totalGeral = rows.reduce((s, r) => s + (r.model ? pricePerPiece(r.model) * (r.qty || 0) : 0), 0);
  const inputCls = "w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2"><Calculator size={24} /> Calculadora de Preço</h1>
        <p className="text-zinc-500 text-sm">Apoio para pedidos especiais — soma custo do modelo + imposto + margem e entrega o preço mínimo por peça. Não afeta nenhum pedido lançado.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={18} className="animate-spin" /> Carregando custos...</div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest">Itens do orçamento</h3>
            {models.length === 0 && <p className="text-sm text-amber-700 bg-amber-50 rounded-xl p-3">Cadastre custos em <strong>Custos de Produção</strong> para a calculadora usar os valores automaticamente.</p>}
            {rows.map((r, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3 border-b border-zinc-50 pb-3">
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Modelo</label>
                  <input type="text" list="calc-models" className={inputCls} value={r.model} onChange={(e) => updateRow(i, { model: e.target.value })} />
                </div>
                <div className="w-24">
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Qtd</label>
                  <input type="number" min={1} className={inputCls} value={r.qty} onChange={(e) => updateRow(i, { qty: Number(e.target.value) })} />
                </div>
                <div className="text-right min-w-[140px]">
                  <p className="text-[11px] font-bold uppercase text-zinc-400 tracking-widest">Preço mín./peça</p>
                  <p className="text-lg font-black text-zinc-900">{r.model ? brl(pricePerPiece(r.model)) : '—'}</p>
                  {r.model && <p className="text-[11px] text-zinc-400">custo {brl(costs[r.model] || 0)}</p>}
                </div>
                {rows.length > 1 && <button onClick={() => removeRow(i)} className="p-2 text-red-400 hover:text-red-600 mb-1"><X size={18} /></button>}
              </div>
            ))}
            <datalist id="calc-models">{models.map(m => <option key={m} value={m} />)}</datalist>
            <button onClick={addRow} className="text-sm font-bold text-zinc-600 hover:text-zinc-900 flex items-center gap-1"><Plus size={15} /> Adicionar modelo</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
              <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-4">Opções do cálculo</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Nota fiscal (%)</label>
                  <input type="number" className={inputCls} value={nfPct} onChange={(e) => setNfPct(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Margem desejada (%)</label>
                  <input type="number" className={inputCls} value={marginPct} onChange={(e) => setMarginPct(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="bg-zinc-900 text-white rounded-2xl p-6 shadow-lg flex flex-col justify-center">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Total sugerido do orçamento</p>
              <p className="text-3xl font-black mt-1">{brl(totalGeral)}</p>
              <p className="text-xs text-zinc-400 mt-1">Soma de (preço mínimo × quantidade) de cada modelo.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
