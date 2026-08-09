import { OrderStatus } from "./types";

export const STATUS_CONFIG: Record<OrderStatus, { label: string; maxDays: number; color: string }> = {
  pending: { label: 'Pendentes', maxDays: 2, color: 'bg-zinc-500' },
  cutting: { label: 'Corte', maxDays: 1, color: 'bg-blue-500' },
  sewing: { label: 'Costura', maxDays: 5, color: 'bg-amber-500' },
  finishing: { label: 'Acabamento', maxDays: 2, color: 'bg-purple-500' },
  delivered: { label: 'Despachado', maxDays: 999, color: 'bg-emerald-500' },
};
