import React, { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Trava de senha por área (Despesas Fixas, Relatórios Financeiros).
 * A senha exigida é a MESMA senha de login do usuário logado (validada contra
 * a tabela `users`). O desbloqueio vale só para a sessão atual (sessionStorage)
 * e para o aparelho atual — recarregar ou trocar de aparelho pede a senha de novo.
 */
interface PasswordGateProps {
  gateId: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const PasswordGate: React.FC<PasswordGateProps> = ({ gateId, title, description, children }) => {
  const { verifyPassword, profile } = useAuth();
  const sessionKey = `akanni_gate_open_${gateId}`;

  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try { return sessionStorage.getItem(sessionKey) === '1'; } catch { return false; }
  });
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError('');
    const ok = await verifyPassword(input);
    setChecking(false);
    if (ok) {
      setUnlocked(true);
      setInput('');
      try { sessionStorage.setItem(sessionKey, '1'); } catch { /* ignore */ }
    } else {
      setError('Senha incorreta. Use a mesma senha do seu login.');
    }
  };

  if (unlocked) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            onClick={() => { setUnlocked(false); try { sessionStorage.removeItem(sessionKey); } catch { /* ignore */ } }}
            className="text-[11px] font-bold text-zinc-400 hover:text-zinc-700 uppercase tracking-widest flex items-center gap-1"
          >
            <Lock size={12} /> Bloquear área
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 bg-white rounded-3xl border border-zinc-200 shadow-sm p-8">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-5"><Lock size={26} /></div>
      <h2 className="text-xl font-bold text-zinc-900 text-center">{title}</h2>
      {description && <p className="text-zinc-500 text-sm text-center mt-1 mb-2">{description}</p>}
      <p className="text-zinc-400 text-xs text-center mb-6">Digite a <strong>mesma senha do seu login</strong>{profile?.displayName ? ` (${profile.displayName})` : ''}.</p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Sua senha de login</label>
          <input type="password" autoFocus className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={input} onChange={(e) => setInput(e.target.value)} />
        </div>
        {error && <p className="text-red-600 text-xs font-bold">{error}</p>}
        <button type="submit" disabled={checking} className="w-full py-3.5 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
          {checking ? <Loader2 size={16} className="animate-spin" /> : null} Entrar
        </button>
      </form>
    </div>
  );
};
