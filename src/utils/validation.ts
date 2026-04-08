import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  age: z.number().min(13, 'Edad minima 13').max(120, 'Edad maxima 120'),
  sex: z.enum(['male', 'female']),
  height_cm: z.number().min(100, 'Minimo 100 cm').max(250, 'Maximo 250 cm'),
  current_weight_kg: z.number().min(30, 'Minimo 30 kg').max(300, 'Maximo 300 kg'),
  target_weight_kg: z.number().min(30, 'Minimo 30 kg').max(300, 'Maximo 300 kg'),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
});

export const foodEntrySchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  calories: z.number().min(0, 'Minimo 0'),
  protein_g: z.number().min(0).optional(),
  carbs_g: z.number().min(0).optional(),
  fat_g: z.number().min(0).optional(),
  fiber_g: z.number().min(0).optional(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
});

export const weightEntrySchema = z.object({
  weight_kg: z.number().min(30, 'Minimo 30 kg').max(300, 'Maximo 300 kg'),
  notes: z.string().optional(),
});
