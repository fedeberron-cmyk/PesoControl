import { supabase } from '@/src/lib/supabase';
import { FoodEntry } from '@/src/types/database';

interface AddFoodEntryData {
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  serving_size?: string;
  photo_url?: string;
  ai_estimated?: boolean;
  notes?: string;
}

export async function addFoodEntry(userId: string, data: AddFoodEntryData) {
  const { data: entry, error } = await supabase
    .from('food_entries')
    .insert({ user_id: userId, ...data })
    .select()
    .single();

  if (error) throw error;
  return entry as FoodEntry;
}

export async function getFoodEntriesByDate(userId: string, date: string) {
  const { data, error } = await supabase
    .from('food_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as FoodEntry[];
}

export async function deleteFoodEntry(id: string) {
  const { error } = await supabase.from('food_entries').delete().eq('id', id);
  if (error) throw error;
}

export async function getRecentFoods(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('food_entries')
    .select('name, calories, protein_g, carbs_g, fat_g, fiber_g, meal_type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const seen = new Set<string>();
  return (data ?? []).filter((item) => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });
}
