import React, { useState, useEffect } from 'react';
import { Truck, Search, Plus, Phone, Trash2, Edit2, Save, User, Factory } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface Supplier {
  id: string;
  name: string;
  phone?: string;
  contact?: string;
  notes?: string;
}

export const SupplierManagement = () => {
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', contact: '', notes: '' });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('suppliers').select('*').order('name');
      if (error) throw error;
      setItems((data || []) as Supplier[]);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const openModal = (s?: Supplier) => {
    if (s) {
      setEditing(s);
      setForm({ name: s.name, phone: s.phone || '', contact: s.contact || '', notes: s.notes || '' });
    } else {
      setEditing(null);
      setForm({ name: '', phone: '', contact: '', notes: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name: form.name, phone: form.phone, contact: form.contact, notes: form.notes };
      if (editing) {
        const { error } = await supabase.from('suppliers').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('suppliers').insert(payload);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (err: any) {
      alert('Erro ao salvar fornecedor: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este fornecedor?')) return;
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      fetchItems();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const filtered = items.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || '').includes(search) ||
    (s.contact || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Fornecedores</h1>
          <p className="text-zinc-500 text-sm">Cadastro dos fornecedores de materiais e serviços.</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center space-x-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors shadow-sm">
          <Plus size={18} /><span>Novo Fornecedor</span>
        </button>
      </div>

      <div className="flex bg-white rounded-xl border border-zinc-200 px-5 py-2.5 focus-within:ring-2 focus-within:ring-zinc-900/10 transition-all max-w-md shadow-sm">
        <Search className="text-zinc-400 mr-2" size={20} />
        <input type="text" placeholder="Buscar por nome, telefone ou contato..." className="bg-transparent border-none focus:ring-0 w-full text-sm placeholder:text-zinc-400 outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-zinc-100 rounded-2xl border border-zinc-200" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 bg-white rounded-2xl border border-dashed border-zinc-200">
          <Factory size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Nenhum fornecedor cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(s => (
            <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={s.id}
              className="bg-white rounded-2xl border border-zinc-200 p-5 hover:shadow-lg hover:shadow-zinc-200/50 transition-all group relative">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                <button onClick={() => openModal(s)} className="p-2 bg-zinc-50 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(s.id)} className="p-2 bg-red-50 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors"><Trash2 size={16} /></button>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center text-white shrink-0"><Factory size={22} /></div>
                <div className="flex-1 min-w-0 pr-16">
                  <h3 className="font-bold text-zinc-900 truncate leading-tight mb-1">{s.name}</h3>
                  {s.contact && <p className="text-xs text-zinc-500 flex items-center"><User size={12} className="mr-1" /> {s.contact}</p>}
                </div>
              </div>
              <div className="mt-5 pt-5 border-t border-zinc-50 space-y-2">
                {s.phone && <div className="flex items-center text-sm text-zinc-600"><Phone size={14} className="mr-2.5 text-zinc-400" />{s.phone}</div>}
                {s.notes && <p className="text-xs text-zinc-500 italic line-clamp-2">{s.notes}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-lg overflow-hidden relative shadow-2xl">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h2 className="text-xl font-bold text-zinc-900">{editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors"><Plus size={20} className="rotate-45" /></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Nome *</label>
                  <input required type="text" className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Telefone</label>
                    <input type="tel" placeholder="(00) 00000-0000" className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Contato</label>
                    <input type="text" placeholder="Pessoa de contato" className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Observações</label>
                  <textarea rows={3} className="w-full px-5 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm resize-none" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-zinc-600 hover:bg-zinc-100 rounded-xl font-medium transition-colors">Cancelar</button>
                  <button type="submit" className="px-8 py-2.5 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors shadow-lg"><Save size={18} className="inline mr-2" />Salvar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
