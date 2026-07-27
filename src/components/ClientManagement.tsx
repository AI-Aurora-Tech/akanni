import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  MapPin, 
  Trash2, 
  ExternalLink,
  Edit2,
  Building2,
  FileText,
  Save,
  X,
  SearchIcon,
  MapPinned,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Client } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const ClientManagement = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isCepLoading, setIsCepLoading] = useState(false);

  const formatTaxId = (value: string) => {
    const val = value.replace(/\D/g, '');
    if (val.length <= 11) {
      return val.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return val.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    setIsCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          addressStreet: data.logradouro || '',
          addressNeighborhood: data.bairro || '',
          addressCity: data.localidade || '',
          addressState: data.uf || ''
        }));
      }
    } catch (err) {
      console.error("CEP fetch failed", err);
    } finally {
      setIsCepLoading(false);
    }
  };
  
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    email: '',
    phone: '',
    addressCep: '',
    addressStreet: '',
    addressNumber: '',
    addressComplement: '',
    addressNeighborhood: '',
    addressCity: '',
    addressState: ''
  });

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      if (data) {
        setClients(data.map(c => ({
          id: c.id,
          name: c.name,
          taxId: c.tax_id,
          email: c.email,
          phone: c.phone,
          addressCep: c.address_cep,
          addressStreet: c.address_street,
          addressNumber: c.address_number,
          addressComplement: c.address_complement,
          addressNeighborhood: c.address_neighborhood,
          addressCity: c.address_city,
          addressState: c.address_state,
          createdAt: c.created_at
        })));
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        taxId: client.taxId || '',
        email: client.email || '',
        phone: client.phone || '',
        addressCep: client.addressCep || '',
        addressStreet: client.addressStreet || '',
        addressNumber: client.addressNumber || '',
        addressComplement: client.addressComplement || '',
        addressNeighborhood: client.addressNeighborhood || '',
        addressCity: client.addressCity || '',
        addressState: client.addressState || ''
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: '',
        taxId: '',
        email: '',
        phone: '',
        addressCep: '',
        addressStreet: '',
        addressNumber: '',
        addressComplement: '',
        addressNeighborhood: '',
        addressCity: '',
        addressState: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        tax_id: formData.taxId,
        email: formData.email,
        phone: formData.phone,
        address_cep: formData.addressCep,
        address_street: formData.addressStreet,
        address_number: formData.addressNumber,
        address_complement: formData.addressComplement,
        address_neighborhood: formData.addressNeighborhood,
        address_city: formData.addressCity,
        address_state: formData.addressState
      };

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', editingClient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clients')
          .insert(payload);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchClients();
    } catch (err: any) {
      alert('Erro ao salvar cliente: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este cliente?')) return;
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchClients();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.taxId?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Carteira de Clientes</h1>
          <p className="text-zinc-500 text-sm">Gerencie o cadastro de seus clientes para faturamento e produção.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span>Novo Cliente</span>
        </button>
      </div>

      <div className="flex bg-white rounded-xl border border-zinc-200 px-5 py-2.5 focus-within:ring-2 focus-within:ring-zinc-900/10 transition-all max-w-md shadow-sm">
        <Search className="text-zinc-400 mr-2" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nome, CPF/CNPJ ou e-mail..."
          className="bg-transparent border-none focus:ring-0 w-full text-sm placeholder:text-zinc-400"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-zinc-100 rounded-2xl border border-zinc-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={client.id}
              className="bg-white rounded-2xl border border-zinc-200 p-5 hover:shadow-lg hover:shadow-zinc-200/50 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                <button 
                  onClick={() => handleOpenModal(client)}
                  className="p-2 bg-zinc-50 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(client.id)}
                  className="p-2 bg-red-50 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center text-white shrink-0 shadow-sm shadow-zinc-900/20">
                  <Building2 size={24} />
                </div>
                <div className="flex-1 min-w-0 pr-16">
                  <h3 className="font-bold text-zinc-900 truncate leading-tight mb-1">{client.name}</h3>
                  <div className="flex items-center text-xs font-mono text-zinc-400 tracking-wider">
                    <FileText size={12} className="mr-1" />
                    {client.taxId || 'SEM CNPJ/CPF'}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-zinc-50 space-y-3">
                {client.email && (
                  <div className="flex items-center text-sm text-zinc-600">
                    <Mail size={14} className="mr-2.5 text-zinc-400" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center text-sm text-zinc-600">
                    <Phone size={14} className="mr-2.5 text-zinc-400" />
                    {client.phone}
                  </div>
                )}
                <div className="flex items-start text-sm text-zinc-600">
                  <MapPin size={14} className="mr-2.5 mt-0.5 text-zinc-400 shrink-0" />
                  <span className="line-clamp-2">
                    {client.addressStreet ? (
                      `${client.addressStreet}, ${client.addressNumber} - ${client.addressCity}/${client.addressState}`
                    ) : (
                      <span className="italic text-zinc-300">Endereço não informado</span>
                    )}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Cadastro/Edição */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden relative shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">
                    {editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
                  </h2>
                  <p className="text-zinc-500 text-sm">Preencha as informações para faturamento.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
                >
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-zinc-700 mb-1.5">Razão Social / Nome Completo *</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition-all text-sm"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 ml-1 tracking-widest">CNPJ / CPF</label>
                      <input 
                        type="text" 
                        placeholder="000.000.000-00"
                        className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none h-12 transition-all font-mono text-sm"
                        value={formData.taxId}
                        onChange={(e) => setFormData({...formData, taxId: formatTaxId(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1.5">E-mail</label>
                      <input 
                        type="email" 
                        className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition-all text-sm"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1.5">Telefone</label>
                      <input 
                        type="tel" 
                        className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition-all text-sm"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-100">
                    <div className="flex items-center space-x-2 mb-6">
                      <MapPinned size={16} className="text-zinc-400" />
                      <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Endereço de Entrega/Faturamento</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="md:col-span-2 relative">
                        <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 ml-1 tracking-widest">CEP</label>
                        <input 
                          type="text" 
                          placeholder="00000-000"
                          className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none h-12 transition-all font-mono text-sm"
                          value={formData.addressCep}
                          onBlur={handleCepBlur}
                          onChange={(e) => setFormData({...formData, addressCep: e.target.value})}
                        />
                        {isCepLoading && (
                          <Loader2 size={16} className="absolute right-3 top-[34px] animate-spin text-zinc-400" />
                        )}
                      </div>
                      <div className="md:col-span-4">
                        <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 ml-1 tracking-widest">Logradouro</label>
                        <input 
                          type="text" 
                          placeholder="Rua, Avenida..."
                          className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none h-12 transition-all text-sm"
                          value={formData.addressStreet}
                          onChange={(e) => setFormData({...formData, addressStreet: e.target.value})}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 ml-1 tracking-widest">Número</label>
                        <input 
                          type="text" 
                          placeholder="Nº"
                          className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none h-12 transition-all text-sm"
                          value={formData.addressNumber}
                          onChange={(e) => setFormData({...formData, addressNumber: e.target.value})}
                        />
                      </div>
                      <div className="md:col-span-4">
                        <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 ml-1 tracking-widest">Complemento</label>
                        <input 
                          type="text" 
                          placeholder="Sala, Apto, Bloco..."
                          className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none h-12 transition-all text-sm"
                          value={formData.addressComplement}
                          onChange={(e) => setFormData({...formData, addressComplement: e.target.value})}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 ml-1 tracking-widest">Bairro</label>
                        <input 
                          type="text" 
                          className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none h-12 transition-all text-sm"
                          value={formData.addressNeighborhood}
                          onChange={(e) => setFormData({...formData, addressNeighborhood: e.target.value})}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 ml-1 tracking-widest">Cidade</label>
                        <input 
                          type="text" 
                          className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none h-12 transition-all text-sm"
                          value={formData.addressCity}
                          onChange={(e) => setFormData({...formData, addressCity: e.target.value})}
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 ml-1 tracking-widest">UF</label>
                        <input 
                          type="text" 
                          maxLength={2}
                          className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 h-12 transition-all uppercase text-center text-sm outline-none"
                          value={formData.addressState}
                          onChange={(e) => setFormData({...formData, addressState: e.target.value.toUpperCase()})}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-end space-x-3 sticky bottom-0 bg-white pt-4 pb-2">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 text-zinc-600 hover:bg-zinc-100 rounded-xl font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-2.5 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-900/20"
                  >
                    <Save size={18} className="inline mr-2" />
                    Salvar Cliente
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
