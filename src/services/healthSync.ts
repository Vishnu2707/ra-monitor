import { supabase, type AppleHealthDaily } from '../lib/supabase';
import { readLast7DaysHealthData } from './healthkit';

export type HealthSyncSummary = {
  synced: number;
  from: string | null;
  to: string | null;
};

export async function syncLast7Days(userId: string): Promise<HealthSyncSummary> {
  const days = await readLast7DaysHealthData();
  const rows: AppleHealthDaily[] = days.map((day) => ({
    user_id: userId,
    ...day,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('apple_health_daily')
    .upsert(rows, { onConflict: 'user_id,date' });

  if (error) {
    throw error;
  }

  return {
    synced: rows.length,
    from: rows[0]?.date ?? null,
    to: rows[rows.length - 1]?.date ?? null,
  };
}
