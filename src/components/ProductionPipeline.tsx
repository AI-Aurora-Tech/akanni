import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided } from '@hello-pangea/dnd';
import { GitBranch, Search, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DraggableComponent = Draggable as any;
const DroppableComponent = Droppable as any;

export const PIPELINE_STAGES: { id: string; label: string; color: string }[] = [
  { id: 'pedido_fechado', label: 'Pedido Fechado', color: 'bg-zinc-500' },
  { id: 'arte_designer', label: 'Arte / Designer', color: 'bg-pink-500' },
  { id: 'impressao', label: 'Impressão', color: 'bg-blue-500' },
  { id: 'corte', label: 'Corte', color: 'bg-amber-500' },
  { id: 'bordado_dtf', label: 'Bordado / DTF', color: 'bg-purple-500' },
  { id: 'calandra', label: 'Calandra', color: 'bg-orange-500' },
  { id: 'costura', label: 'Costura', color: 'bg-cyan-500' },
  { id: 'acabamento', label: 'Acabamento', color: 'bg-indigo-500' },
  { id: 'expedicao', label: 'Expedição', color: 'bg-teal-500' },
  { id: 'entregue', label: 'Entregue', color: 'bg-emerald-500' },
];

interface PipelineOrder {
  id: string;
  customer_name: string;
  items: any[];
  delivery_date?: string;
  production_stage: string;
}

export const ProductionPipeline = () => {
  const [orders, setOrders] = useState<PipelineOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase.from('orders').select('id, customer_name, items, delivery_date, production_stage').order('created_at', { ascending: false });
      if (error) throw error;
      setOrders((data || []).map((o: any) => ({
        id: o.id,
        customer_name: o.customer_name || 'Sem nome',
        items: Array.isArray(o.items) ? o.items : [],
        delivery_date: o.delivery_date,
        production_stage: o.production_stage || 'pedido_fechado',
      })));
    } catch (err) {
      console.error('Error fetching pipeline orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const ch = supabase.channel('pipeline-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const move = async (orderId: string, stage: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, production_stage: stage } : o));
    try {
      const { error } = await supabase.from('orders').update({ production_stage: stage }).eq('id', orderId);
      if (error) throw error;
    } catch (err: any) {
      alert('Erro ao mover pedido: ' + err.message);
      fetchOrders();
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const stage = result.destination.droppableId;
    const order = orders.find(o => o.id === result.draggableId);
    if (order && order.production_stage !== stage) move(result.draggableId, stage);
  };

  const filtered = (stageId: string) => orders.filter(o =>
    o.production_stage === stageId &&
    (search.trim() === '' ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some((i: any) => (i.shirtType || '').toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2"><GitBranch size={24} /> Pipeline de Produção</h1>
        <p className="text-zinc-500 text-sm">Arraste cada pedido pela etapa em que ele está — todos da equipe veem em tempo real.</p>
      </div>

      <div className="flex bg-white rounded-xl border border-zinc-200 px-5 py-2.5 max-w-md shadow-sm">
        <Search className="text-zinc-400 mr-2" size={20} />
        <input type="text" placeholder="Buscar por cliente ou produto..." className="bg-transparent border-none focus:ring-0 w-full text-sm outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={18} className="animate-spin" /> Carregando...</div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex overflow-x-auto gap-4 pb-6 -mx-4 px-4">
            {PIPELINE_STAGES.map(stage => (
              <div key={stage.id} className="flex flex-col min-w-[240px] w-[240px] shrink-0">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-500">{stage.label}</h3>
                  </div>
                  <span className="bg-zinc-100 text-zinc-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{filtered(stage.id).length}</span>
                </div>
                <DroppableComponent droppableId={stage.id}>
                  {(provided: DroppableProvided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="bg-zinc-100/60 p-2.5 rounded-2xl space-y-2.5 min-h-[400px] border border-zinc-100">
                      {filtered(stage.id).map((order, index) => (
                        <DraggableComponent key={order.id} draggableId={order.id} index={index}>
                          {(prov: DraggableProvided) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                              className="bg-white rounded-xl border border-zinc-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
                              <p className="font-bold text-zinc-900 text-sm truncate">{order.customer_name}</p>
                              <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                                {order.items.slice(0, 2).map((i: any) => `${i.quantity || ''}x ${i.shirtType || 'item'}`).join(', ') || 'Sem itens'}
                                {order.items.length > 2 ? ` +${order.items.length - 2}` : ''}
                              </p>
                              {order.delivery_date && (
                                <p className="text-[10px] text-zinc-400 mt-1.5 flex items-center gap-1"><Calendar size={10} /> {format(new Date(order.delivery_date), 'dd/MM', { locale: ptBR })}</p>
                              )}
                            </div>
                          )}
                        </DraggableComponent>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </DroppableComponent>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  );
};
