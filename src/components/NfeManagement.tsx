import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Search, ExternalLink, Download, Ban, RefreshCw, CheckCircle2, Clock, XCircle, Send, RotateCw } from 'lucide-react';
import { Order } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NfeManagementProps {
  orders: Order[];
  notasFiscais: Record<string, any>;
  onOpenNfe: (order: Order) => void;
  onReconcile?: () => Promise<void> | void;
}

const DEFAULT_UNIT_PRICE = 85;

const brl = (v: number) =>
  `R$ ${(Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const orderTotal = (order: Order) =>
  (order.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitPrice) || DEFAULT_UNIT_PRICE), 0);

type FilterKey = 'todas' | 'emitidas' | 'pendentes' | 'canceladas' | 'erro';

const STATUS_META: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  autorizada: { label: 'Nota emitida', cls: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={13} /> },
  processando: { label: 'Processando', cls: 'bg-yellow-100 text-yellow-700', icon: <Clock size={13} /> },
  erro: { label: 'Falha na emissão', cls: 'bg-red-100 text-red-700', icon: <XCircle size={13} /> },
  cancelado: { label: 'Nota cancelada', cls: 'bg-zinc-200 text-zinc-600', icon: <Ban size={13} /> },
  pendente: { label: 'Pendente emissão', cls: 'bg-amber-100 text-amber-700', icon: <Clock size={13} /> },
};

export const NfeManagement: React.FC<NfeManagementProps> = ({ orders, notasFiscais, onOpenNfe, onReconcile }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('todas');
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!onReconcile || syncing) return;
    setSyncing(true);
    try { await onReconcile(); } finally { setSyncing(false); }
  };

  // Ao abrir a tela, sincroniza automaticamente as notas com a Sefaz.
  useEffect(() => {
    handleSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pedidos relevantes para NF-e: já têm nota, ou estão em acabamento/despacho.
  const rows = useMemo(() => {
    const list = orders
      .filter((o) => notasFiscais[o.id] || o.status === 'finishing' || o.status === 'delivered')
      .map((o) => {
        const nfe = notasFiscais[o.id];
        // Fallback: pedido marcado como emitido, mas sem o registro carregado.
        const status: string = nfe?.status || (o.nfeIssued ? 'autorizada' : 'pendente');
        return { order: o, nfe, status };
      });

    const byFilter = list.filter((r) => {
      if (filter === 'todas') return true;
      if (filter === 'emitidas') return r.status === 'autorizada';
      if (filter === 'pendentes') return r.status === 'pendente' || r.status === 'processando';
      if (filter === 'canceladas') return r.status === 'cancelado';
      if (filter === 'erro') return r.status === 'erro';
      return true;
    });

    const q = search.trim().toLowerCase();
    const bySearch = !q
      ? byFilter
      : byFilter.filter((r) =>
          r.order.customerName?.toLowerCase().includes(q) ||
          r.order.id.toLowerCase().includes(q) ||
          (r.nfe?.numero ? String(r.nfe.numero).includes(q) : false)
        );

    // Ordena: mais recentes primeiro (pela nota, senão pelo pedido)
    return bySearch.sort((a, b) => {
      const da = new Date(a.nfe?.created_at || a.order.createdAt || 0).getTime();
      const db = new Date(b.nfe?.created_at || b.order.createdAt || 0).getTime();
      return db - da;
    });
  }, [orders, notasFiscais, search, filter]);

  const counts = useMemo(() => {
    const all = orders.filter((o) => notasFiscais[o.id] || o.status === 'finishing' || o.status === 'delivered');
    return {
      total: all.length,
      emitidas: all.filter((o) => notasFiscais[o.id]?.status === 'autorizada' || (!notasFiscais[o.id] && o.nfeIssued)).length,
      canceladas: all.filter((o) => notasFiscais[o.id]?.status === 'cancelado').length,
    };
  }, [orders, notasFiscais]);

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'todas', label: 'Todas' },
    { key: 'emitidas', label: 'Emitidas' },
    { key: 'pendentes', label: 'Pendentes' },
    { key: 'canceladas', label: 'Canceladas' },
    { key: 'erro', label: 'Com erro' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <FileText size={22} /> Notas Fiscais
          </h2>
          <p className="text-zinc-500 text-sm">
            Acompanhe, reimprima e cancele as NF-e por pedido e cliente.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-zinc-100 rounded-2xl px-4 py-2 text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Emitidas</p>
            <p className="text-lg font-black text-green-600">{counts.emitidas}</p>
          </div>
          <div className="bg-white border border-zinc-100 rounded-2xl px-4 py-2 text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Canceladas</p>
            <p className="text-lg font-black text-zinc-500">{counts.canceladas}</p>
          </div>
          {onReconcile && (
            <button
              onClick={handleSync}
              disabled={syncing}
              title="Atualizar status das notas junto à Sefaz"
              className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-3 rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-all shadow-sm disabled:opacity-60"
            >
              <RotateCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Atualizando...' : 'Atualizar'}
            </button>
          )}
        </div>
      </div>

      {/* Busca + filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, nº do pedido ou nº da nota..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-sm"
          />
        </div>
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-2xl overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filter === f.key ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {rows.length === 0 ? (
        <div className="bg-white border border-zinc-100 rounded-3xl p-12 text-center">
          <FileText size={40} className="mx-auto text-zinc-300 mb-3" />
          <p className="text-zinc-500 font-medium">Nenhuma nota fiscal ou pedido pendente de emissão encontrado.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-100 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-zinc-50 text-zinc-400 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="text-left font-bold px-5 py-3">Pedido</th>
                  <th className="text-left font-bold px-3 py-3">Cliente</th>
                  <th className="text-right font-bold px-3 py-3">Valor</th>
                  <th className="text-left font-bold px-3 py-3">Nº NF-e</th>
                  <th className="text-left font-bold px-3 py-3">Status</th>
                  <th className="text-right font-bold px-5 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ order, nfe, status }) => {
                  const meta = STATUS_META[status] || STATUS_META.pendente;
                  return (
                    <tr key={order.id} className="border-t border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-mono font-bold text-zinc-800">#{order.id.slice(0, 8).toUpperCase()}</div>
                        <div className="text-[11px] text-zinc-400">
                          {order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-zinc-800 truncate max-w-[180px]">{order.customerName}</div>
                        <div className="text-[11px] text-zinc-400">{order.customerTaxId || 'Sem CPF/CNPJ'}</div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-semibold text-zinc-800">{brl(orderTotal(order))}</td>
                      <td className="px-3 py-3 font-mono text-zinc-600">
                        {nfe?.numero ? `${nfe.numero}${nfe.serie ? `/${nfe.serie}` : ''}` : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tighter px-2.5 py-1 rounded-lg ${meta.cls}`}>
                          {meta.icon} {meta.label}
                        </span>
                        {status === 'erro' && nfe?.mensagem_erro && (
                          <p className="text-[10px] text-red-500 mt-1 max-w-[200px] truncate" title={nfe.mensagem_erro}>{nfe.mensagem_erro}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {status === 'autorizada' && (
                            <>
                              {nfe?.url_danfe && (
                                <a href={nfe.url_danfe} target="_blank" rel="noreferrer" title="Abrir DANFE"
                                  className="p-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded-lg border border-zinc-200/60 transition-colors">
                                  <ExternalLink size={15} />
                                </a>
                              )}
                              {nfe?.url_xml && (
                                <a href={nfe.url_xml} target="_blank" rel="noreferrer" title="Baixar XML"
                                  className="p-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded-lg border border-zinc-200/60 transition-colors">
                                  <Download size={15} />
                                </a>
                              )}
                              <button onClick={() => onOpenNfe(order)}
                                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold border border-red-100 transition-colors flex items-center gap-1.5">
                                <Ban size={14} /> Cancelar
                              </button>
                            </>
                          )}
                          {status === 'processando' && (
                            <span className="px-3 py-2 text-xs font-bold text-yellow-600 flex items-center gap-1.5">
                              <RefreshCw size={14} className="animate-spin" /> Processando
                            </span>
                          )}
                          {status === 'erro' && (
                            <button onClick={() => onOpenNfe(order)}
                              className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5">
                              <RefreshCw size={14} /> Ver / Reemitir
                            </button>
                          )}
                          {(status === 'pendente' || status === 'cancelado') && (
                            <button onClick={() => onOpenNfe(order)}
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5">
                              <Send size={14} /> {status === 'cancelado' ? 'Emitir novamente' : 'Emitir NF-e'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
