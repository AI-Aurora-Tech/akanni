import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Package, AlertTriangle, CheckCircle, ShoppingBag } from 'lucide-react';
import { Order, StockItem } from '../types';

import { motion } from 'motion/react';

interface StatsOverviewProps {
  orders: Order[];
  stock: StockItem[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ orders, stock }) => {
  const stats = useMemo(() => {
    const pending = orders.filter(o => o.status !== 'delivered').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const delayed = orders.filter(o => {
      if (o.status === 'delivered') return false;
      if (o.isDelayed) return true;
      const todayStr = new Date().toISOString().split('T')[0];
      return o.deliveryDate < todayStr;
    }).length;
    const lowStock = stock.filter(s => s.quantity <= s.minQuantity).length;

    const totalActiveUnits = orders
      .filter(o => o.status !== 'delivered')
      .reduce((acc, o) => acc + (Array.isArray(o.items) ? o.items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0) : 0), 0);

    return [
      { 
        label: 'Unidades Ativas', 
        value: totalActiveUnits, 
        icon: <Package className="text-zinc-950" size={20} />, 
        trend: '+12% este mês',
        bgColor: 'from-zinc-50 to-zinc-100/50',
        borderColor: 'border-zinc-200',
        glowColor: 'shadow-zinc-100'
      },
      { 
        label: 'Pedidos Ativos', 
        value: pending, 
        icon: <ShoppingBag className="text-blue-600" size={20} />, 
        trend: 'Operação Ativa', 
        bgColor: 'from-blue-50/50 to-blue-100/10',
        borderColor: 'border-blue-100',
        glowColor: 'shadow-blue-50'
      },
      { 
        label: 'Atrasos Alertados', 
        value: delayed, 
        icon: <AlertTriangle className="text-amber-600" size={20} />, 
        trend: 'Status Crítico', 
        bgColor: 'from-amber-50/50 to-amber-100/10',
        borderColor: 'border-amber-100',
        glowColor: 'shadow-amber-50'
      },
      { 
        label: 'Matéria-prima Baixa', 
        value: lowStock, 
        icon: <AlertTriangle className="text-red-600" size={20} />, 
        trend: 'Reposição Necessária', 
        bgColor: 'from-red-50/50 to-red-100/10',
        borderColor: 'border-red-100',
        glowColor: 'shadow-red-50'
      },
    ];
  }, [orders, stock]);

  const chartData = useMemo(() => {
    const STATUS_LABELS: Record<string, string> = {
      pending: 'Pendentes',
      cutting: 'Corte',
      sewing: 'Costura',
      finishing: 'Acabamento',
      delivered: 'Entregue'
    };

    const statusCounts = orders.reduce((acc, order) => {
      const label = STATUS_LABELS[order.status] || order.status;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const COLORS = ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'];

  return (
    <div className="space-y-8">
      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            key={idx} 
            className={`bg-gradient-to-br ${stat.bgColor} p-6 rounded-3xl border ${stat.borderColor} shadow-md ${stat.glowColor} hover:shadow-lg transition-all hover:-translate-y-1 duration-300 relative overflow-hidden`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-zinc-100">{stat.icon}</div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 font-mono bg-white/80 px-2 py-1 rounded-full border border-zinc-100 shadow-tiny">{stat.trend}</span>
            </div>
            <h3 className="text-3xl font-black text-zinc-900 tracking-tight font-sans mb-1">{stat.value}</h3>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Production Flow Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white p-8 rounded-[32px] border border-zinc-200/80 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-black text-zinc-900 uppercase tracking-wider">Fluxo de Produção</h2>
              <p className="text-xs text-zinc-400 font-medium">Distribuição por status atual de pedidos</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#71717a' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#71717a' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(244, 244, 245, 0.4)' }}
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e4e4e7', backgroundColor: '#ffffff', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.05)' }}
                />
                <Bar dataKey="value" fill="#18181b" radius={[8, 8, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Stock status */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="bg-white p-8 rounded-[32px] border border-zinc-200/80 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-black text-zinc-900 uppercase tracking-wider">Nível de Estoque</h2>
              <p className="text-xs text-zinc-400 font-medium">Principais materiais em uso no Akanni</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stock.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={6}
                  dataKey="quantity"
                  nameKey="name"
                >
                  {stock.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.8)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e4e4e7', backgroundColor: '#ffffff', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.05)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
