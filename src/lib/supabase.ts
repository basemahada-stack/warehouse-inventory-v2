/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const hasSupabaseConfig = Boolean(
  (import.meta as any).env.VITE_SUPABASE_URL && 
  (import.meta as any).env.VITE_SUPABASE_ANON_KEY
);

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
