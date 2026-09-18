import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Save, Loader2, Building2, Palette } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Profile {
  company_name: string;
  cnpj: string;
  phone: string;
  address: string;
  pix_favored: string;
  pix_key: string;
  bank: string;
}

const EMPTY: Profile = { company_name: 'Akanni', cnpj: '', phone: '', address: '', pix_favored: '', pix_key: '', bank: '' };

export const AppSettings = () => {
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [accent, setAccent] = useState('#a16207');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await supabase.from('app_settings').select('*').in('key', ['profile', 'appearance']);
      (data || []).forEach((row: any) => {
        if (row.key === 'profile' && row.value) setProfile({ ...EMPTY, ...row.value });
        if (row.key === 'appearance' && row.value?.accent) setAccent(row.value.accent);
      });
    } catch (err) {
      console.error('Error loading app settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('app_settings').upsert({ key: 'profile', value: profile, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      alert('Perfil do app salvo.');
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveAppearance = async () => {
    try {
      const { error } = await supabase.from('app_settings').upsert({ key: 'appearance', value: { accent }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      try { localStorage.setItem('akanni_accent', accent); } catch { /* ignore */ }
      document.documentElement.style.setProperty('--akanni-accent', accent);
      alert('Cor de destaque salva neste aparelho.');
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const field = (label: string, key: keyof Profile, placeholder = '') => (
    <div>
      <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">{label}</label>
      <input type="text" placeholder={placeholder} className="w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm" value={profile[key]} onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2"><SlidersHorizontal size={24} /> Ajustes do Sistema</h1>
        <p className="text-zinc-500 text-sm">Dados da empresa e aparência — valem para toda a equipe, sem mexer em código.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={18} className="animate-spin" /> Carregando...</div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
            <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-4 flex items-center gap-1.5"><Building2 size={14} /> Perfil do App</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field('Nome da empresa', 'company_name')}
              {field('CNPJ', 'cnpj', '00.000.000/0000-00')}
              {field('Telefone / WhatsApp', 'phone', '(00) 00000-0000')}
              {field('Endereço', 'address', 'Endereço da fábrica')}
              {field('Favorecido (PIX)', 'pix_favored', 'Ex: Akanni LTDA')}
              {field('Chave PIX', 'pix_key', 'CNPJ, e-mail, telefone...')}
              {field('Banco', 'bank', 'Ex: Itaú, Nubank...')}
            </div>
            <button onClick={saveProfile} disabled={saving} className="mt-5 px-5 h-11 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar perfil do app
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
            <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-4 flex items-center gap-1.5"><Palette size={14} /> Aparência</h3>
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Cor de destaque</label>
                <input type="color" className="w-24 h-11 rounded-xl border border-zinc-200 cursor-pointer bg-white" value={accent} onChange={(e) => setAccent(e.target.value)} />
              </div>
              <div className="pt-6">
                <button onClick={saveAppearance} className="px-5 h-11 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors flex items-center gap-2"><Save size={16} /> Aplicar cor</button>
              </div>
              <div className="pt-6">
                <div className="px-4 h-11 rounded-xl flex items-center text-white font-bold text-sm" style={{ backgroundColor: accent }}>Prévia</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
