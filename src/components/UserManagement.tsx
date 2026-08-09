import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';
import { UserPlus, Trash2, Shield, Mail, User as UserIcon, Loader2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    displayName: '',
    role: 'funcionario_padrao' as UserRole,
    tempPassword: ''
  });

  const roleLabels: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    admin_geral: 'Admin Geral',
    gerente_producao: 'Gerente de Produção',
    gestor_geral: 'Gestor Geral',
    funcionario_padrao: 'Funcionário Padrão'
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('display_name');
      
      if (error) throw error;
      
      if (data) {
        setUsers(data.map((u: any) => ({
          id: u.id,
          uid: u.uid || u.id,
          username: u.username,
          email: u.email,
          displayName: u.display_name,
          role: u.role,
          tempPassword: u.temp_password
        } as UserProfile)));
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const channel = supabase.channel('users-all-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchUsers)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      username: user.username || '',
      email: user.email || '',
      displayName: user.displayName || '',
      role: (user.role as UserRole) || 'funcionario_padrao',
      tempPassword: user.tempPassword || ''
    });
    setIsAdding(true);
  };

    const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.username || !formData.tempPassword) {
        alert("Usuário e Senha Inicial são obrigatórios.");
        return;
      }

      const trimmedUser = formData.username.trim().toLowerCase();
      const finalEmail = formData.email.trim() || `${trimmedUser}@akanni.com`;
      
      const payload = {
        id: editingUser ? editingUser.id : finalEmail,
        email: finalEmail,
        username: trimmedUser,
        display_name: formData.displayName || trimmedUser,
        role: formData.role,
        temp_password: formData.tempPassword,
        uid: editingUser?.uid || null // Keep existing UID if editing
      };

      const { error } = await supabase.from('users').upsert(payload);
      if (error) throw error;
      
      alert(editingUser ? "Acesso atualizado!" : "Novo acesso cadastrado com sucesso!");
      setIsAdding(false);
      setEditingUser(null);
      setFormData({ username: '', email: '', displayName: '', role: 'funcionario_padrao', tempPassword: '' });
      fetchUsers();
    } catch (err: any) {
      console.error('Error saving user:', err);
      alert("Erro ao salvar acesso: " + (err.message || "Tente novamente."));
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Deseja realmente remover este acesso?')) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      alert("Acesso removido.");
      fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      alert("Erro ao remover acesso: " + (err.message || "Tente novamente."));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Gestão de Equipe</h2>
          <p className="text-zinc-500 text-sm">Controle quem acessa o quê no Akanni</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-2 bg-zinc-900 text-white px-6 py-3 rounded-2xl hover:bg-zinc-800 transition-all font-bold shadow-lg"
        >
          <UserPlus size={20} />
          <span>Novo Usuário</span>
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-zinc-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 border-b border-zinc-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Nome / Usuário</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Identificador (E-mail)</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Nível de Acesso</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-500">
                      <UserIcon size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-zinc-900">{user.displayName || 'Sem nome'}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">@{user.username || user.email?.split('@')[0]}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-500">{user.email}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <Shield size={14} className="text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-700">{roleLabels[user.role as UserRole] || user.role}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <button
                      onClick={() => handleOpenEdit(user)}
                      className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-xl font-bold text-zinc-900 mb-6">
                {editingUser ? 'Editar Acesso' : 'Cadastrar Novo Acesso'}
              </h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1 ml-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Silva"
                    className="w-full px-4 py-2 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900"
                    value={formData.displayName}
                    onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-400 mb-1 ml-1">Usuário (Login)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: joao.silva"
                      className="w-full px-4 py-2 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900"
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-400 mb-1 ml-1">Senha Inicial</label>
                    <input
                      type="text"
                      required
                      placeholder="Mínimo 6 chars"
                      className="w-full px-4 py-2 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900"
                      value={formData.tempPassword}
                      onChange={e => setFormData({ ...formData, tempPassword: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1 ml-1">E-mail (Opcional)</label>
                  <input
                    type="email"
                    placeholder="Para recuperação de senha"
                    className="w-full px-4 py-2 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">Se vazio, o login será via usuário.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1 ml-1">Nível de Acesso</label>
                  <select
                    className="w-full px-4 py-2 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin_geral">Admin Geral</option>
                    <option value="gerente_producao">Gerente de Produção</option>
                    <option value="gestor_geral">Gestor Geral</option>
                    <option value="funcionario_padrao">Funcionário Padrão</option>
                  </select>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingUser(null);
                    }}
                    className="flex-1 px-6 py-3 border border-zinc-200 rounded-xl font-bold text-zinc-500 hover:bg-zinc-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800"
                  >
                    Salvar
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
