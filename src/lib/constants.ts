export const COLORS = {
  primary: '#0D9488',
  primaryLight: '#5EEAD4',
  primaryDark: '#115E59',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#F0FDF4',
  surface: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  calorieIn: '#F59E0B',
  calorieOut: '#3B82F6',
  deficit: '#22C55E',
  surplus: '#EF4444',
};

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
} as const;

export const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentario (poco o nada de ejercicio)',
  light: 'Ligero (1-3 dias/semana)',
  moderate: 'Moderado (3-5 dias/semana)',
  active: 'Activo (6-7 dias/semana)',
  very_active: 'Muy activo (2x al dia)',
};

export const CALORIES_PER_KG = 7700;

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Comida',
  dinner: 'Cena',
  snack: 'Snack',
};

export const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};
