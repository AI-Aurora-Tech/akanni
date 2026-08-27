import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');

  // Aceita a URL/chave do Supabase com OU sem o prefixo VITE_. O build roda em
  // Node, então lê tanto process.env (variáveis injetadas pela Vercel) quanto os
  // arquivos .env locais. Assim o frontend funciona mesmo que só exista
  // SUPABASE_URL (sem o prefixo público VITE_).
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (process.env[k]) return process.env[k] as string;
      if (env[k]) return env[k];
    }
    return '';
  };
  const supabaseUrl = pick('VITE_SUPABASE_URL', 'SUPABASE_URL');
  const supabaseAnonKey = pick('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      __SUPABASE_URL__: JSON.stringify(supabaseUrl),
      __SUPABASE_ANON_KEY__: JSON.stringify(supabaseAnonKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
