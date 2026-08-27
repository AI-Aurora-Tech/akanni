import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  X, FileText, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft,
  Download, ExternalLink, RefreshCw, XCircle, Building2, User, Loader2, Ban
} from 'lucide-react';
import { Order } from '../types';

interface NfeModalProps {
  order: Order | null;
  nfeInfo: any;
  onClose: () => void;
  onConfirmEmit: (orderId: string, itemPrices: number[]) => Promise<any>;
  onCancelNfe?: (orderId: string, justificativa: string) => Promise<any>;
  onCheckStatus?: (ref: string) => Promise<any>;
}

const DEFAULT_UNIT_PRICE = 85;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const brl = (v: number) =>
  `R$ ${(Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type WizardStep = 'conference' | 'nfe';
type Result = { status: 'autorizada' | 'processando' | 'erro'; mensagem?: string } | null;

export const NfeModal: React.FC<NfeModalProps> = ({ order, nfeInfo, onClose, onConfirmEmit, onCancelNfe, onCheckStatus }) => {
  // Modo wizard quando não há nota, ou quando o usuário optar por refazer a emissão.
  const [forceWizard, setForceWizard] = useState(false);
  const [step, setStep] = useState<WizardStep>('conference');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);

  // Cancelamento (disponível na visão de nota autorizada)
  const [showCancel, setShowCancel] = useState(false);
  const [justificativa, setJustificativa] = useState('Cancelamento solicitado pelo emitente - dados incorretos no pedido.');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Preços unitários confirmados na conferência.
  const [prices, setPrices] = useState<number[]>(
    () => (order?.items || []).map((it) => (it.unitPrice && it.unitPrice > 0 ? it.unitPrice : DEFAULT_UNIT_PRICE))
  );

  const items = order?.items || [];
  const total = useMemo(
    () => items.reduce((acc, it, i) => acc + (Number(it.quantity) || 0) * (Number(prices[i]) || 0), 0),
    [items, prices]
  );

  if (!order) return null;

  // Nota cancelada abre direto o fluxo de (re)emissão.
  const showWizard = forceWizard || !nfeInfo || nfeInfo.status === 'cancelado';

  const updatePrice = (idx: number, value: number) => {
    setPrices((prev) => prev.map((p, i) => (i === idx ? value : p)));
  };

  const startRetry = () => {
    setResult(null);
    setStep('conference');
    setForceWizard(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const data = await onConfirmEmit(order.id, prices);
      const status = data?.status;
      if (status === 'autorizada') {
        setResult({ status: 'autorizada' });
      } else if (status === 'erro') {
        setResult({ status: 'erro', mensagem: data?.mensagem || 'Erro ao emitir a nota fiscal.' });
      } else {
        // 'processando': mostra o spinner e consulta o status periodicamente.
        setResult({ status: 'processando' });
        if (data?.ref && onCheckStatus) {
          for (let i = 0; i < 12; i++) {
            await sleep(2500);
            try {
              const s = await onCheckStatus(data.ref);
              if (s?.status === 'autorizada') { setResult({ status: 'autorizada' }); break; }
              if (s?.status === 'erro') { setResult({ status: 'erro', mensagem: s?.mensagem || 'Erro na autorização da nota fiscal.' }); break; }
            } catch { /* continua tentando */ }
          }
        }
      }
    } catch (err: any) {
      setResult({ status: 'erro', mensagem: err?.message || 'Erro ao emitir a nota fiscal.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancelNfe) return;
    if (justificativa.trim().length < 15) {
      setCancelError('A justificativa deve ter ao menos 15 caracteres (exigência da Sefaz).');
      return;
    }
    setCancelLoading(true);
    setCancelError('');
    try {
      await onCancelNfe(order.id, justificativa.trim());
      onClose();
    } catch (err: any) {
      setCancelError(err?.message || 'Erro ao cancelar a nota fiscal.');
    } finally {
      setCancelLoading(false);
    }
  };

  const orderCode = `#${order.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900">
                {result
                  ? 'Emissão de NF-e'
                  : showWizard
                    ? (step === 'conference' ? 'Conferência do Pedido' : 'Pré-visualização da NF-e')
                    : 'Nota Fiscal do Pedido'}
              </h2>
              <p className="text-xs text-zinc-500 font-medium">Pedido {orderCode} • {order.customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Passos do wizard */}
        {showWizard && !result && (
          <div className="px-6 pt-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
            <span className={step === 'conference' ? 'text-blue-600' : 'text-zinc-300'}>1. Pedido</span>
            <ArrowRight size={12} className="text-zinc-300" />
            <span className={step === 'nfe' ? 'text-blue-600' : 'text-zinc-300'}>2. Nota Fiscal</span>
          </div>
        )}

        <div className="p-6 overflow-y-auto">
          {/* ---------- RESULTADO DA EMISSÃO ---------- */}
          {result ? (
            <ResultView result={result} onRetry={startRetry} onClose={onClose} nfeInfo={nfeInfo} />
          ) : showWizard ? (
            step === 'conference' ? (
              /* ---------- ETAPA 1: CONFERÊNCIA DO PEDIDO ---------- */
              <div className="space-y-6">
                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm flex items-start space-x-3 border border-blue-100">
                  <AlertTriangle size={20} className="shrink-0" />
                  <p>Confira os dados do cliente, os itens e os valores do pedido. No próximo passo você verá a prévia da nota fiscal antes de emitir.</p>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                    <User size={14} /> Cliente
                  </h3>
                  <div className="bg-zinc-50 p-4 rounded-2xl grid sm:grid-cols-2 gap-2 text-sm border border-zinc-100">
                    <p><span className="font-semibold">Nome:</span> {order.customerName}</p>
                    <p><span className="font-semibold">CPF/CNPJ:</span> {order.customerTaxId || '— não informado —'}</p>
                    <p><span className="font-semibold">E-mail:</span> {order.customerEmail || '—'}</p>
                    <p><span className="font-semibold">Telefone:</span> {order.customerPhone || '—'}</p>
                    <p className="sm:col-span-2"><span className="font-semibold">Endereço:</span> {order.customerAddress || '— não informado —'}</p>
                  </div>
                  {!order.customerTaxId && (
                    <p className="text-xs text-amber-600 mt-2 font-medium flex items-center gap-1">
                      <AlertTriangle size={12} /> Sem CPF/CNPJ a emissão será recusada. Edite o pedido para informar o documento.
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Itens & Valores</h3>
                  <div className="border border-zinc-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 text-zinc-400 text-[10px] uppercase tracking-wider">
                        <tr>
                          <th className="text-left font-bold px-4 py-2">Item</th>
                          <th className="text-center font-bold px-2 py-2 w-16">Qtd</th>
                          <th className="text-right font-bold px-2 py-2 w-32">Preço Unit.</th>
                          <th className="text-right font-bold px-4 py-2 w-28">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, i) => (
                          <tr key={i} className="border-t border-zinc-100">
                            <td className="px-4 py-2">
                              <span className="font-medium text-zinc-800">{it.shirtType || 'Camisa'}</span>
                              {(it.fabricType || it.color || it.fabricColor) && (
                                <span className="text-zinc-400 text-xs block">{[it.fabricType, it.color || it.fabricColor].filter(Boolean).join(' • ')}</span>
                              )}
                            </td>
                            <td className="text-center px-2 py-2 font-mono">{it.quantity}</td>
                            <td className="px-2 py-2">
                              <div className="flex items-center justify-end">
                                <span className="text-zinc-400 text-xs mr-1">R$</span>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={prices[i] ?? ''}
                                  onChange={(e) => updatePrice(i, parseFloat(e.target.value) || 0)}
                                  className="w-20 text-right px-2 py-1 border border-zinc-200 rounded-lg font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </td>
                            <td className="text-right px-4 py-2 font-mono font-semibold">
                              {brl((Number(it.quantity) || 0) * (Number(prices[i]) || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-zinc-200 bg-zinc-50">
                          <td colSpan={3} className="px-4 py-3 text-right font-bold text-zinc-500 uppercase text-xs tracking-wider">Valor Total</td>
                          <td className="px-4 py-3 text-right font-black text-zinc-900">{brl(total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-2">
                    O preço unitário sugerido é R$ {DEFAULT_UNIT_PRICE.toFixed(2)}. Ajuste se necessário — este será o valor da nota fiscal.
                  </p>
                </div>
              </div>
            ) : (
              /* ---------- ETAPA 2: PRÉVIA DA NF-e ---------- */
              <div className="space-y-5">
                <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm flex items-start space-x-3 border border-amber-100">
                  <AlertTriangle size={20} className="shrink-0" />
                  <p>Esta é a prévia da nota fiscal que será enviada à Sefaz. Confira todos os dados: após confirmar, a NF-e será emitida automaticamente.</p>
                </div>

                <div className="border border-zinc-200 rounded-2xl overflow-hidden text-sm">
                  <div className="bg-zinc-900 text-white px-4 py-3 flex items-center justify-between">
                    <span className="font-bold tracking-tight">NOTA FISCAL ELETRÔNICA (NF-e) — Modelo 55</span>
                    <span className="text-[10px] bg-white/15 px-2 py-1 rounded-md uppercase tracking-wider">Prévia</span>
                  </div>

                  <div className="p-4 border-b border-zinc-100">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-2"><Building2 size={13} /> Emitente</h4>
                    <p className="font-semibold text-zinc-800">Akanni Confecções</p>
                    <p className="text-zinc-500 text-xs">Emitente vinculado à sua conta FocusNFe (empresa do token).</p>
                  </div>

                  <div className="p-4 border-b border-zinc-100">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-2"><User size={13} /> Destinatário</h4>
                    <p className="font-semibold text-zinc-800">{order.customerName}</p>
                    <p className="text-zinc-500 text-xs">CPF/CNPJ: {order.customerTaxId || '— não informado —'}</p>
                    <p className="text-zinc-500 text-xs">{order.customerAddress || '— endereço não informado —'}</p>
                  </div>

                  <div className="p-4 border-b border-zinc-100">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Produtos / Serviços</h4>
                    <ul className="space-y-1.5">
                      {items.map((it, i) => (
                        <li key={i} className="flex justify-between text-zinc-700">
                          <span className="pr-2">
                            {it.quantity}x {it.shirtType || 'Camisa'}
                            {(it.fabricType || it.color || it.fabricColor) && (
                              <span className="text-zinc-400"> — {[it.fabricType, it.color || it.fabricColor].filter(Boolean).join(' ')}</span>
                            )}
                          </span>
                          <span className="font-mono whitespace-nowrap">{brl((Number(it.quantity) || 0) * (Number(prices[i]) || 0))}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[11px] text-zinc-400 mt-3">Natureza da operação: Venda de produção do estabelecimento</p>
                  </div>

                  <div className="p-4 bg-zinc-50 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Valor Total da Nota</span>
                    <span className="text-xl font-black text-zinc-900">{brl(total)}</span>
                  </div>
                </div>
              </div>
            )
          ) : (
            /* ---------- VISÃO DE STATUS DA NOTA EXISTENTE ---------- */
            <StatusView nfeInfo={nfeInfo} onRetry={startRetry} />
          )}
        </div>

        {/* ---------- RODAPÉ (AÇÕES) ---------- */}
        {result ? null : showWizard ? (
          <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center">
            <button
              onClick={() => (step === 'nfe' ? setStep('conference') : onClose())}
              disabled={loading}
              className="px-5 py-3 font-bold text-zinc-600 hover:text-zinc-900 transition-colors flex items-center disabled:opacity-50"
            >
              {step === 'nfe' ? (<><ArrowLeft size={18} className="mr-2" /> Voltar</>) : 'Cancelar'}
            </button>
            {step === 'conference' ? (
              <button
                onClick={() => setStep('nfe')}
                className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center"
              >
                Continuar para a Nota Fiscal <ArrowRight size={18} className="ml-2" />
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center disabled:opacity-60"
              >
                {loading ? <RefreshCw size={18} className="animate-spin mr-2" /> : <CheckCircle2 size={18} className="mr-2" />}
                {loading ? 'Emitindo...' : 'Confirmar Nota Fiscal'}
              </button>
            )}
          </div>
        ) : (
          nfeInfo?.status === 'autorizada' && onCancelNfe && (
            <div className="p-6 border-t border-zinc-100 bg-zinc-50">
              {!showCancel ? (
                <button
                  onClick={() => setShowCancel(true)}
                  className="w-full py-3 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-colors flex items-center justify-center"
                >
                  <Ban size={18} className="mr-2" /> Cancelar Nota Fiscal
                </button>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">Justificativa do cancelamento (mín. 15 caracteres)</label>
                  <textarea
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"
                  />
                  {cancelError && <p className="text-xs text-red-600 font-medium">{cancelError}</p>}
                  <div className="flex gap-3">
                    <button onClick={() => setShowCancel(false)} disabled={cancelLoading} className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-bold text-zinc-600 transition-colors">Voltar</button>
                    <button onClick={handleCancel} disabled={cancelLoading} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center disabled:opacity-60">
                      {cancelLoading ? <RefreshCw size={18} className="animate-spin mr-2" /> : <Ban size={18} className="mr-2" />}
                      Confirmar Cancelamento
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </motion.div>
    </div>
  );
};

/* ============ Sub-visões ============ */

const StatusView: React.FC<{ nfeInfo: any; onRetry: () => void }> = ({ nfeInfo, onRetry }) => {
  const status = nfeInfo?.status;
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 p-5 rounded-2xl border border-zinc-100 bg-zinc-50">
        {status === 'autorizada' ? (
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0"><CheckCircle2 size={24} /></div>
        ) : status === 'erro' ? (
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0"><XCircle size={24} /></div>
        ) : (
          <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center shrink-0"><RefreshCw size={24} className="animate-spin" /></div>
        )}
        <div className="flex-1">
          <h3 className="font-bold text-lg text-zinc-900">
            {status === 'autorizada' ? 'Nota Emitida com Sucesso' : status === 'erro' ? 'Erro na Emissão da NF-e' : 'Processando na Sefaz...'}
          </h3>
          <p className="text-sm text-zinc-500 mt-1">
            {status === 'autorizada' ? 'Os documentos já estão disponíveis abaixo.'
              : status === 'erro' ? (nfeInfo?.mensagem_erro || 'Ocorreu um erro na comunicação com a Sefaz.')
              : 'Aguardando o retorno da Sefaz. Isso pode levar alguns instantes.'}
          </p>
          {status === 'autorizada' && nfeInfo?.numero && (
            <p className="text-xs text-zinc-400 mt-1 font-mono">Nº {nfeInfo.numero} • Série {nfeInfo.serie || '1'}</p>
          )}
        </div>
      </div>

      {status === 'autorizada' && (nfeInfo?.url_danfe || nfeInfo?.url_xml) && (
        <div className="grid grid-cols-2 gap-4">
          {nfeInfo.url_danfe && (
            <a href={nfeInfo.url_danfe} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-6 bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl transition-all group">
              <ExternalLink size={24} className="text-zinc-400 group-hover:text-blue-600 mb-2" />
              <span className="font-bold text-zinc-700">Acessar DANFE</span>
              <span className="text-xs text-zinc-400 mt-1">Visualizar e Imprimir</span>
            </a>
          )}
          {nfeInfo.url_xml && (
            <a href={nfeInfo.url_xml} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-6 bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl transition-all group">
              <Download size={24} className="text-zinc-400 group-hover:text-blue-600 mb-2" />
              <span className="font-bold text-zinc-700">Baixar XML</span>
              <span className="text-xs text-zinc-400 mt-1">Arquivo Eletrônico</span>
            </a>
          )}
        </div>
      )}

      {status === 'erro' && (
        <button onClick={onRetry} className="w-full py-4 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center">
          <RefreshCw size={18} className="mr-2" /> Refazer emissão
        </button>
      )}
    </div>
  );
};

const ResultView: React.FC<{ result: NonNullable<Result>; onRetry: () => void; onClose: () => void; nfeInfo: any }> = ({ result, onRetry, onClose, nfeInfo }) => {
  if (result.status === 'autorizada') {
    return (
      <div className="py-6 flex flex-col items-center text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 size={32} />
        </motion.div>
        <h3 className="text-xl font-bold text-zinc-900 mb-1">Nota Emitida com Sucesso!</h3>
        <p className="text-sm text-zinc-500 max-w-sm mb-6">A NF-e foi autorizada pela Sefaz. Os documentos estão disponíveis abaixo.</p>
        {(nfeInfo?.url_danfe || nfeInfo?.url_xml) && (
          <div className="grid grid-cols-2 gap-3 w-full mb-6">
            {nfeInfo?.url_danfe && (
              <a href={nfeInfo.url_danfe} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 p-4 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl font-bold text-zinc-700 text-sm">
                <ExternalLink size={16} /> DANFE
              </a>
            )}
            {nfeInfo?.url_xml && (
              <a href={nfeInfo.url_xml} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 p-4 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl font-bold text-zinc-700 text-sm">
                <Download size={16} /> XML
              </a>
            )}
          </div>
        )}
        <button onClick={onClose} className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors">Concluir</button>
      </div>
    );
  }

  if (result.status === 'processando') {
    return (
      <div className="py-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-4">
          <Loader2 size={32} className="animate-spin" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 mb-1">Emissão em processamento</h3>
        <p className="text-sm text-zinc-500 max-w-sm mb-6">A nota foi enviada e está sendo processada pela Sefaz. O status será atualizado automaticamente em instantes.</p>
        <button onClick={onClose} className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors">Entendi</button>
      </div>
    );
  }

  return (
    <div className="py-8 flex flex-col items-center text-center">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
        <XCircle size={32} />
      </div>
      <h3 className="text-xl font-bold text-zinc-900 mb-1">Não foi possível emitir a NF-e</h3>
      <p className="text-sm text-red-600 max-w-md mb-2 font-medium">{result.mensagem}</p>
      <p className="text-xs text-zinc-400 max-w-sm mb-6">Nenhuma nota foi autorizada. Corrija os dados indicados e tente novamente.</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="px-6 py-3 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-bold text-zinc-600 transition-colors">Fechar</button>
        <button onClick={onRetry} className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center">
          <RefreshCw size={18} className="mr-2" /> Voltar e corrigir
        </button>
      </div>
    </div>
  );
};
