/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("Iniciando Supabase com:", { 
  url: supabaseUrl ? `${supabaseUrl.substring(0, 10)}...` : "AUSENTE",
  key: supabaseAnonKey ? "PRESENTE" : "AUSENTE" 
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ ATENÇÃO: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados!");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
