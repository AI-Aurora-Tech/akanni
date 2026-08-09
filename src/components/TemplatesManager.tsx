import React, { useState } from 'react';
import { Ruler, Plus, Trash2, Tag, Shirt, Scissors, HelpCircle } from 'lucide-react';
import { FabricTemplate } from '../types';
import { motion } from 'motion/react';

interface TemplatesManagerProps {
  templates: FabricTemplate[];
  onAdd: (
    name: string, 
    fabricConsumption: number, 
    buttonConsumption: number, 
    collarConsumption: number,
    category?: 'camisa' | 'gola' | 'botao',
    size?: string,
    style?: string,
    fabricType?: string,
    collarType?: string,
    color?: string
  ) => void;
  onDelete: (id: string) => void;
}

type TabType = 'camisa' | 'gola' | 'botao';

export const TemplatesManager: React.FC<TemplatesManagerProps> = ({ templates, onAdd, onDelete }) => {
  const [activeTab, setActiveTab] = useState<TabType>('camisa');

  // Form states for each category
  const [camisaForm, setCamisaForm] = useState({
    size: 'M',
    style: 'Manga Curta',
    fabricType: 'Algodão',
    fabricConsumption: 1.2
  });

  const [golaForm, setGolaForm] = useState({
    collarType: 'Gola Polo',
    fabricType: 'Algodão',
    collarConsumption: 1 // Standard: 1 gola per shirt
  });

  const [botaoForm, setBotaoForm] = useState({
    size: 'L18 (Médio)',
    color: 'Preto',
    buttonType: '4 Furos',
    buttonConsumption: 6 // Default 6 buttons per shirt
  });

  const SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'G1', 'G2', 'G3'];
  const FABRICS = ['Algodão', 'Poliéster', 'Viscose', 'Dry-Fit', 'Piquet', 'Linho', 'Seda', 'Malha de Gola'];
  const COLLAR_MODELS = ['Gola Careca', 'Gola V', 'Gola Polo', 'Gola Alta', 'Gola Padre', 'Gola Italiana'];
  const SLEEVE_STYLES = ['Manga Curta', 'Manga Longa', 'Regata', 'Baby Look', 'Oversized'];
  const BUTTON_SIZES = ['L16 (Pequeno)', 'L18 (Médio)', 'L24 (Grande)', 'L30 (Paletó)'];
  const BUTTON_TYPES = ['4 Furos', '2 Furos', 'Presilha', 'Coberto/Bombê'];

  const handleSubmitCamisa = (e: React.FormEvent) => {
    e.preventDefault();
    const name = `Camisa • ${camisaForm.style} • ${camisaForm.fabricType} (${camisaForm.size})`;
    onAdd(
      name,
      camisaForm.fabricConsumption,
      0, // No buttons registered in base shirt template
      0, // No collars registered in base shirt template
      'camisa',
      camisaForm.size,
      camisaForm.style,
      camisaForm.fabricType,
      '',
      ''
    );
    // Reset consumption field to default
    setCamisaForm(prev => ({ ...prev, fabricConsumption: 1.2 }));
  };

  const handleSubmitGola = (e: React.FormEvent) => {
    e.preventDefault();
    const name = `Gola • ${golaForm.collarType} • ${golaForm.fabricType}`;
    onAdd(
      name,
      0, // fabric consumption for gola itself can be calculated or handled separately
      0,
      golaForm.collarConsumption,
      'gola',
      '',
      '',
      golaForm.fabricType,
      golaForm.collarType,
      ''
    );
    setGolaForm(prev => ({ ...prev, collarConsumption: 1 }));
  };

  const handleSubmitBotao = (e: React.FormEvent) => {
    e.preventDefault();
    const name = `Botão • ${botaoForm.buttonType} • ${botaoForm.size} (${botaoForm.color})`;
    onAdd(
      name,
      0,
      botaoForm.buttonConsumption,
      0,
      'botao',
      botaoForm.size,
      '',
      '',
      '',
      botaoForm.color
    );
    setBotaoForm(prev => ({ ...prev, buttonConsumption: 6 }));
  };

  // Filter templates based on category
  const filteredTemplates = templates.filter(t => {
    const cat = t.category || 'camisa';
    return cat === activeTab;
  });

  return (
    <div className="space-y-8">
      {/* Category Tabs Selector */}
      <div className="flex bg-zinc-100 p-1.5 rounded-2xl max-w-lg">
        <button
          onClick={() => setActiveTab('camisa')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'camisa'
              ? 'bg-white text-zinc-950 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Shirt size={14} />
          <span>Camisas</span>
        </button>
        <button
          onClick={() => setActiveTab('gola')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'gola'
              ? 'bg-white text-zinc-950 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Tag size={14} />
          <span>Golas</span>
        </button>
        <button
          onClick={() => setActiveTab('botao')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'botao'
              ? 'bg-white text-zinc-950 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Scissors size={14} />
          <span>Botões</span>
        </button>
      </div>

      {/* Dynamic forms depending on selection */}
      <div className="bg-white p-8 rounded-3xl border border-zinc-200/80 shadow-sm hover:shadow-md transition-all">
        {activeTab === 'camisa' && (
          <form onSubmit={handleSubmitCamisa} className="space-y-6">
            <div className="flex items-center space-x-2 mb-2">
              <Shirt className="text-zinc-900 shrink-0" size={20} />
              <h2 className="text-base font-black uppercase tracking-wider text-zinc-900">Cadastro de Gasto de Camisa</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 ml-1 tracking-widest">Tamanho</label>
                <select
                  className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 appearance-none font-semibold text-sm"
                  value={camisaForm.size}
                  onChange={e => setCamisaForm({ ...camisaForm, size: e.target.value })}
                >
                  {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 ml-1 tracking-widest">Estilo de Manga</label>
                <select
                  className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 appearance-none font-semibold text-sm"
                  value={camisaForm.style}
                  onChange={e => setCamisaForm({ ...camisaForm, style: e.target.value })}
                >
                  {SLEEVE_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 ml-1 tracking-widest">Tipo de Tecido</label>
                <select
                  className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 appearance-none font-semibold text-sm"
                  value={camisaForm.fabricType}
                  onChange={e => setCamisaForm({ ...camisaForm, fabricType: e.target.value })}
                >
                  {FABRICS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-100 max-w-xs">
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 ml-1 tracking-widest">Gasto de Tecido (m/unidade) *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full h-12 pl-4 pr-12 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 font-mono font-bold text-sm"
                  value={camisaForm.fabricConsumption}
                  onChange={e => setCamisaForm({ ...camisaForm, fabricConsumption: parseFloat(e.target.value) || 0 })}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs uppercase font-mono">m</span>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="h-12 bg-zinc-900 text-white px-8 rounded-xl font-black text-xs uppercase tracking-widest flex items-center hover:bg-zinc-800 transition-all shadow-xl active:scale-[0.98]"
              >
                <Plus size={16} className="mr-2" />
                Salvar Modelo de Camisa
              </button>
            </div>
          </form>
        )}

        {activeTab === 'gola' && (
          <form onSubmit={handleSubmitGola} className="space-y-6">
            <div className="flex items-center space-x-2 mb-2">
              <Tag className="text-zinc-900 shrink-0" size={20} />
              <h2 className="text-base font-black uppercase tracking-wider text-zinc-900">Cadastro de Gasto de Gola</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 ml-1 tracking-widest">Modelo de Gola</label>
                <select
                  className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 appearance-none font-semibold text-sm"
                  value={golaForm.collarType}
                  onChange={e => setGolaForm({ ...golaForm, collarType: e.target.value })}
                >
                  {COLLAR_MODELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 ml-1 tracking-widest">Tecido da Gola</label>
                <select
                  className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 appearance-none font-semibold text-sm"
                  value={golaForm.fabricType}
                  onChange={e => setGolaForm({ ...golaForm, fabricType: e.target.value })}
                >
                  {FABRICS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-100 max-w-xs">
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 ml-1 tracking-widest">Gasto de Golas (unidade/camisa)</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  className="w-full h-12 pl-4 pr-12 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 font-mono font-bold text-sm"
                  value={golaForm.collarConsumption}
                  onChange={e => setGolaForm({ ...golaForm, collarConsumption: parseInt(e.target.value) || 0 })}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs uppercase font-mono">un</span>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="h-12 bg-zinc-900 text-white px-8 rounded-xl font-black text-xs uppercase tracking-widest flex items-center hover:bg-zinc-800 transition-all shadow-xl active:scale-[0.98]"
              >
                <Plus size={16} className="mr-2" />
                Salvar Modelo de Gola
              </button>
            </div>
          </form>
        )}

        {activeTab === 'botao' && (
          <form onSubmit={handleSubmitBotao} className="space-y-6">
            <div className="flex items-center space-x-2 mb-2">
              <Scissors className="text-zinc-900 shrink-0" size={20} />
              <h2 className="text-base font-black uppercase tracking-wider text-zinc-900">Cadastro de Gasto de Botões</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 ml-1 tracking-widest">Tamanho do Botão</label>
                <select
                  className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 appearance-none font-semibold text-sm"
                  value={botaoForm.size}
                  onChange={e => setBotaoForm({ ...botaoForm, size: e.target.value })}
                >
                  {BUTTON_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 ml-1 tracking-widest">Modelo do Botão</label>
                <select
                  className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 appearance-none font-semibold text-sm"
                  value={botaoForm.buttonType}
                  onChange={e => setBotaoForm({ ...botaoForm, buttonType: e.target.value })}
                >
                  {BUTTON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 ml-1 tracking-widest">Cor</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Preto, Branco leitoso"
                  className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 font-semibold text-sm"
                  value={botaoForm.color}
                  onChange={e => setBotaoForm({ ...botaoForm, color: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-100 max-w-xs">
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 ml-1 tracking-widest">Gasto de Botões (unidades/camisa)</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  className="w-full h-12 pl-4 pr-12 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 font-mono font-bold text-sm"
                  value={botaoForm.buttonConsumption}
                  onChange={e => setBotaoForm({ ...botaoForm, buttonConsumption: parseInt(e.target.value) || 0 })}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs uppercase font-mono">un</span>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="h-12 bg-zinc-900 text-white px-8 rounded-xl font-black text-xs uppercase tracking-widest flex items-center hover:bg-zinc-800 transition-all shadow-xl active:scale-[0.98]"
              >
                <Plus size={16} className="mr-2" />
                Salvar Modelo de Botão
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Grid displaying filtered items */}
      <div>
        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">
          Modelos Ativos: {activeTab === 'camisa' ? 'Camisas' : activeTab === 'gola' ? 'Golas' : 'Botões'} ({filteredTemplates.length})
        </h3>
        
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-zinc-200/60 shadow-inner">
            <p className="text-sm font-medium text-zinc-400">Nenhum modelo de gasto cadastrado nesta categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <motion.div
                layout
                key={template.id}
                className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between group hover:border-zinc-300 transition-all"
              >
                <div className="space-y-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                    activeTab === 'camisa' ? 'bg-zinc-900 text-white' : activeTab === 'gola' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {activeTab === 'camisa' ? 'Camisa' : activeTab === 'gola' ? 'Gola' : 'Botão'}
                  </span>
                  
                  <h3 className="font-bold text-zinc-900 leading-snug pt-1">{template.name}</h3>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {activeTab === 'camisa' && (
                      <span className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-full font-mono">
                        Consumo: {template.fabricConsumption}m de tecido
                      </span>
                    )}
                    {activeTab === 'gola' && (
                      <span className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-full font-mono">
                        Gasto: {template.collarConsumption || 0} un por camisa
                      </span>
                    )}
                    {activeTab === 'botao' && (
                      <span className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-full font-mono">
                        Gasto: {template.buttonConsumption || 0} un por camisa
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onDelete(template.id)}
                  className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
