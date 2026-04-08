import { supabase } from '@/src/lib/supabase';
import { DailySummary } from '@/src/types/database';
import { calculateTheoreticalWeight } from '@/src/utils/calories';

export async function upsertDailySummary(
  userId: string,
  date: string,
  caloriesIn: number,
  caloriesOut: number,
  startWeightKg: number
) {
  const netBalance = caloriesIn - caloriesOut;

  // Get cumulative balance up to this date
  const { data: allSummaries } = await supabase
    .from('daily_summary')
    .select('net_balance, date')
    .eq('user_id', userId)
    .lt('date', date)
    .order('date', { ascending: true });

  const cumulativePrior = (allSummaries ?? []).reduce((sum, s) => sum + s.net_balance, 0);
  const cumulativeTotal = cumulativePrior + netBalance;
  const theoreticalWeight = calculateTheoreticalWeight(startWeightKg, cumulativeTotal);

  const { data, error } = await supabase
    .from('daily_summary')
    .upsert(
      {
        user_id: userId,
        date,
        calories_in: caloriesIn,
        calories_out: caloriesOut,
        net_balance: netBalance,
        theoretical_weight_kg: theoreticalWeight,
      },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as DailySummary;
}

export async function getDailySummaries(userId: string, fromDate: string, toDate: string) {
  const { data, error } = await supabase
    .from('daily_summary')
    .select('*')
    .eq('user_id', userId)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as DailySummary[];
}

export async function getCumulativeBalance(userId: string, toDate: string): Promise<number> {
  const { data } = await supabase
    .from('daily_summary')
    .select('net_balance')
    .eq('user_id', userId)
    .lte('date', toDate);

  return (data ?? []).reduce((sum, s) => sum + s.net_balance, 0);
}
