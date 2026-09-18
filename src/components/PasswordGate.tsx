import React, { useState } from 'react';
import { Lock, KeyRound } from 'lucide-react';

/**
 * Gate de senha por aparelho (mesmo comportamento do app de referência):
 * - A senha fica salva em localStorage (por navegador/aparelho).
 * - O desbloqueio vale só para a sessão atual (sessionStorage).
 * - Cada área tem seu próprio "id" e sua própria senha.
 *
 * Observação de segurança: é uma trava de conveniência no cliente, não uma
 * proteção criptográfica. Dados sensíveis de verdade continuam protegidos pelo
 * login do sistema e pelas permissões de papel (roles).
 */
interface PasswordGateProps {
  gateId: string;
  defaultPassword?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const PasswordGate: React.FC<PasswordGateProps> = ({ gateId, defaultPassword = 'akanni', title, description, children }) => {
  const storageKey = `akanni_gate_pw_${gateId}`;
  const sessionKey = `akanni_gate_open_${gateId}`;

  const getStoredPassword = () => {
    try { return localStorage.getItem(storageKey) || defaultPassword; } catch { return defaultPassword; }
  };

  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try { return sessionStorage.getItem(sessionKey) === '1'; } catch { return false; }
  });
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [changing, setChanging] = useState(false);
  const [newPass, setNewPass] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === getStoredPassword()) {
      setUnlocked(true);
      try { sessionStorage.setItem(sessionKey, '1'); } catch { /* ignore */ }
      setError('');
    } else {
      setError('Senha incorreta.');
    }
  };

  const changePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPass.trim()) return;
    try { localStorage.setItem(storageKey, newPass.trim()); } catch { /* ignore */ }
    setChanging(false);
    setNewPass('');
    alert('Senha atualizada neste aparelho.');
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
      {description && <p className="text-zinc-500 text-sm text-center mt-1 mb-6">{description}</p>}

      {!changing ? (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Senha de acesso</label>
            <input type="password" autoFocus className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={input} onChange={(e) => setInput(e.target.value)} />
          </div>
          {error && <p className="text-red-600 text-xs font-bold">{error}</p>}
          <button type="submit" className="w-full py-3.5 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors">Entrar</button>
          <button type="button" onClick={() => setChanging(true)} className="w-full text-[11px] font-bold text-zinc-400 hover:text-zinc-700 uppercase tracking-widest flex items-center justify-center gap-1"><KeyRound size={12} /> Trocar senha deste aparelho</button>
          <p className="text-[10px] text-zinc-400 text-center leading-relaxed">Senha padrão inicial: <span className="font-mono font-bold">{defaultPassword}</span> — troque no primeiro acesso.</p>
        </form>
      ) : (
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Nova senha</label>
            <input type="text" autoFocus className="w-full px-5 h-12 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
          </div>
          <button type="submit" className="w-full py-3.5 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors">Salvar nova senha</button>
          <button type="button" onClick={() => setChanging(false)} className="w-full text-[11px] font-bold text-zinc-400 hover:text-zinc-700 uppercase tracking-widest">Voltar</button>
        </form>
      )}
    </div>
  );
};
