export interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  age: number;
  sex: 'male' | 'female';
  height_cm: number;
  current_weight_kg: number;
  target_weight_kg: number;
  target_date: string | null;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  tdee: number;
  daily_calorie_target: number;
  created_at: string;
  updated_at: string;
}

export interface FoodEntry {
  id: string;
  user_id: string;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  serving_size: string | null;
  photo_url: string | null;
  ai_estimated: boolean;
  notes: string | null;
  created_at: string;
}

export interface WeightEntry {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
  notes: string | null;
  created_at: string;
}

export interface DailySummary {
  id: string;
  user_id: string;
  date: string;
  calories_in: number;
  calories_out: number;
  net_balance: number;
  theoretical_weight_kg: number | null;
  created_at: string;
}
