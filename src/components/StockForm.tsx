import React, { useState } from 'react';
import { X, Save, Package } from 'lucide-react';
import { StockItem, StockType } from '../types';
import { motion } from 'motion/react';

interface StockFormProps {
  item?: StockItem | null;
  onClose: () => void;
  onSubmit: (data: Partial<StockItem>) => void;
}

export const StockForm: React.FC<StockFormProps> = ({ item, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<Partial<StockItem>>(
    item || {
      name: '',
      type: 'fabric',
      color: '',
      size: '',
      materialFormat: '',
      quantity: 0,
      unit: 'metros',
      minQuantity: 10,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-zinc-100 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-zinc-900 text-white rounded-2xl">
              <Package size={24} />
            </div>
            <h2 className="text-xl font-bold text-zinc-900">
              {item ? 'Editar Material' : 'Novo Material'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 ml-1">Nome do Material *</label>
            <input
              type="text"
              required
              placeholder="Ex: Meia Malha Algodão, Botão Camisa"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 outline-none font-medium h-12"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 ml-1">Tipo</label>
              <select
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none h-12 text-sm font-medium"
                value={formData.type}
                onChange={e => {
                  const val = e.target.value as StockType;
                  // Auto set default unit as a convenient enhancement
                  let defaultUnit: 'metros' | 'unidades' | 'kg' = 'metros';
                  if (val === 'buttons' || val === 'collar' || val === 'label') {
                    defaultUnit = 'unidades';
                  }
                  setFormData({ ...formData, type: val, unit: defaultUnit });
                }}
              >
                <option value="fabric">Tecido</option>
                <option value="buttons">Botões</option>
                <option value="collar">Golas</option>
                <option value="thread">Linhas</option>
                <option value="label">Etiquetas</option>
                <option value="others">Outros</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 ml-1">Cor</label>
              <input
                type="text"
                placeholder="Ex: Preto, Azul"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none h-12 text-sm font-medium"
                value={formData.color}
                onChange={e => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
          </div>

          {/* Dynamic details fields for specific items */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 ml-1">Tamanho / Medida</label>
              <input
                type="text"
                placeholder="Ex: P, M, L18"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none h-12 text-sm font-medium"
                value={formData.size || ''}
                onChange={e => setFormData({ ...formData, size: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 ml-1">Formato / Detalhe</label>
              <input
                type="text"
                placeholder="Ex: Polo, Gola Careca, 4 Furos"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none h-12 text-sm font-medium"
                value={formData.materialFormat || ''}
                onChange={e => setFormData({ ...formData, materialFormat: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 ml-1">Quantidade *</label>
              <input
                type="number"
                step="any"
                required
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none h-12 text-sm font-bold"
                value={formData.quantity === 0 ? '' : formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 ml-1">Unidade</label>
              <select
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none h-12 text-sm font-medium"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value as any })}
              >
                <option value="metros">Metros (m)</option>
                <option value="unidades">Unidades (un)</option>
                <option value="kg">Quilos (kg)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 ml-1">Alerta de Restoque (Qtd Mínima)</label>
            <input
              type="number"
              step="any"
              required
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none h-12 text-sm font-medium"
              value={formData.minQuantity === 0 ? '' : formData.minQuantity}
              onChange={e => setFormData({ ...formData, minQuantity: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold flex items-center justify-center hover:bg-zinc-800 transition-all mt-6 h-12 shadow-xl"
          >
            <Save size={20} className="mr-2" />
            {item ? 'Salvar Alterações' : 'Cadastrar Material'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
