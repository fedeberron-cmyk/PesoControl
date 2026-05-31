import { supabase } from './supabase'
import { demoSeed, type DailyNet, type HomeSeed, type WeighIn } from './seed'

type ProfileRow = {
  name: string | null
  start_weight_kg: number | null
  target_weight_kg: number | null
  debt_total_kcal: number | null
  baseline_net_kcal: number | null
  tdee: number | null
  age: number | null
  sex: 'male' | 'female' | null
  height_cm: number | null
  current_weight_kg: number | null
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null
  start_date: string | null
}

type WeightRow = {
  date: string | null
  weight_kg: number | null
}

type FoodRow = {
  date: string | null
  calories: number | null
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type FoodEntry = {
  id: string
  dateISO: string
  mealType: MealType
  name: string
  calories: number
  quantity: number | null
  unit: string | null
  aiEstimated: boolean
  photoUrl: string | null
  notes: string | null
  createdAt: string | null
}

type FoodEntryRow = FoodRow & {
  id: string
  meal_type: MealType | null
  name: string | null
  quantity: number | null
  unit: string | null
  ai_estimated: boolean | null
  photo_url: string | null
  notes: string | null
  created_at: string | null
}

export type UserProfile = {
  name: string
  startKg: number
  goalKg: number
  debtTotalKcal: number
  baselineNetKcal: number
  tdee: number
  age: number | null
  sex: 'male' | 'female' | null
  heightCm: number | null
  storedCurrentKg: number | null
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null
  startDateISO: string | null
}

export type AppModel = HomeSeed & {
  profile: UserProfile
  foodEntries: FoodEntry[]
}

const DAY_LABELS: DailyNet['day'][] = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

export async function loadHomeModel(userId: string): Promise<AppModel> {
  try {
    if (!userId) {
      throw new Error('Missing userId')
    }

    const [{ data: profile, error: profileError }, { data: weights, error: weightsError }, { data: foods, error: foodsError }] =
      await Promise.all([
        supabase
          .from('users_profile')
          .select(
            'name,start_weight_kg,target_weight_kg,debt_total_kcal,baseline_net_kcal,tdee,age,sex,height_cm,current_weight_kg,activity_level,start_date'
          )
          .eq('user_id', userId)
          .maybeSingle<ProfileRow>(),
        supabase
          .from('weight_entries')
          .select('date,weight_kg')
          .eq('user_id', userId)
          .order('date', { ascending: true })
          .returns<WeightRow[]>(),
        supabase
          .from('food_entries')
          .select(
            'id,date,meal_type,name,calories,quantity,unit,ai_estimated,photo_url,notes,created_at'
          )
          .eq('user_id', userId)
          .order('date', { ascending: true })
          .order('created_at', { ascending: true })
          .returns<FoodEntryRow[]>(),
      ])

    if (profileError) {
      throw profileError
    }
    if (weightsError) {
      throw weightsError
    }
    if (foodsError) {
      throw foodsError
    }
    if (!profile) {
      throw new Error('Missing Supabase rows for home model')
    }

    const startKg = requiredNumber(profile.start_weight_kg, 'users_profile.start_weight_kg')
    const goalKg = requiredNumber(profile.target_weight_kg, 'users_profile.target_weight_kg')
    const debtTotalKcal = requiredNumber(profile.debt_total_kcal, 'users_profile.debt_total_kcal')
    const baselineNetKcal = profile.baseline_net_kcal ?? 0
    const tdee = requiredNumber(profile.tdee, 'users_profile.tdee')

    const weighIns = (weights ?? []).map(toWeighIn).sort((a, b) => a.dateISO.localeCompare(b.dateISO))
    const foodEntries = (foods ?? []).map(toFoodEntry)
    const intakeByDate = groupIntakeByDate(foodEntries)
    const dailyNets = [...intakeByDate.entries()].map(([dateISO, intake]) => ({
      dateISO,
      netKcal: intake - tdee,
    }))
    const cumulativeNet = baselineNetKcal + dailyNets.reduce((sum, day) => sum + day.netKcal, 0)
    const fromDateISO = todayUTC()
    const todayIntake = intakeByDate.get(fromDateISO) ?? 0
    const hasFoodToday = intakeByDate.has(fromDateISO)

    const userName = profile.name?.trim() || demoSeed.userName
    const profileModel: UserProfile = {
      name: userName,
      startKg,
      goalKg,
      debtTotalKcal,
      baselineNetKcal,
      tdee,
      age: profile.age ?? null,
      sex: profile.sex ?? null,
      heightCm: profile.height_cm ?? null,
      storedCurrentKg: profile.current_weight_kg ?? null,
      activityLevel: profile.activity_level ?? null,
      startDateISO: profile.start_date,
    }

    return {
      userName,
      startKg,
      goalKg,
      debtTotalKcal,
      cumulativeNet,
      todayNet: hasFoodToday ? todayIntake - tdee : 0,
      fromDateISO,
      weighIns,
      recentNets: recentNets(intakeByDate, tdee, fromDateISO),
      profile: profileModel,
      foodEntries: foodEntries.sort(compareFoodEntriesDesc),
    }
  } catch (error) {
    console.warn('Falling back to demoSeed home model', error)
    return demoAppModel()
  }
}

function toWeighIn(row: WeightRow): WeighIn {
  return {
    dateISO: requiredDate(row.date, 'weight_entries.date'),
    kg: requiredNumber(row.weight_kg, 'weight_entries.weight_kg'),
  }
}

function toFoodEntry(row: FoodEntryRow): FoodEntry {
  return {
    id: row.id,
    dateISO: requiredDate(row.date, 'food_entries.date'),
    mealType: row.meal_type ?? 'snack',
    name: row.name?.trim() || 'Comida',
    calories: requiredNumber(row.calories, 'food_entries.calories'),
    quantity: row.quantity,
    unit: row.unit,
    aiEstimated: row.ai_estimated ?? false,
    photoUrl: row.photo_url,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

function groupIntakeByDate(rows: FoodEntry[]): Map<string, number> {
  const intakeByDate = new Map<string, number>()

  for (const row of rows) {
    intakeByDate.set(row.dateISO, (intakeByDate.get(row.dateISO) ?? 0) + row.calories)
  }

  return intakeByDate
}

function recentNets(
  intakeByDate: Map<string, number>,
  tdee: number,
  todayISO: string
): DailyNet[] {
  const today = new Date(`${todayISO}T00:00:00.000Z`)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setUTCDate(today.getUTCDate() - (6 - index))
    const dateISO = date.toISOString().slice(0, 10)
    const intake = intakeByDate.get(dateISO)

    return {
      day: DAY_LABELS[date.getUTCDay()],
      netKcal: intake === undefined ? null : intake - tdee,
    }
  })
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

function requiredDate(value: string | null, fieldName: string): string {
  if (!value || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) {
    throw new Error(`Missing ${fieldName}`)
  }
  return value
}

function requiredNumber(value: number | null, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Missing ${fieldName}`)
  }
  return value
}

function compareFoodEntriesDesc(a: FoodEntry, b: FoodEntry): number {
  const dateCompare = b.dateISO.localeCompare(a.dateISO)
  if (dateCompare !== 0) {
    return dateCompare
  }
  return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
}

function demoAppModel(): AppModel {
  const foodEntries: FoodEntry[] = [
    {
      id: 'demo-1',
      dateISO: demoSeed.fromDateISO,
      mealType: 'breakfast',
      name: 'Huevos con tortilla',
      calories: 420,
      quantity: 1,
      unit: 'porcion',
      aiEstimated: false,
      photoUrl: null,
      notes: null,
      createdAt: `${demoSeed.fromDateISO}T14:00:00.000Z`,
    },
    {
      id: 'demo-2',
      dateISO: demoSeed.fromDateISO,
      mealType: 'lunch',
      name: 'Pechuga de pollo con arroz',
      calories: 680,
      quantity: 1,
      unit: 'porcion',
      aiEstimated: true,
      photoUrl: null,
      notes: null,
      createdAt: `${demoSeed.fromDateISO}T20:00:00.000Z`,
    },
  ]

  return {
    ...demoSeed,
    profile: {
      name: demoSeed.userName,
      startKg: demoSeed.startKg,
      goalKg: demoSeed.goalKg,
      debtTotalKcal: demoSeed.debtTotalKcal,
      baselineNetKcal: 0,
      tdee: 2200,
      age: null,
      sex: null,
      heightCm: null,
      storedCurrentKg: null,
      activityLevel: null,
      startDateISO: null,
    },
    foodEntries,
  }
}
