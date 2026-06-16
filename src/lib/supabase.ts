import { createClient } from '@supabase/supabase-js';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env || {};

const supabaseUrl =
	env.VITE_SUPABASE_URL ||
	env.NEXT_PUBLIC_SUPABASE_URL ||
	'';
const supabaseAnonKey =
	env.VITE_SUPABASE_ANON_KEY ||
	env.VITE_SUPABASE_PUBLISHABLE_KEY ||
	env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
	env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
	'';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
