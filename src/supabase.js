import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(
  'https://qxblxomcpepwavgvhtuk.supabase.co',
  'sb_publishable_mqNXt8rW96jH8JvCm24piA_SyAktT_m',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
