import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Diagnóstico detallado
console.log('--- SUPABASE DIAGNOSTIC ---');
console.log('URL:', supabaseUrl ? `'${supabaseUrl}'` : 'UNDEFINED');
console.log('KEY:', supabaseAnonKey ? 'DEFINED (Masked)' : 'UNDEFINED');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Faltan variables de entorno para Supabase.');
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('--- SUPABASE CLIENT INITIALIZED ---');
