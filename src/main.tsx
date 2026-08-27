import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {isSupabaseConfigured} from './lib/supabase';
import './index.css';

// Se as variáveis do Supabase não vieram no build, mostra uma mensagem clara
// em vez de deixar o app quebrar (tela branca).
function ConfigError() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafafa', padding: 24, fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        maxWidth: 520, background: '#fff', border: '1px solid #eee', borderRadius: 24,
        padding: 40, boxShadow: '0 10px 40px rgba(0,0,0,0.06)', textAlign: 'center'
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚙️</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#18181b', margin: '0 0 8px' }}>
          Configuração incompleta
        </h1>
        <p style={{ color: '#71717a', lineHeight: 1.6, margin: '0 0 16px' }}>
          As variáveis do Supabase não foram encontradas no build. Configure no
          painel da Vercel e faça um novo deploy:
        </p>
        <pre style={{
          background: '#f4f4f5', borderRadius: 12, padding: 16, textAlign: 'left',
          fontSize: 13, color: '#3f3f46', overflowX: 'auto', margin: 0
        }}>{`VITE_SUPABASE_URL = sua URL do Supabase
VITE_SUPABASE_ANON_KEY = sua anon key`}</pre>
        <p style={{ color: '#a1a1aa', fontSize: 12, marginTop: 16 }}>
          Essas variáveis são do frontend e podem ser públicas (protegidas por RLS).
        </p>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isSupabaseConfigured ? <App /> : <ConfigError />}
  </StrictMode>,
);
