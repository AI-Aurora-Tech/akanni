import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, Loader2, Youtube, Clapperboard, Lightbulb } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Video {
  id: string;
  title: string;
  duration?: string;
  youtube_url?: string;
}

const ANALOGIES = [
  { t: 'Zíper ruim é como um sapato apertado', d: 'No começo até dá pra usar, mas incomoda cada vez mais — e a pessoa lembra bem de quem vendeu pra ela. Detalhe pequeno, impacto grande na percepção de qualidade.' },
  { t: 'Prazo é promessa', d: 'Entregar no combinado vale mais que entregar bonito atrasado. Cliente perdoa acabamento, mas não esquece atraso.' },
  { t: 'Cliente satisfeito é vendedor de graça', d: 'Quem sai feliz indica sem você pedir. Investir no pós-venda é investir no próximo pedido.' },
  { t: 'Cada retrabalho come o lucro', d: 'A peça que volta paga duas vezes de mão de obra. Acertar de primeira é a margem escondida do mês.' },
];

const youtubeId = (url?: string) => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
  return m ? m[1] : null;
};

export const Marketing = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', duration: '', youtube_url: '' });
  const [saving, setSaving] = useState(false);

  const analogy = ANALOGIES[new Date().getDate() % ANALOGIES.length];

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('training_videos').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setVideos((data || []) as Video[]);
    } catch (err) {
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVideos(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('training_videos').insert({ title: form.title, duration: form.duration || null, youtube_url: form.youtube_url || null });
      if (error) throw error;
      setForm({ title: '', duration: '', youtube_url: '' });
      fetchVideos();
    } catch (err: any) {
      alert('Erro ao adicionar vídeo: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este vídeo?')) return;
    await supabase.from('training_videos').delete().eq('id', id);
    fetchVideos();
  };

  const featured = videos[0];
  const fid = youtubeId(featured?.youtube_url);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 text-white shadow-lg" style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)' }}>
        <h1 className="text-2xl font-black flex items-center gap-2"><Megaphone size={26} /> Marketing, Ações & Treinamentos</h1>
        <p className="text-white/80 text-sm mt-1">Conteúdo de apoio para a equipe — analogias, vídeos e ideias de ação.</p>
      </div>

      {/* Analogia da semana */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-5">
        <h3 className="text-[11px] font-black text-purple-700 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Lightbulb size={14} /> Analogia da semana</h3>
        <p className="font-bold text-zinc-900">{analogy.t}</p>
        <p className="text-sm text-zinc-600 mt-1">{analogy.d}</p>
      </div>

      {/* Vídeo do dia */}
      {featured && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
          <h3 className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Clapperboard size={14} /> Vídeo em destaque</h3>
          {fid ? (
            <div className="aspect-video w-full max-w-2xl rounded-xl overflow-hidden bg-black">
              <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${fid}`} title={featured.title} allowFullScreen />
            </div>
          ) : (
            <a href={featured.youtube_url} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm">{featured.title}</a>
          )}
          <p className="font-bold text-zinc-900 mt-2">{featured.title} {featured.duration && <span className="text-xs text-zinc-400 font-medium">· {featured.duration}</span>}</p>
        </div>
      )}

      {/* Gerenciar vídeos */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
        <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-4">Gerenciar vídeos cadastrados</h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <input required type="text" placeholder="Título (ex: Como lidar com objeção de preço)" className="md:col-span-1 px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input type="text" placeholder="Duração (ex: 7 min)" className="px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-sm" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
          <div className="flex gap-2">
            <input type="url" placeholder="Link do YouTube" className="flex-1 px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-sm" value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} />
            <button type="submit" disabled={saving} className="px-4 h-11 bg-zinc-900 text-white rounded-xl font-bold text-sm flex items-center gap-1 disabled:opacity-50">{saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}</button>
          </div>
        </form>

        {loading ? (
          <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={18} className="animate-spin" /> Carregando...</div>
        ) : videos.length === 0 ? (
          <p className="text-sm text-zinc-400 italic">Nenhum vídeo cadastrado ainda.</p>
        ) : (
          <div className="space-y-2">
            {videos.map(v => (
              <div key={v.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <Youtube size={18} className="text-red-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 text-sm truncate">{v.title}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{v.duration || ''} {v.youtube_url ? `· ${v.youtube_url}` : ''}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(v.id)} className="p-1.5 bg-white rounded-lg text-red-400 hover:text-red-600 shrink-0"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
