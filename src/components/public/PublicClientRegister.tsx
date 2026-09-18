import React, { useState } from 'react';
import { Loader2, CheckCircle2, Copy, UserPlus } from 'lucide-react';

const PublicShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-zinc-50 flex flex-col items-center px-4 py-10">
    <div className="w-full max-w-lg">
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center text-white font-black">AK</div>
        <span className="text-xl font-black tracking-tight text-zinc-900">Akanni Confecções</span>
      </div>
      {children}
      <p className="text-center text-[11px] text-zinc-400 mt-8">Ambiente seguro · Akanni Confecções</p>
    </div>
  </div>
);

export const PublicClientRegister: React.FC = () => {
  const [form, setForm] = useState({ nome: '', telefone: '', documento: '', email: '', cidade: '', uf: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [orderLink, setOrderLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { setError('Informe seu nome.'); return; }
    setSaving(true);
    setError('');
    try {
      const resp = await fetch('/api/public/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.erro || 'Não foi possível concluir o cadastro.');
      const link = data.order_token ? `${window.location.origin}/#/pedido/${data.order_token}` : null;
      setOrderLink(link);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const copy = () => {
    if (!orderLink) return;
    try { navigator.clipboard.writeText(orderLink); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  const inputCls = "w-full px-4 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm";

  if (orderLink !== null) {
    return (
      <PublicShell>
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-8 text-center">
          <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-zinc-900">Cadastro concluído!</h1>
          <p className="text-zinc-500 text-sm mt-2 mb-6">Obrigado, <strong>{form.nome}</strong>. Seu cadastro foi recebido.</p>
          {orderLink && (
            <div className="bg-zinc-50 rounded-2xl p-4 text-left">
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Seu link pessoal para fazer pedidos</p>
              <div className="flex items-center gap-2">
                <input readOnly className="flex-1 px-3 h-11 bg-white border border-zinc-200 rounded-xl text-xs outline-none" value={orderLink} />
                <button onClick={copy} className="px-3 h-11 bg-zinc-900 text-white rounded-xl text-xs font-bold flex items-center gap-1">
                  <Copy size={14} /> {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 mt-2">Guarde este link — use sempre que quiser fazer um novo pedido.</p>
            </div>
          )}
          <a href={orderLink || '#'} className="inline-block mt-6 px-6 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors">Fazer um pedido agora</a>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-8">
        <div className="flex items-center gap-2 mb-1"><UserPlus size={20} className="text-zinc-900" /><h1 className="text-xl font-bold text-zinc-900">Cadastro de Cliente</h1></div>
        <p className="text-zinc-500 text-sm mb-6">Preencha seus dados para começar a fazer pedidos com a gente.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Nome completo / Empresa *</label>
            <input required className={inputCls} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Telefone / WhatsApp</label>
              <input type="tel" placeholder="(00) 00000-0000" className={inputCls} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">CPF / CNPJ</label>
              <input className={inputCls} value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">E-mail</label>
            <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Cidade</label>
              <input className={inputCls} value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">UF</label>
              <input maxLength={2} className={`${inputCls} uppercase text-center`} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} />
            </div>
          </div>
          {error && <p className="text-red-600 text-xs font-bold">{error}</p>}
          <button type="submit" disabled={saving} className="w-full py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />} Cadastrar
          </button>
        </form>
      </div>
    </PublicShell>
  );
};
