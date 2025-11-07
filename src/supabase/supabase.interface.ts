import type { SupabaseClientOptions } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  key: string;
  options?: SupabaseClientOptions<any>;
}
