import React, { useState, useMemo, useEffect } from 'react';
import { X, Save, Plus, Package, Calculator, Trash2, ShoppingBasket, AlertCircle, Search, UserPlus } from 'lucide-react';
import { Order, OrderStatus, FabricTemplate, OrderItem, StockItem, Client } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface OrderFormProps {
  templates: FabricTemplate[];
  stock: StockItem[];
  clients: Client[];
  onClose: () => void;
  onSubmit: (order: Partial<Order>) => void;
  initialData?: Order | null;
  onDeleteOrder?: (id: string) => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({ templates, stock, clients, onClose, onSubmit, initialData, onDeleteOrder }) => {
  // Extract unique fabric types and colors from stock
  const fabrics = useMemo(() => {
    const list = stock.filter(s => ['fabric', 'tecido', 'tecidos'].includes((s.type || '').trim().toLowerCase()));
    const types = Array.from(new Set(list.map(s => s.name)));
    return types.map(type => ({
      name: type,
      colors: Array.from(new Set(list.filter(s => s.name === type).map(s => s.color).filter(Boolean) as string[]))
    }));
  }, [stock]);

  const [clientMode, setClientMode] = useState<'select' | 'new'>(initialData ? 'select' : 'select');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearch, setClientSearch] = useState('');
  
  const [customerInfo, setCustomerInfo] = useState({
    customerName: initialData?.customerName || '',
    customerEmail: initialData?.customerEmail || '',
    customerTaxId: initialData?.customerTaxId || '',
    customerPhone: initialData?.customerPhone || '',
    customerAddress: initialData?.customerAddress || '',
    deliveryDate: initialData?.deliveryDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    designImages: initialData?.designImages || [] as string[],
  });

  const [newClientAddress, setNewClientAddress] = useState({
    addressCep: '',
    addressStreet: '',
    addressNumber: '',
    addressComplement: '',
    addressNeighborhood: '',
    addressCity: '',
    addressState: ''
  });

  // When selecting a client, auto-fill
  useEffect(() => {
    if (selectedClientId && clientMode === 'select') {
      const client = clients.find(c => c.id === selectedClientId);
      if (client) {
        setCustomerInfo(prev => ({
          ...prev,
          customerName: client.name,
          customerEmail: client.email || '',
          customerTaxId: client.taxId || '',
          customerPhone: client.phone || '',
          customerAddress: client.addressStreet ? 
            `${client.addressStreet}, ${client.addressNumber}${client.addressComplement ? ', ' + client.addressComplement : ''}, ${client.addressNeighborhood}, ${client.addressCity}/${client.addressState} - CEP: ${client.addressCep}` : ''
        }));
      }
    }
  }, [selectedClientId, clients, clientMode]);

  const camisaTemplates = useMemo(() => templates.filter(t => (t.category || 'camisa') === 'camisa'), [templates]);
  const golaTemplates = useMemo(() => templates.filter(t => t.category === 'gola'), [templates]);
  const botaoTemplates = useMemo(() => templates.filter(t => t.category === 'botao'), [templates]);

  const [items, setItems] = useState<Partial<OrderItem>[]>(() => {
    if (initialData?.items && initialData.items.length > 0) {
      return initialData.items;
    }
    const defaultCamisa = templates.find(t => (t.category || 'camisa') === 'camisa') || templates[0];
    const defaultGola = templates.find(t => t.category === 'gola');
    const defaultBotao = templates.find(t => t.category === 'botao');
    return [{
      templateId: defaultCamisa?.id || '',
      collarTemplateId: defaultGola?.id || '',
      buttonTemplateId: defaultBotao?.id || '',
      shirtType: defaultCamisa?.name || '',
      quantity: 10,
      fabricType: fabrics[0]?.name || '',
      fabricColor: fabrics[0]?.colors[0] || '',
      fabricUsagePerUnit: defaultCamisa?.fabricConsumption || 1.2,
      totalFabricEstimate: parseFloat((10 * (defaultCamisa?.fabricConsumption || 1.2)).toFixed(1))
    }];
  });

  const addItem = () => {
    const defaultCamisa = templates.find(t => (t.category || 'camisa') === 'camisa') || templates[0];
    const defaultGola = templates.find(t => t.category === 'gola');
    const defaultBotao = templates.find(t => t.category === 'botao');
    setItems([...items, {
      templateId: defaultCamisa?.id || '',
      collarTemplateId: defaultGola?.id || '',
      buttonTemplateId: defaultBotao?.id || '',
      shirtType: defaultCamisa?.name || '',
      quantity: 10,
      fabricType: fabrics[0]?.name || '',
      fabricColor: fabrics[0]?.colors[0] || '',
      fabricUsagePerUnit: defaultCamisa?.fabricConsumption || 1.2,
      totalFabricEstimate: parseFloat((10 * (defaultCamisa?.fabricConsumption || 1.2)).toFixed(1))
    }]);
  };

  const removeItem = (idx: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== idx));
    }
  };

  const getAvailableStock = (type: string, color: string) => {
    const item = stock.find(s => s.name === type && s.color === color);
    return item ? item.quantity : 0;
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[idx], [field]: value };
    
    // Resolve Camisa Template
    const camisaId = field === 'templateId' ? value : item.templateId;
    const camisaT = templates.find(t => t.id === camisaId);
    if (camisaT) {
      item.shirtType = camisaT.name;
      item.fabricUsagePerUnit = camisaT.fabricConsumption || 0;
    }

    if (field === 'fabricType') {
        const typeData = fabrics.find(f => f.name === value);
        item.fabricColor = typeData?.colors[0] || '';
    }

    const q = Number.isNaN(item.quantity) ? 0 : (item.quantity || 0);
    const u = Number.isNaN(item.fabricUsagePerUnit) ? 0 : (item.fabricUsagePerUnit || 0);
    item.totalFabricEstimate = parseFloat((q * u).toFixed(1));

    newItems[idx] = item;
    setItems(newItems);
  };

  const calculateGrandTotalFabric = () => {
    return parseFloat(items.reduce((acc, item) => acc + (item.totalFabricEstimate || 0), 0).toFixed(1));
  };

  const calculateGrandTotalButtons = () => {
    return items.reduce((acc, item) => {
      const btnTemplate = templates.find(t => t.id === item.buttonTemplateId);
      const perUnit = btnTemplate?.buttonConsumption || 0;
      return acc + (Number(item.quantity) || 0) * perUnit;
    }, 0);
  };

  const calculateGrandTotalCollars = () => {
    return items.reduce((acc, item) => {
      const golaTemplate = templates.find(t => t.id === item.collarTemplateId);
      const perUnit = golaTemplate?.collarConsumption || 0;
      return acc + (Number(item.quantity) || 0) * perUnit;
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerInfo.customerName) {
      alert('Nome do cliente é obrigatório');
      return;
    }

    const finalItems = items.map(item => ({
      ...item,
      quantity: Number.isNaN(item.quantity) ? 0 : item.quantity,
    })) as OrderItem[];

    if (finalItems.some(i => i.quantity <= 0)) {
      alert('Todas as quantidades devem ser maiores que zero.');
      return;
    }

    const finalCustomerInfo = { ...customerInfo };
    if (clientMode === 'new') {
      const addr = newClientAddress;
      finalCustomerInfo.customerAddress = addr.addressStreet ? `${addr.addressStreet}, ${addr.addressNumber}${addr.addressComplement ? ', ' + addr.addressComplement : ''}, ${addr.addressNeighborhood}, ${addr.addressCity}/${addr.addressState} - CEP: ${addr.addressCep}` : '';
    }

    onSubmit({
      ...finalCustomerInfo,
      items: finalItems,
      status: initialData ? initialData.status : 'pending',
      photos: initialData?.photos || [],
      isDelayed: initialData?.isDelayed || false,
      nfeIssued: initialData?.nfeIssued || false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-zinc-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-none md:rounded-3xl p-4 md:p-8 max-w-4xl w-full shadow-2xl overflow-y-auto h-full md:h-auto md:max-h-[90vh]"
      >
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-zinc-900 text-white rounded-2xl">
              <ShoppingBasket size={24} />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900">
              {initialData ? 'Editar Pedido de Confecção' : 'Novo Pedido de Confecção'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Sessão Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 border-r border-zinc-100 pr-6">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Cliente</h3>
                <div className="flex p-0.5 bg-zinc-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setClientMode('select')}
                    className={`p-1.5 rounded-md transition-all ${clientMode === 'select' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                    title="Selecionar Existente"
                  >
                    <Search size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientMode('new')}
                    className={`p-1.5 rounded-md transition-all ${clientMode === 'new' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                    title="Novo Cadastro"
                  >
                    <UserPlus size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {clientMode === 'select' ? (
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1 ml-1">Selecionar Cliente</label>
                    <select
                      className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all text-sm"
                      value={selectedClientId}
                      onChange={e => setSelectedClientId(e.target.value)}
                    >
                      <option value="">Selecione um cliente...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1 ml-1">Razão Social / Nome *</label>
                      <input
                        type="text"
                        required
                        placeholder="Nome para cadastro"
                        className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all text-sm"
                        value={customerInfo.customerName}
                        onChange={e => setCustomerInfo({ ...customerInfo, customerName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1 ml-1">CNPJ / CPF</label>
                      <input
                        type="text"
                        placeholder="00.000.000/0000-00"
                        className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all text-sm"
                        value={customerInfo.customerTaxId}
                        onChange={e => setCustomerInfo({ ...customerInfo, customerTaxId: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {clientMode === 'new' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1 ml-1">E-mail</label>
                      <input
                        type="email"
                        className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all text-sm"
                        value={customerInfo.customerEmail}
                        onChange={e => setCustomerInfo({ ...customerInfo, customerEmail: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1 ml-1">Telefone / WhatsApp</label>
                      <input
                        type="tel"
                        placeholder="(00) 00000-0000"
                        className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all text-sm"
                        value={customerInfo.customerPhone}
                        onChange={e => setCustomerInfo({ ...customerInfo, customerPhone: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {clientMode === 'new' && (
                  <div className="space-y-3 pt-2">
                    <label className="block text-[10px] font-bold uppercase text-zinc-800 mb-1 ml-1">Endereço Completo</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <input
                        placeholder="CEP"
                        className="px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg outline-none"
                        value={newClientAddress.addressCep}
                        onChange={async (e) => {
                          const cepValue = e.target.value;
                          setNewClientAddress({...newClientAddress, addressCep: cepValue});
                          const cleanCep = cepValue.replace(/\D/g, '');
                          if (cleanCep.length === 8) {
                            try {
                              const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                              const data = await res.json();
                              if (!data.erro) {
                                setNewClientAddress(prev => ({
                                  ...prev,
                                  addressCep: cepValue,
                                  addressStreet: data.logradouro || '',
                                  addressNeighborhood: data.bairro || '',
                                  addressCity: data.localidade || '',
                                  addressState: data.uf || ''
                                }));
                              }
                            } catch (e) {}
                          }
                        }}
                      />
                      <input
                        placeholder="Cidade"
                        className="px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg outline-none"
                        value={newClientAddress.addressCity}
                        onChange={e => setNewClientAddress({...newClientAddress, addressCity: e.target.value})}
                      />
                      <input
                        placeholder="Logradouro"
                        className="col-span-2 px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg outline-none"
                        value={newClientAddress.addressStreet}
                        onChange={e => setNewClientAddress({...newClientAddress, addressStreet: e.target.value})}
                      />
                      <input
                        placeholder="Nº"
                        className="px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg outline-none"
                        value={newClientAddress.addressNumber}
                        onChange={e => setNewClientAddress({...newClientAddress, addressNumber: e.target.value})}
                      />
                      <input
                        placeholder="Estado (UF)"
                        maxLength={2}
                        className="px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg outline-none"
                        value={newClientAddress.addressState}
                        onChange={e => setNewClientAddress({...newClientAddress, addressState: e.target.value.toUpperCase()})}
                      />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Data Estimada de Entrega</label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                      value={customerInfo.deliveryDate}
                      onChange={e => setCustomerInfo({ ...customerInfo, deliveryDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Desenhos/Projetos</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {customerInfo.designImages.map((img, i) => (
                        <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-zinc-200 group">
                          <img src={img} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => setCustomerInfo({ 
                              ...customerInfo, 
                              designImages: customerInfo.designImages.filter((_, idx) => idx !== i) 
                            })}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      {customerInfo.designImages.length < 6 && (
                        <label className="aspect-video border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 transition-colors">
                          <Plus size={20} className="text-zinc-400" />
                          <span className="text-[10px] text-zinc-400 font-bold mt-1">Upload</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const files = Array.from(e.target.files || []) as File[];
                              files.forEach(file => {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setCustomerInfo(prev => ({
                                    ...prev,
                                    designImages: [...prev.designImages, reader.result as string]
                                  }));
                                };
                                reader.readAsDataURL(file);
                              });
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Listagem de Itens */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Itens da Produção</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-xs font-bold text-zinc-900 hover:text-zinc-600 flex items-center bg-zinc-50 px-3 py-1.5 rounded-full transition-all"
                >
                  <Plus size={14} className="mr-1" /> Add Produto
                </button>
              </div>

              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {items.map((item, idx) => {
                    const camisaT = templates.find(t => t.id === item.templateId);
                    const golaT = templates.find(t => t.id === item.collarTemplateId);
                    const botaoT = templates.find(t => t.id === item.buttonTemplateId);
                    
                    const fabricCons = camisaT?.fabricConsumption || 0;
                    const buttonCons = botaoT?.buttonConsumption || 0;
                    const collarCons = golaT?.collarConsumption || 0;

                    const itemFabricTotal = parseFloat(((item.quantity || 0) * fabricCons).toFixed(1));
                    const itemButtonsTotal = (item.quantity || 0) * buttonCons;
                    const itemCollarsTotal = (item.quantity || 0) * collarCons;

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-zinc-50 p-6 rounded-2xl border border-zinc-150 relative group"
                      >
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="absolute -top-2 -right-2 p-1.5 bg-white border border-zinc-200 text-red-500 rounded-full opacity-100 transition-opacity shadow-sm z-10 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 ml-1">Modelo de Camisa (Tamanho e Tecido) *</label>
                            <select
                              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-semibold h-12"
                              value={item.templateId}
                              onChange={e => updateItem(idx, 'templateId', e.target.value)}
                            >
                              <option value="">Selecione um molde de camisa...</option>
                              {camisaTemplates.map(t => (
                                <option key={t.id} value={t.id}>{t.name} (Gasto: {t.fabricConsumption}m)</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 ml-1">Modelo de Gola (Opcional)</label>
                            <select
                              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-semibold h-12"
                              value={item.collarTemplateId || ''}
                              onChange={e => {
                                updateItem(idx, 'collarTemplateId', e.target.value);
                                const t = golaTemplates.find(g => g.id === e.target.value);
                                if (t) {
                                  updateItem(idx, 'collarType', t.name.replace('Gola • ', ''));
                                } else {
                                  updateItem(idx, 'collarType', '');
                                }
                              }}
                            >
                              <option value="">Nenhum / Sem Gola Adicional</option>
                              {golaTemplates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 ml-1">Modelo de Botão (Opcional)</label>
                            <select
                              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-semibold h-12"
                              value={item.buttonTemplateId || ''}
                              onChange={e => updateItem(idx, 'buttonTemplateId', e.target.value)}
                            >
                              <option value="">Nenhum / Sem Botões</option>
                              {botaoTemplates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 ml-1">Quantidade daquele Tamanho *</label>
                            <input
                              type="number"
                              required
                              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-zinc-900 transition-all h-12"
                              value={item.quantity === 0 ? '' : item.quantity}
                              onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 ml-1">Cor / Detalhes das Cores *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: Preto total, Azul com gola branca"
                              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium h-12"
                              value={item.color || ''}
                              onChange={e => updateItem(idx, 'color', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Calculations per Item */}
                        <div className="mt-4 pt-4 border-t border-zinc-200/50 flex flex-wrap gap-4 text-xs font-semibold text-zinc-500">
                          <div>
                            <span>Tecido Estimado: </span>
                            <span className="text-zinc-900 font-bold font-mono">{itemFabricTotal}m</span>
                          </div>
                          <div>
                            <span>Botões Estimados: </span>
                            <span className="text-zinc-900 font-bold font-mono">{itemButtonsTotal} un</span>
                          </div>
                          <div>
                            <span>Golas Estimadas: </span>
                            <span className="text-zinc-900 font-bold font-mono">{itemCollarsTotal} un</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="bg-zinc-900 text-white p-4 rounded-2xl flex flex-wrap items-center gap-6 w-full md:w-auto">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Calculator size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase opacity-60 tracking-wider">Tecido Total</p>
                  <p className="text-base font-black font-mono">{calculateGrandTotalFabric()}m</p>
                </div>
              </div>
              <div className="h-8 w-px bg-white/15 hidden sm:block"></div>
              <div>
                <p className="text-[9px] font-bold uppercase opacity-60 tracking-wider">Botões Totais</p>
                <p className="text-base font-black font-mono">{calculateGrandTotalButtons()} un</p>
              </div>
              <div className="h-8 w-px bg-white/15 hidden sm:block"></div>
              <div>
                <p className="text-[9px] font-bold uppercase opacity-60 tracking-wider">Golas Totais</p>
                <p className="text-base font-black font-mono">{calculateGrandTotalCollars()} un</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {initialData && onDeleteOrder && (
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-6 py-4 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 hover:border-red-300 border border-red-200/55 rounded-2xl font-black text-sm flex items-center justify-center transition-all shadow-md active:scale-95"
                >
                  <Trash2 size={18} className="mr-2 stroke-[2.5]" />
                  Cancelar Pedido
                </button>
              )}
              <button
                type="submit"
                className="px-10 py-4 bg-zinc-900 text-white rounded-2xl font-bold flex items-center justify-center hover:bg-zinc-800 transition-all shadow-xl hover:-translate-y-1 active:translate-y-0 w-full sm:w-auto"
              >
                <Save size={20} className="mr-2" />
                {initialData ? 'Atualizar Pedido' : 'Iniciar Produção'}
              </button>
            </div>
          </div>
        </form>
      </motion.div>

      {/* Pop-up de Confirmação de Cancelamento do Pedido */}
      <AnimatePresence>
        {showCancelConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-6 md:p-8 max-w-md w-full shadow-2xl border border-red-100 flex flex-col items-center text-center relative"
            >
              <div className="p-4 bg-red-50 text-red-600 rounded-full mb-4 animate-pulse">
                <Trash2 size={36} className="stroke-[2.5]" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Cancelar Pedido definitivamente?</h3>
              <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
                Tem certeza que deseja cancelar e remover este pedido de <strong>{initialData?.customerName || 'Cliente'}</strong>? Esta ação é irreversível e excluirá o pedido permanentemente do sistema.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 px-5 py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold text-sm transition-all"
                >
                  Não, Voltar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (initialData?.id && onDeleteOrder) {
                      try {
                        await onDeleteOrder(initialData.id);
                        setShowCancelConfirm(false);
                        onClose();
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  }}
                  className="flex-1 px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-200"
                >
                  Sim, Cancelar e Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
