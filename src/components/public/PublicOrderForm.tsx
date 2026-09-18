import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Plus, X, ShoppingBag, AlertTriangle } from 'lucide-react';

const PublicShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-zinc-50 flex flex-col items-center px-4 py-10">
    <div className="w-full max-w-2xl">
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center text-white font-black">AK</div>
        <span className="text-xl font-black tracking-tight text-zinc-900">Akanni Confecções</span>
      </div>
      {children}
      <p className="text-center text-[11px] text-zinc-400 mt-8">Ambiente seguro · Akanni Confecções</p>
    </div>
  </div>
);

interface Catalog { produtos: string[]; tamanhos: string[]; golas: string[]; }
interface Row { produto: string; tamanho: string; gola: string; cor: string; quantidade: number; observacao: string; }

const emptyRow = (produtos: string[]): Row => ({ produto: produtos[0] || '', tamanho: '', gola: '', cor: '', quantidade: 1, observacao: '' });

export const PublicOrderForm: React.FC<{ token: string }> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [clientName, setClientName] = useState('');
  const [catalog, setCatalog] = useState<Catalog>({ produtos: [], tamanhos: [], golas: [] });
  const [rows, setRows] = useState<Row[]>([]);
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [cliResp, catResp] = await Promise.all([
          fetch(`/api/public/cliente/${encodeURIComponent(token)}`),
          fetch('/api/public/catalogo'),
        ]);
        const cli = await cliResp.json();
        if (!cliResp.ok || !cli.ok) { setInvalid(true); return; }
        setClientName(cli.nome || '');
        const cat = await catResp.json();
        const c: Catalog = { produtos: cat.produtos || [], tamanhos: cat.tamanhos || [], golas: cat.golas || [] };
        setCatalog(c);
        setRows([emptyRow(c.produtos)]);
      } catch {
        setInvalid(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const updateRow = (i: number, patch: Partial<Row>) => setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const addRow = () => setRows([...rows, emptyRow(catalog.produtos)]);
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const itens = rows.filter(r => r.produto && r.quantidade > 0);
    if (itens.length === 0) { setError('Adicione ao menos 1 produto com quantidade.'); return; }
    setSending(true);
    setError('');
    try {
      const resp = await fetch('/api/public/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, itens, observacoes: notes }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.erro || 'Não foi possível enviar o pedido.');
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const inputCls = "w-full px-3 h-11 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm";

  if (loading) return <PublicShell><div className="flex items-center justify-center gap-2 text-zinc-400 py-16"><Loader2 size={20} className="animate-spin" /> Carregando...</div></PublicShell>;

  if (invalid) return (
    <PublicShell>
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-8 text-center">
        <AlertTriangle size={44} className="text-amber-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-zinc-900">Link inválido</h1>
        <p className="text-zinc-500 text-sm mt-2">Este link de pedido não é válido ou expirou. Peça um novo link para a Akanni Confecções.</p>
      </div>
    </PublicShell>
  );

  if (done) return (
    <PublicShell>
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-8 text-center">
        <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-zinc-900">Pedido enviado!</h1>
        <p className="text-zinc-500 text-sm mt-2">Obrigado, {clientName}. Recebemos seu pedido e nossa equipe vai entrar em contato para confirmar os detalhes.</p>
        <button onClick={() => { setRows([emptyRow(catalog.produtos)]); setNotes(''); setDone(false); }} className="mt-6 px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800">Fazer outro pedido</button>
      </div>
    </PublicShell>
  );

  return (
    <PublicShell>
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 md:p-8">
        <div className="flex items-center gap-2 mb-1"><ShoppingBag size={20} className="text-zinc-900" /><h1 className="text-xl font-bold text-zinc-900">Novo Pedido</h1></div>
        <p className="text-zinc-500 text-sm mb-6">Olá{clientName ? `, ${clientName}` : ''}! Monte seu pedido abaixo.</p>

        <form onSubmit={submit} className="space-y-4">
          {rows.map((r, i) => (
            <div key={i} className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 relative">
              {rows.length > 1 && <button type="button" onClick={() => removeRow(i)} className="absolute top-3 right-3 p-1 text-red-400 hover:text-red-600"><X size={16} /></button>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Produto</label>
                  {catalog.produtos.length > 0 ? (
                    <select className={inputCls} value={r.produto} onChange={(e) => updateRow(i, { produto: e.target.value })}>
                      {catalog.produtos.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <input className={inputCls} placeholder="Ex: Camiseta" value={r.produto} onChange={(e) => updateRow(i, { produto: e.target.value })} />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Tamanho</label>
                    {catalog.tamanhos.length > 0 ? (
                      <select className={inputCls} value={r.tamanho} onChange={(e) => updateRow(i, { tamanho: e.target.value })}>
                        <option value="">—</option>
                        {catalog.tamanhos.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : <input className={inputCls} value={r.tamanho} onChange={(e) => updateRow(i, { tamanho: e.target.value })} />}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Qtd</label>
                    <input type="number" min={1} className={inputCls} value={r.quantidade} onChange={(e) => updateRow(i, { quantidade: Number(e.target.value) || 1 })} />
                  </div>
                </div>
                {catalog.golas.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Gola</label>
                    <select className={inputCls} value={r.gola} onChange={(e) => updateRow(i, { gola: e.target.value })}>
                      <option value="">—</option>
                      {catalog.golas.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Cor / detalhes</label>
                  <input className={inputCls} placeholder="Ex: Preto, azul..." value={r.cor} onChange={(e) => updateRow(i, { cor: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Observação do item</label>
                  <input className={inputCls} placeholder="Ex: estampa nas costas, nome bordado..." value={r.observacao} onChange={(e) => updateRow(i, { observacao: e.target.value })} />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addRow} className="text-sm font-bold text-zinc-600 hover:text-zinc-900 flex items-center gap-1"><Plus size={15} /> Adicionar produto</button>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Observações gerais</label>
            <textarea rows={3} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 text-sm resize-none" placeholder="Prazo desejado, referências, etc." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <p className="text-red-600 text-xs font-bold">{error}</p>}
          <button type="submit" disabled={sending} className="w-full py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {sending ? <Loader2 size={18} className="animate-spin" /> : <ShoppingBag size={18} />} Enviar pedido
          </button>
        </form>
      </div>
    </PublicShell>
  );
};
