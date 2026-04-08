import { supabase } from '@/src/lib/supabase';
import { UserProfile } from '@/src/types/database';
import { calculateBMR, calculateTDEE, calculateDailyTarget, ActivityLevel } from '@/src/utils/calories';

interface CreateProfileData {
  name: string;
  age: number;
  sex: 'male' | 'female';
  height_cm: number;
  current_weight_kg: number;
  target_weight_kg: number;
  target_date: string;
  activity_level: ActivityLevel;
}

export async function createProfile(userId: string, data: CreateProfileData) {
  const bmr = calculateBMR(data.sex, data.current_weight_kg, data.height_cm, data.age);
  const tdee = calculateTDEE(bmr, data.activity_level);
  const dailyTarget = calculateDailyTarget(
    tdee,
    data.current_weight_kg,
    data.target_weight_kg,
    new Date(data.target_date)
  );

  const { data: profile, error } = await supabase
    .from('users_profile')
    .insert({
      user_id: userId,
      ...data,
      tdee,
      daily_calorie_target: dailyTarget,
    })
    .select()
    .single();

  if (error) throw error;
  return profile as UserProfile;
}

export async function updateProfile(userId: string, data: Partial<CreateProfileData>) {
  const { data: current } = await supabase
    .from('users_profile')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!current) throw new Error('Profile not found');

  const merged = { ...current, ...data };
  const bmr = calculateBMR(merged.sex, merged.current_weight_kg, merged.height_cm, merged.age);
  const tdee = calculateTDEE(bmr, merged.activity_level as ActivityLevel);
  const dailyTarget = merged.target_date
    ? calculateDailyTarget(tdee, merged.current_weight_kg, merged.target_weight_kg, new Date(merged.target_date))
    : tdee;

  const { data: profile, error } = await supabase
    .from('users_profile')
    .update({
      ...data,
      tdee,
      daily_calorie_target: dailyTarget,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return profile as UserProfile;
}
