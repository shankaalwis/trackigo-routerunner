import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables');
}

// We use 'as string' to avoid type errors in case the variables are missing,
// but the app should have them configured in production.
export const supabase = createClient<Database>(
  supabaseUrl as string,
  supabaseAnonKey as string
);
