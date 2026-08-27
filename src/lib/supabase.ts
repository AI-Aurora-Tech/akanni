/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Injetados pelo vite.config.ts a partir de VITE_SUPABASE_URL ou SUPABASE_URL
// (funciona com ou sem o prefixo público VITE_).
declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || __SUPABASE_URL__;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || __SUPABASE_ANON_KEY__;

console.log("Iniciando Supabase com:", { 
  url: supabaseUrl ? `${supabaseUrl.substring(0, 10)}...` : "AUSENTE",
  key: supabaseAnonKey ? "PRESENTE" : "AUSENTE" 
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ ATENÇÃO: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados!");
}

// Indica se as variáveis do Supabase foram fornecidas no build do frontend.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// IMPORTANTE: usar placeholders quando faltar configuração. Chamar createClient
// com URL vazia LANÇA erro e derruba o app inteiro (tela branca). Com placeholder,
// o app carrega e mostra uma mensagem clara (ver main.tsx / banner de erro).
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
