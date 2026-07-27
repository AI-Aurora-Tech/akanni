import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, CheckCircle2, AlertTriangle, ArrowRight, Download, ExternalLink, RefreshCw, XCircle } from 'lucide-react';
import { Order } from '../types';

interface NfeModalProps {
  order: Order | null;
  nfeInfo: any;
  onClose: () => void;
  onConfirmEmit: (orderId: string) => Promise<void>;
  onReemit?: (orderId: string) => Promise<void>;
  onCancelNfe?: (orderId: string) => Promise<void>;
}

export const NfeModal: React.FC<NfeModalProps> = ({ order, nfeInfo, onClose, onConfirmEmit, onReemit, onCancelNfe }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!order) return null;

  const handleEmit = async () => {
    setLoading(true);
    setError('');
    try {
      await onConfirmEmit(order.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao emitir NF-e');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return (order.items || []).reduce((acc, item) => acc + ((item.quantity || 0) * (item.price || 0)), 0).toFixed(2);
  };

  const isPreview = !nfeInfo;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900">
                {isPreview ? 'Preview de Emissão NF-e' : 'Status da NF-e'}
              </h2>
              <p className="text-xs text-zinc-500 font-medium">Pedido #{order.id.slice(0,8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {isPreview ? (
            <div className="space-y-6">
              <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-sm flex items-start space-x-3 border border-yellow-100">
                <AlertTriangle size={20} className="shrink-0" />
                <p>Verifique os dados abaixo antes de confirmar a emissão. Estes dados serão enviados para a Sefaz.</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Tomador / Cliente</h3>
                  <div className="bg-zinc-50 p-4 rounded-2xl space-y-2 text-sm border border-zinc-100">
                    <p><span className="font-semibold">Nome:</span> {order.customerName}</p>
                    <p><span className="font-semibold">CPF/CNPJ:</span> {order.customerTaxId || 'Não informado'}</p>
                    <p><span className="font-semibold">E-mail:</span> {order.customerEmail || 'Não informado'}</p>
                    <p><span className="font-semibold">Telefone:</span> {order.customerPhone || 'Não informado'}</p>
                    <p><span className="font-semibold">Endereço:</span> {order.customerAddress || 'Não informado'}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Valores & Serviços</h3>
                  <div className="bg-zinc-50 p-4 rounded-2xl space-y-2 text-sm border border-zinc-100">
                    <p><span className="font-semibold">Valor Total:</span> R$ {calculateTotal()}</p>
                    <div className="mt-4 pt-4 border-t border-zinc-200">
                      <p className="font-semibold text-xs text-zinc-500 mb-2">Itens:</p>
                      <ul className="space-y-1 text-xs text-zinc-600">
                        {order.items.map((it, i) => (
                          <li key={i}>- {it.quantity}x {it.size} ({it.modelDetails}) - R$ {(it.price || 0).toFixed(2)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center space-x-4 p-5 rounded-2xl border border-zinc-100 bg-zinc-50">
                {nfeInfo.status === 'autorizada' ? (
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle2 size={24} />
                  </div>
                ) : nfeInfo.status === 'erro' ? (
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
                    <XCircle size={24} />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center shrink-0">
                    <RefreshCw size={24} className="animate-spin" />
                  </div>
                )}
                
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-zinc-900 capitalize">
                    {nfeInfo.status === 'processando' ? 'Processando na Sefaz...' : 
                     nfeInfo.status === 'autorizada' ? 'NF-e Autorizada com Sucesso' : 'Erro na Emissão da NF-e'}
                  </h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    {nfeInfo.status === 'autorizada' ? 'Os documentos já estão disponíveis.' :
                     nfeInfo.status === 'erro' ? (nfeInfo.mensagem_erro || 'Ocorreu um erro na comunicação com a Sefaz.') :
                     'Aguardando retorno da Sefaz...'}
                  </p>
                </div>
              </div>

              {nfeInfo.status === 'autorizada' && (
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
              
              {nfeInfo.status === 'erro' && onReemit && (
                <button onClick={() => {
                  onReemit(order.id);
                  onClose();
                }} className="w-full py-4 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors">
                  Tentar Reemitir NF-e
                </button>
              )}
            </div>
          )}
        </div>

        {isPreview && (
          <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 font-bold text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleEmit}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw size={20} className="animate-spin mr-2" />
              ) : (
                <CheckCircle2 size={20} className="mr-2" />
              )}
              Confirmar Emissão
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
