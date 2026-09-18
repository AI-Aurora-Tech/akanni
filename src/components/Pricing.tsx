import React, { useState, useEffect } from 'react';
import { Calculator, Scale, Package, CalendarRange, FileBarChart, Loader2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

const currentMonth = () => new Date().toISOString().slice(0, 7);
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (v: any) => Number(String(v).replace(',', '.')) || 0;
const monthRange = (m: string) => {
  const start = `${m}-01`;
  const d = new Date(`${m}-01T00:00:00`);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);
  return { start, end };
};

type Tab = 'equilibrio' | 'produto' | 'dfc' | 'relatorios';

export const Pricing = () => {
  const [tab, setTab] = useState<Tab>('equilibrio');
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);

  const [fixedTotal, setFixedTotal] = useState(0);
  const [produced, setProduced] = useState(0);
  const [soldQty, setSoldQty] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [costs, setCosts] = useState<{ model: string; total: number }[]>([]);

  const [marginPct, setMarginPct] = useState('40');
  const [markupPct, setMarkupPct] = useState('70');

  const [dfc, setDfc] = useState<{ week: number; prev_in: number; real_in: number; prev_out: number; real_out: number }[]>(
    Array.from({ length: 5 }, (_, i) => ({ week: i + 1, prev_in: 0, real_in: 0, prev_out: 0, real_out: 0 }))
  );
  const [dfcConfig, setDfcConfig] = useState({ initial_balance: 0, overdraft: 0 });
  const [savingDfc, setSavingDfc] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { start, end } = monthRange(month);
      const [{ data: fx }, { data: sales }, { data: pc }, { data: dfcRows }, { data: cfg }] = await Promise.all([
        supabase.from('fixed_expenses').select('amount,active'),
        supabase.from('sales').select('value,quantity,is_bonus').gte('sale_date', start).lt('sale_date', end),
        supabase.from('production_costs').select('*'),
        supabase.from('dfc_weeks').select('*').eq('month', month),
        supabase.from('app_settings').select('*').eq('key', 'dfc_config').maybeSingle(),
      ]);
      setFixedTotal((fx || []).filter((f: any) => f.active).reduce((s: number, f: any) => s + num(f.amount), 0));
      const valid = (sales || []).filter((s: any) => !s.is_bonus);
      setSoldQty(valid.reduce((s: number, r: any) => s + (Number(r.quantity) || 0), 0));
      setRevenue(valid.reduce((s: number, r: any) => s + num(r.value), 0));
      setProduced(prev => prev || valid.reduce((s: number, r: any) => s + (Number(r.quantity) || 0), 0) || 1000);
      setCosts((pc || []).map((c: any) => ({ model: c.model, total: num(c.material_cost) + num(c.labor_cost) + num(c.other_cost) })));
      if (dfcRows && dfcRows.length) {
        setDfc(Array.from({ length: 5 }, (_, i) => {
          const r: any = dfcRows.find((x: any) => x.week_number === i + 1);
          return { week: i + 1, prev_in: num(r?.prev_in), real_in: num(r?.real_in), prev_out: num(r?.prev_out), real_out: num(r?.real_out) };
        }));
      }
      if (cfg?.value) setDfcConfig({ initial_balance: num(cfg.value.initial_balance), overdraft: num(cfg.value.overdraft) });
    } catch (err) {
      console.error('Error loading pricing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month]);

  // Ponto de equilíbrio
  const copUnit = produced > 0 ? fixedTotal / produced : 0;
  const avgMaterial = costs.length > 0 ? costs.reduce((s, c) => s + c.total, 0) / costs.length : 0;
  const avgPrice = soldQty > 0 ? revenue / soldQty : 0;
  const unitProfit = avgPrice - avgMaterial - copUnit;
  const totalCost = (avgMaterial + copUnit) * soldQty;
  const profitTotal = revenue - totalCost;

  const margin = num(marginPct);
  const markup = num(markupPct);
  const priceByMargin = (cost: number) => (margin < 100 ? cost / (1 - margin / 100) : cost);
  const priceByMarkup = (cost: number) => cost * (1 + markup / 100);

  const saveDfc = async () => {
    setSavingDfc(true);
    try {
      const rows = dfc.map(w => ({ month, week_number: w.week, prev_in: w.prev_in, real_in: w.real_in, prev_out: w.prev_out, real_out: w.real_out, updated_at: new Date().toISOString() }));
      const { error } = await supabase.from('dfc_weeks').upsert(rows, { onConflict: 'month,week_number' });
      if (error) throw error;
      await supabase.from('app_settings').upsert({ key: 'dfc_config', value: dfcConfig, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      alert('Fluxo de caixa salvo.');
    } catch (err: any) {
      alert('Erro ao salvar DFC: ' + err.message);
    } finally {
      setSavingDfc(false);
    }
  };

  const updDfc = (i: number, field: string, v: string) => setDfc(dfc.map((w, idx) => idx === i ? { ...w, [field]: num(v) } : w));

  // saldo acumulado (realizado)
  let running = dfcConfig.initial_balance;
  const dfcWithBalance = dfc.map(w => { running += (w.real_in - w.real_out); return { ...w, balance: running }; });

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'equilibrio', label: 'Ponto de Equilíbrio', icon: <Scale size={15} /> },
    { id: 'produto', label: 'Precificação por Produto', icon: <Package size={15} /> },
    { id: 'dfc', label: 'DFC Semanal', icon: <CalendarRange size={15} /> },
    { id: 'relatorios', label: 'Relatórios', icon: <FileBarChart size={15} /> },
  ];
  const inputCls = "w-full px-3 h-10 bg-zinc-50 border border-zinc-200 rounded-lg outline-none text-sm text-right";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2"><Calculator size={24} /> Precificação & Ponto de Equilíbrio</h1>
          <p className="text-zinc-500 text-sm">Puxa automaticamente das vendas, despesas fixas e custos por modelo já cadastrados.</p>
        </div>
        <input type="month" className="px-4 h-10 bg-white border border-zinc-200 rounded-xl outline-none text-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors ${tab === t.id ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>{t.icon}{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={18} className="animate-spin" /> Carregando...</div>
      ) : (
        <>
          {tab === 'equilibrio' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
                  <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-4">Produção</h3>
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Total de peças produzidas no período</label>
                  <input type="number" className="w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-sm mb-3" value={produced} onChange={(e) => setProduced(Number(e.target.value))} />
                  <div className="bg-amber-50 rounded-xl p-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">Custo operacional diluído</p>
                    <p className="text-2xl font-black text-amber-800">{brl(copUnit)}<span className="text-sm font-medium">/peça</span></p>
                    <p className="text-[11px] text-zinc-500 mt-1">Despesas fixas {brl(fixedTotal)} ÷ {produced} peças</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
                  <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-4">Vendas (do período)</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-zinc-500">Preço de venda médio</span><span className="font-bold">{brl(avgPrice)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Custo matéria-prima médio</span><span className="font-bold">{brl(avgMaterial)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Custo operacional / peça</span><span className="font-bold">{brl(copUnit)}</span></div>
                    <div className="flex justify-between border-t border-zinc-100 pt-2"><span className="text-zinc-700 font-semibold">Lucro por peça</span><span className={`font-black ${unitProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{brl(unitProfit)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Qtd. vendida</span><span className="font-bold">{soldQty}</span></div>
                  </div>
                </div>
              </div>
              <div className="bg-zinc-900 text-white rounded-2xl p-6 shadow-lg">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Lucro total do período</p>
                <p className={`text-3xl font-black mt-1 ${profitTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{brl(profitTotal)}</p>
                <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                  <div><p className="text-zinc-400 text-xs">Receita</p><p className="font-bold">{brl(revenue)}</p></div>
                  <div><p className="text-zinc-400 text-xs">Custo (mat. + op.)</p><p className="font-bold">{brl(totalCost)}</p></div>
                  <div><p className="text-zinc-400 text-xs">Margem</p><p className="font-bold">{revenue > 0 ? Math.round((profitTotal / revenue) * 100) : 0}%</p></div>
                </div>
              </div>
            </div>
          )}

          {tab === 'produto' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Margem desejada (%)</label>
                  <input type="number" className="w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-sm" value={marginPct} onChange={(e) => setMarginPct(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Markup desejado (%)</label>
                  <input type="number" className="w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-sm" value={markupPct} onChange={(e) => setMarkupPct(e.target.value)} />
                </div>
              </div>
              {costs.length === 0 ? (
                <p className="text-sm text-amber-700 bg-amber-50 rounded-xl p-3">Cadastre custos em <strong>Custos de Produção</strong> para ver os preços sugeridos por modelo.</p>
              ) : (
                <div className="bg-white rounded-2xl border border-zinc-200 overflow-x-auto shadow-sm">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead><tr className="bg-zinc-50 text-zinc-500 text-left text-[11px] uppercase tracking-widest">
                      <th className="px-5 py-3 font-bold">Modelo</th><th className="px-5 py-3 font-bold text-right">Custo material</th><th className="px-5 py-3 font-bold text-right">+ COP</th><th className="px-5 py-3 font-bold text-right">Custo real</th><th className="px-5 py-3 font-bold text-right">Preço p/ margem {margin}%</th><th className="px-5 py-3 font-bold text-right">Preço p/ markup {markup}%</th>
                    </tr></thead>
                    <tbody>
                      {costs.map(c => {
                        const real = c.total + copUnit;
                        return (
                          <tr key={c.model} className="border-t border-zinc-100">
                            <td className="px-5 py-3 font-semibold text-zinc-900">{c.model}</td>
                            <td className="px-5 py-3 text-right text-zinc-600">{brl(c.total)}</td>
                            <td className="px-5 py-3 text-right text-zinc-600">{brl(copUnit)}</td>
                            <td className="px-5 py-3 text-right font-bold text-zinc-900">{brl(real)}</td>
                            <td className="px-5 py-3 text-right text-emerald-700 font-bold">{brl(priceByMargin(real))}</td>
                            <td className="px-5 py-3 text-right text-blue-700 font-bold">{brl(priceByMarkup(real))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-zinc-400">Preço por margem = custo ÷ (1 − margem/100). Preço por markup = custo × (1 + markup/100). O COP usado vem do Ponto de Equilíbrio.</p>
            </div>
          )}

          {tab === 'dfc' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Saldo inicial (R$)</label>
                  <input type="number" className="w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-sm" value={dfcConfig.initial_balance} onChange={(e) => setDfcConfig({ ...dfcConfig, initial_balance: num(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Limite cheque especial (R$)</label>
                  <input type="number" className="w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-sm" value={dfcConfig.overdraft} onChange={(e) => setDfcConfig({ ...dfcConfig, overdraft: num(e.target.value) })} />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 overflow-x-auto shadow-sm">
                <table className="w-full text-sm min-w-[640px]">
                  <thead><tr className="bg-zinc-50 text-zinc-500 text-left text-[11px] uppercase tracking-widest">
                    <th className="px-4 py-3 font-bold">Semana</th><th className="px-4 py-3 font-bold">Prev. entrada</th><th className="px-4 py-3 font-bold">Real entrada</th><th className="px-4 py-3 font-bold">Prev. saída</th><th className="px-4 py-3 font-bold">Real saída</th><th className="px-4 py-3 font-bold text-right">Saldo</th><th className="px-4 py-3 font-bold">Situação</th>
                  </tr></thead>
                  <tbody>
                    {dfcWithBalance.map((w, i) => (
                      <tr key={w.week} className="border-t border-zinc-100">
                        <td className="px-4 py-2 font-semibold">Semana {w.week}</td>
                        <td className="px-4 py-2"><input type="number" className={inputCls} value={w.prev_in} onChange={(e) => updDfc(i, 'prev_in', e.target.value)} /></td>
                        <td className="px-4 py-2"><input type="number" className={inputCls} value={w.real_in} onChange={(e) => updDfc(i, 'real_in', e.target.value)} /></td>
                        <td className="px-4 py-2"><input type="number" className={inputCls} value={w.prev_out} onChange={(e) => updDfc(i, 'prev_out', e.target.value)} /></td>
                        <td className="px-4 py-2"><input type="number" className={inputCls} value={w.real_out} onChange={(e) => updDfc(i, 'real_out', e.target.value)} /></td>
                        <td className={`px-4 py-2 text-right font-bold ${w.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{brl(w.balance)}</td>
                        <td className="px-4 py-2">{w.balance >= 0 ? <span className="text-emerald-600 text-xs font-bold">✓ Positivo</span> : w.balance >= -dfcConfig.overdraft ? <span className="text-amber-600 text-xs font-bold">⚠ Cheque especial</span> : <span className="text-red-600 text-xs font-bold">✕ Estourado</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={saveDfc} disabled={savingDfc} className="px-5 h-11 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50">
                {savingDfc ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar fluxo de caixa
              </button>
            </div>
          )}

          {tab === 'relatorios' && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm max-w-xl">
              <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-4">Resumo do mês</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-zinc-50 pb-2"><span className="text-zinc-500">Mês</span><span className="font-bold">{month}</span></div>
                <div className="flex justify-between border-b border-zinc-50 pb-2"><span className="text-zinc-500">Total produzido (informado)</span><span className="font-bold">{produced.toLocaleString('pt-BR')} un.</span></div>
                <div className="flex justify-between border-b border-zinc-50 pb-2"><span className="text-zinc-500">Qtd. vendida</span><span className="font-bold">{soldQty.toLocaleString('pt-BR')} un.</span></div>
                <div className="flex justify-between border-b border-zinc-50 pb-2"><span className="text-zinc-500">Receita do período</span><span className="font-bold text-amber-700">{brl(revenue)}</span></div>
                <div className="flex justify-between border-b border-zinc-50 pb-2"><span className="text-zinc-500">Despesas fixas</span><span className="font-bold">{brl(fixedTotal)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-700 font-semibold">Lucro estimado</span><span className={`font-black ${profitTotal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{brl(profitTotal)}</span></div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
