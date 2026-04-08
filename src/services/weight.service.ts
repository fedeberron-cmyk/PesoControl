import { supabase } from '@/src/lib/supabase';
import { WeightEntry } from '@/src/types/database';

export async function addWeightEntry(userId: string, weightKg: number, date: string, notes?: string) {
  const { data, error } = await supabase
    .from('weight_entries')
    .upsert(
      { user_id: userId, date, weight_kg: weightKg, notes },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as WeightEntry;
}

export async function getWeightEntries(userId: string, fromDate: string, toDate: string) {
  const { data, error } = await supabase
    .from('weight_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as WeightEntry[];
}

export async function getLatestWeight(userId: string) {
  const { data, error } = await supabase
    .from('weight_entries')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as WeightEntry | null;
}
