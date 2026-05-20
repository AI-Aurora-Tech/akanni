import React from 'react';
import { LayoutDashboard, ShoppingBag, Box, Users, Settings, LogOut, Menu, X, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  key?: string;
}

const SidebarItem = ({ icon, label, active, onClick }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active
        ? 'bg-zinc-900 text-white'
        : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
    }`}
  >
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </button>
);

export const DashboardLayout: React.FC<{ children: React.ReactNode, activeTab: string, setActiveTab: (tab: string) => void }> = ({ children, activeTab, setActiveTab }) => {
  const { user, profile, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(window.innerWidth > 768);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: <LayoutDashboard size={20} />, roles: ['super_admin', 'admin_geral', 'gestor_geral'] },
    { id: 'orders', label: 'Pedidos', icon: <ShoppingBag size={20} />, roles: ['super_admin', 'admin_geral', 'gestor_geral', 'gerente_producao', 'funcionario_padrao'] },
    { id: 'clients', label: 'Clientes', icon: <Users size={20} />, roles: ['super_admin', 'admin_geral', 'gestor_geral', 'gerente_producao', 'funcionario_padrao'] },
    { id: 'templates', label: 'Modelos de Gasto', icon: <Box size={20} />, roles: ['super_admin', 'admin_geral', 'gestor_geral', 'gerente_producao', 'funcionario_padrao'] },
    { id: 'inventory', label: 'Estoque de Tecidos', icon: <Box size={20} />, roles: ['super_admin', 'admin_geral', 'gestor_geral', 'gerente_producao', 'funcionario_padrao'] },
    { id: 'users', label: 'Usuários', icon: <Users size={20} />, roles: ['super_admin'] },
    { id: 'settings', label: 'Minha Conta', icon: <Settings size={20} />, roles: ['super_admin', 'admin_geral', 'gerente_producao', 'gestor_geral', 'funcionario_padrao'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    profile?.role === 'super_admin' || (item.roles as string[]).includes(profile?.role || '')
  );

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden font-sans">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isSidebarOpen ? (isMobile ? '100%' : 280) : 0, 
          opacity: isSidebarOpen ? 1 : 0,
          x: isSidebarOpen ? 0 : -280
        }}
        className={`bg-white border-r border-zinc-200 flex flex-col relative z-50 ${isMobile ? 'fixed inset-y-0 left-0 max-w-[280px]' : ''}`}
      >
        <div className="p-6 border-b border-zinc-100 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-zinc-900 rounded flex items-center justify-center text-white font-bold text-xs">AK</div>
            <span className="text-xl font-bold tracking-tight text-zinc-900">Akanni Confecções</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {filteredMenuItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-100">
          <div className="flex items-center space-x-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white">
              {getInitials(profile?.displayName || '')}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate text-zinc-900">{profile?.displayName || 'USUÁRIO'}</p>
              <p className="text-[10px] text-zinc-400 font-mono truncate uppercase tracking-widest">
                {profile?.role === 'super_admin' ? 'Super Admin' : 
                 profile?.role === 'admin_geral' ? 'Admin Geral' :
                 profile?.role === 'gerente_producao' ? 'Gerente de Produção' :
                 profile?.role === 'funcionario_padrao' ? 'Funcionário Padrão' : 
                 profile?.role === 'gestor_geral' ? 'Gestor Geral' : 'Usuário'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200"
          >
            <LogOut size={20} />
            <span className="font-medium text-sm">Sair</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center space-x-2 md:space-x-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-xs md:text-lg font-bold text-zinc-900 uppercase tracking-wider opacity-50 truncate">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h1>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 text-zinc-400 hover:bg-zinc-100 rounded-lg relative transition-colors ${showNotifications ? 'bg-zinc-100 text-zinc-900' : ''}`}
              >
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-zinc-100 z-20 overflow-hidden"
                    >
                      <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                        <h3 className="font-bold text-zinc-900 text-sm">Notificações</h3>
                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">2 NOVAS</span>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        <div className="p-4 border-b border-zinc-50 hover:bg-zinc-50 transition-colors cursor-pointer">
                          <p className="text-xs font-bold text-zinc-900">Novo pedido recebido!</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Cliente: João Silva • 10 camisetas</p>
                          <p className="text-[9px] text-zinc-400 mt-2 font-mono">HÁ 5 MINUTOS</p>
                        </div>
                        <div className="p-4 border-b border-zinc-50 hover:bg-zinc-50 transition-colors cursor-pointer">
                          <p className="text-xs font-bold text-zinc-900">Estoque baixo: Linha Branca</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Atingiu o nível crítico de 2 unidades.</p>
                          <p className="text-[9px] text-zinc-400 mt-2 font-mono">HÁ 2 HORAS</p>
                        </div>
                      </div>
                      <div className="p-3 bg-zinc-50 text-center">
                        <button className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors">Ver todas</button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
