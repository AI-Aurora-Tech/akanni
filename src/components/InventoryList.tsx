import React, { useState } from 'react';
import { Package, Plus, Search, AlertTriangle, ArrowUpRight, ArrowDownRight, Edit2, Trash2 } from 'lucide-react';
import { StockItem } from '../types';
import { StockForm } from './StockForm';
import { AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

interface InventoryListProps {
  items: StockItem[];
  onAddItem: (data: Partial<StockItem>) => void;
  onUpdateItem: (id: string, data: Partial<StockItem>) => void;
  onDeleteItem: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
}

export const InventoryList: React.FC<InventoryListProps> = ({ 
  items, 
  onAddItem, 
  onUpdateItem,
  onDeleteItem,
  onUpdateQuantity 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const { profile } = useAuth();

  const canManageStock = profile?.role === 'super_admin' || 
                        profile?.role === 'admin_geral' || 
                        profile?.role === 'gestor_geral' || 
                        profile?.role === 'gerente_producao' || 
                        profile?.role === 'funcionario_padrao';

  const filteredItems = items.filter(item => 
    (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.color && item.color.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.size && item.size.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.materialFormat && item.materialFormat.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenForm = (item?: StockItem) => {
    if (item) setEditingItem(item);
    else setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (data: Partial<StockItem>) => {
    if (editingItem) {
      onUpdateItem(editingItem.id, data);
    } else {
      onAddItem(data);
    }
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar materiais por nome, tipo ou cor..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {canManageStock && (
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center space-x-2 bg-zinc-900 text-white px-5 py-2 rounded-xl hover:bg-zinc-800 transition-all shadow-sm"
          >
            <Plus size={18} />
            <span className="font-semibold text-sm">Novo Material</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm relative overflow-hidden group hover:border-zinc-300 transition-all">
            {item.quantity <= item.minQuantity && (
              <div className="absolute top-0 right-0 p-2 bg-red-50 text-red-500 rounded-bl-xl">
                <AlertTriangle size={16} />
              </div>
            )}
            
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-zinc-50 rounded-xl group-hover:bg-zinc-900 group-hover:text-white transition-all duration-300">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">{item.name}</h3>
                  <div className="flex items-center space-x-2">
                    <p className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest">
                      {['fabric', 'tecido', 'tecidos'].includes((item.type || '').toLowerCase()) ? 'Tecido' : 
                       ['buttons', 'botão', 'botoes', 'botões'].includes((item.type || '').toLowerCase()) ? 'Botões' :
                       ['collar', 'gola', 'golas'].includes((item.type || '').toLowerCase()) ? 'Gola' :
                       ['thread', 'linha', 'linhas', 'fio'].includes((item.type || '').toLowerCase()) ? 'Linha' :
                       ['label', 'etiqueta', 'etiquetas'].includes((item.type || '').toLowerCase()) ? 'Etiqueta' : 'Outros'}
                    </p>
                    {item.color && (
                      <>
                        <span className="text-zinc-300">•</span>
                        <p className="text-[10px] text-zinc-500 font-extrabold uppercase bg-zinc-100 px-1.5 py-0.5 rounded">{item.color}</p>
                      </>
                    )}
                  </div>
                  {(item.size || item.materialFormat) && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {item.size && (
                        <span className="text-[9px] bg-zinc-50 border border-zinc-100 text-zinc-500 font-mono px-1.5 py-0.5 rounded">Tam: {item.size}</span>
                      )}
                      {item.materialFormat && (
                        <span className="text-[9px] bg-zinc-50 border border-zinc-100 text-zinc-500 font-mono px-1.5 py-0.5 rounded">Formato: {item.materialFormat}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {canManageStock ? (
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleOpenForm(item)}
                    className="p-1.5 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 rounded-lg transition-colors underline-none"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm('Deseja excluir este material?')) {
                        onDeleteItem(item.id);
                      }
                    }}
                    className="p-1.5 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-lg transition-colors border border-transparent"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-zinc-400 mb-1">Quantidade em Estoque</p>
                <p className="text-3xl font-black text-zinc-900">
                  {item.quantity} <span className="text-sm font-medium text-zinc-400 text-lowercase">
                    {['meters', 'metros'].includes((item.unit || '').trim().toLowerCase()) ? 'metros' : 
                     ['units', 'unidades'].includes((item.unit || '').trim().toLowerCase()) ? 'unidades' : 
                     item.unit}
                  </span>
                </p>
              </div>

              {canManageStock ? (
                <div className="flex flex-col space-y-2">
                  <button 
                    onClick={() => onUpdateQuantity(item.id, 10)}
                    className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors border border-transparent hover:border-emerald-100"
                  >
                    <ArrowUpRight size={20} />
                  </button>
                  <button 
                    onClick={() => onUpdateQuantity(item.id, -10)}
                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100"
                  >
                    <ArrowDownRight size={20} />
                  </button>
                </div>
              ) : null}
            </div>

            {item.quantity <= item.minQuantity && (
              <div className="mt-4 pt-4 border-t border-red-50 text-red-500 text-xs font-bold uppercase tracking-wider flex items-center">
                <AlertTriangle size={14} className="mr-2" />
                Estoque Crítico (Mín: {item.minQuantity})
              </div>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <StockForm 
            item={editingItem}
            onClose={() => setIsFormOpen(false)}
            onSubmit={handleFormSubmit}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
