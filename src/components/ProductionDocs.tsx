import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ClipboardList, Search, Printer, Loader2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderFull {
  id: string;
  customer_name: string;
  items: any[];
  delivery_date?: string;
  created_at?: string;
  production_route?: string;
  production_briefing?: string;
  seamstress_name?: string;
  production_notes?: string;
  notes?: string;
  production_stage?: string;
}

const fmt = (d?: string) => (d ? format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }) : '—');

/** Abre uma janela nova com HTML próprio e dispara a impressão (Salvar como PDF). */
function printDocument(title: string, bodyHtml: string) {
  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) { alert('Permita pop-ups para imprimir.'); return; }
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title>
    <style>
      *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#18181b;margin:32px;}
      h1{font-size:22px;margin:0 0 4px} h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#a16207;border-bottom:2px solid #eee;padding-bottom:4px;margin:22px 0 10px}
      .muted{color:#71717a;font-size:12px} .row{display:flex;gap:32px;flex-wrap:wrap;margin-bottom:8px}
      .row div{min-width:160px} .label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#a1a1aa}
      table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px} th,td{text-align:left;padding:8px;border-bottom:1px solid #eee}
      th{background:#f4f4f5;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#71717a}
      .box{border:1px solid #e4e4e7;border-radius:10px;padding:14px;margin-top:8px;white-space:pre-wrap;font-size:13px}
      .header{border-bottom:3px solid #a16207;padding-bottom:12px;margin-bottom:12px}
      @media print{body{margin:12mm}}
    </style></head><body>${bodyHtml}
    <script>window.onload=function(){window.print();}<\/script></body></html>`);
  w.document.close();
}

export const ProductionDocs = () => {
  const [orders, setOrders] = useState<OrderFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<OrderFull | null>(null);
  const [tab, setTab] = useState<'designer' | 'producao' | 'ficha'>('designer');
  const [seamstress, setSeamstress] = useState('');
  const [prodNotes, setProdNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      setOrders((data || []) as OrderFull[]);
    } catch (err) {
      console.error('Error fetching orders for docs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const selectOrder = (o: OrderFull) => {
    setSelected(o);
    setSeamstress(o.seamstress_name || '');
    setProdNotes(o.production_notes || '');
  };

  const saveProduction = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('orders').update({ seamstress_name: seamstress || null, production_notes: prodNotes || null }).eq('id', selected.id);
      if (error) throw error;
      setSelected({ ...selected, seamstress_name: seamstress, production_notes: prodNotes });
      fetchOrders();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = orders.filter(o =>
    o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    (o.items || []).some((i: any) => (i.shirtType || '').toLowerCase().includes(search.toLowerCase()))
  );

  const shortId = (id: string) => id.slice(0, 8).toUpperCase();

  const itemsRows = (o: OrderFull, withPrice: boolean) => (o.items || []).map((i: any) => `
    <tr>
      <td>${i.quantity || ''}x ${i.shirtType || 'Item'}</td>
      <td>${i.fabricColor || '—'} ${i.fabricType ? '· ' + i.fabricType : ''}</td>
      <td>${i.collarType || '—'}</td>
      ${withPrice ? `<td style="text-align:right">${i.unitPrice != null ? Number(i.unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</td>` : ''}
    </tr>`).join('');

  const printRomaneio = (kind: 'designer' | 'producao') => {
    if (!selected) return;
    const title = kind === 'designer' ? 'Romaneio — Designer' : 'Romaneio — Produção';
    const html = `
      <div class="header"><h1>AKANNI · ${title}</h1>
        <div class="muted">Pedido ${shortId(selected.id)} · Cliente: ${selected.customer_name}</div></div>
      <div class="row">
        <div><div class="label">Entrada</div>${fmt(selected.created_at)}</div>
        <div><div class="label">Data de envio</div>${fmt(selected.delivery_date)}</div>
        <div><div class="label">Rota de produção</div>${selected.production_route || '—'}</div>
        ${kind === 'producao' ? `<div><div class="label">Costureira</div>${selected.seamstress_name || '—'}</div>` : ''}
      </div>
      <h2>Briefing para produção</h2>
      <div class="box">${selected.production_briefing || 'Nenhum briefing registrado pelo Comercial ainda.'}</div>
      <h2>Itens — ${kind === 'designer' ? 'Personalização e Referência' : 'Ficha Técnica de Produção'}</h2>
      <table><thead><tr><th>Peça</th><th>Tecido / Cor</th><th>Gola</th></tr></thead><tbody>${itemsRows(selected, false) || '<tr><td colspan=3>Nenhum item.</td></tr>'}</tbody></table>
      <h2>Observação</h2>
      <div class="box">${selected.production_notes || selected.notes || '—'}</div>`;
    printDocument(title, html);
  };

  const printFicha = () => {
    if (!selected) return;
    const html = `
      <div class="header"><h1>AKANNI · Ficha Técnica de Produção</h1>
        <div class="muted">Documento sem preço nem dados de pagamento — só o que a produção precisa.</div></div>
      <div class="row">
        <div><div class="label">Pedido nº</div>${shortId(selected.id)}</div>
        <div><div class="label">Cliente</div>${selected.customer_name}</div>
        <div><div class="label">Rota de produção</div>${selected.production_route || '—'}</div>
        <div><div class="label">Data de entrada</div>${fmt(selected.created_at)}</div>
        <div><div class="label">Data limite de envio</div>${fmt(selected.delivery_date)}</div>
      </div>
      <h2>Briefing para produção</h2>
      <div class="box">${selected.production_briefing || 'Nenhum briefing registrado.'}</div>
      <h2>Peças a produzir</h2>
      <table><thead><tr><th>Peça</th><th>Tecido / Cor</th><th>Gola</th></tr></thead><tbody>${itemsRows(selected, false) || '<tr><td colspan=3>Nenhum item lançado.</td></tr>'}</tbody></table>`;
    printDocument('Ficha Técnica', html);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2"><ClipboardList size={24} /> Romaneio & Ficha Técnica</h1>
        <p className="text-zinc-500 text-sm">Escolha um pedido para gerar o Romaneio (Designer/Produção) e a Ficha Técnica para o chão de fábrica.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de pedidos */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex bg-white rounded-xl border border-zinc-200 px-4 py-2.5 shadow-sm">
            <Search className="text-zinc-400 mr-2" size={18} />
            <input type="text" placeholder="Buscar pedido..." className="bg-transparent border-none focus:ring-0 w-full text-sm outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={18} className="animate-spin" /> Carregando...</div>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {filtered.map(o => (
                <button key={o.id} onClick={() => selectOrder(o)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.id === o.id ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200 hover:border-zinc-300'}`}>
                  <p className="font-bold text-sm truncate">{o.customer_name}</p>
                  <p className={`text-[11px] truncate ${selected?.id === o.id ? 'text-zinc-300' : 'text-zinc-500'}`}>#{shortId(o.id)} · {fmt(o.delivery_date)}</p>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-sm text-zinc-400 italic px-1">Nenhum pedido encontrado.</p>}
            </div>
          )}
        </div>

        {/* Documento */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-center bg-white rounded-2xl border border-dashed border-zinc-200 p-12 text-zinc-400">
              <div><ClipboardList size={40} className="mx-auto mb-3 opacity-40" /><p className="text-sm">Selecione um pedido à esquerda.</p></div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="bg-zinc-900 text-white p-5 flex items-center justify-between">
                <div>
                  <p className="font-black text-lg">{selected.customer_name}</p>
                  <p className="text-xs text-zinc-400">Pedido #{shortId(selected.id)} · Envio {fmt(selected.delivery_date)}</p>
                </div>
              </div>

              <div className="flex gap-2 p-4 border-b border-zinc-100">
                <button onClick={() => setTab('designer')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${tab === 'designer' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`}>Romaneio Designer</button>
                <button onClick={() => setTab('producao')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${tab === 'producao' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`}>Romaneio Produção</button>
                <button onClick={() => setTab('ficha')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${tab === 'ficha' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`}>Ficha Técnica</button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-[10px] uppercase tracking-widest text-zinc-400 block">Rota</span>{selected.production_route || '—'}</div>
                  <div><span className="text-[10px] uppercase tracking-widest text-zinc-400 block">Entrada</span>{fmt(selected.created_at)}</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-widest text-zinc-400 block mb-1">Briefing para produção</span>
                  <div className="bg-zinc-50 rounded-xl p-3 text-sm text-zinc-700 min-h-[48px]">{selected.production_briefing || <span className="text-zinc-400 italic">Nenhum briefing registrado ainda (será preenchido no pedido).</span>}</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-widest text-zinc-400 block mb-1">Itens</span>
                  <div className="border border-zinc-100 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest text-left"><th className="px-3 py-2">Peça</th><th className="px-3 py-2">Tecido/Cor</th><th className="px-3 py-2">Gola</th></tr></thead>
                      <tbody>
                        {(selected.items || []).length === 0 ? <tr><td colSpan={3} className="px-3 py-3 text-zinc-400 italic">Nenhum item.</td></tr> :
                          (selected.items || []).map((i: any, idx: number) => (
                            <tr key={idx} className="border-t border-zinc-50">
                              <td className="px-3 py-2 font-medium">{i.quantity || ''}x {i.shirtType || 'Item'}</td>
                              <td className="px-3 py-2 text-zinc-600">{i.fabricColor || '—'} {i.fabricType ? `· ${i.fabricType}` : ''}</td>
                              <td className="px-3 py-2 text-zinc-600">{i.collarType || '—'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {tab === 'producao' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-100">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5">Nome da costureira</label>
                      <input type="text" className="w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-sm" value={seamstress} onChange={(e) => setSeamstress(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5">Observação da produção</label>
                      <input type="text" className="w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-sm" value={prodNotes} onChange={(e) => setProdNotes(e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <button onClick={saveProduction} disabled={saving} className="px-4 h-10 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-200 flex items-center gap-2 disabled:opacity-50">
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar dados da produção
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-zinc-100">
                  <button
                    onClick={() => tab === 'ficha' ? printFicha() : printRomaneio(tab)}
                    className="px-5 h-11 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-colors flex items-center gap-2">
                    <Printer size={16} /> Imprimir {tab === 'ficha' ? 'Ficha Técnica' : tab === 'designer' ? 'Romaneio Designer' : 'Romaneio Produção'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
