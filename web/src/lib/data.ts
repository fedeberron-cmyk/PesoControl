import { supabase } from './supabase'
import { federicoSeed, type DailyNet, type HomeSeed, type WeighIn } from './seed'

type ProfileRow = {
  name: string | null
  start_weight_kg: number | null
  target_weight_kg: number | null
  debt_total_kcal: number | null
  tdee: number | null
}

type WeightRow = {
  date: string | null
  weight_kg: number | null
}

type FoodRow = {
  date: string | null
  calories: number | null
}

const DAY_LABELS: DailyNet['day'][] = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

export async function loadHomeModel(userId: string): Promise<HomeSeed> {
  try {
    if (!userId) {
      throw new Error('Missing userId')
    }

    const [{ data: profile, error: profileError }, { data: weights, error: weightsError }, { data: foods, error: foodsError }] =
      await Promise.all([
        supabase
          .from('users_profile')
          .select('name,start_weight_kg,target_weight_kg,debt_total_kcal,tdee')
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
          .select('date,calories')
          .eq('user_id', userId)
          .order('date', { ascending: true })
          .returns<FoodRow[]>(),
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
    if (!profile || !weights?.length || !foods?.length) {
      throw new Error('Missing Supabase rows for home model')
    }

    const startKg = requiredNumber(profile.start_weight_kg, 'users_profile.start_weight_kg')
    const goalKg = requiredNumber(profile.target_weight_kg, 'users_profile.target_weight_kg')
    const debtTotalKcal = requiredNumber(profile.debt_total_kcal, 'users_profile.debt_total_kcal')
    const tdee = requiredNumber(profile.tdee, 'users_profile.tdee')

    const weighIns = weights.map(toWeighIn).sort((a, b) => a.dateISO.localeCompare(b.dateISO))
    const intakeByDate = groupIntakeByDate(foods)
    const dailyNets = [...intakeByDate.entries()].map(([dateISO, intake]) => ({
      dateISO,
      netKcal: intake - tdee,
    }))
    const cumulativeNet = dailyNets.reduce((sum, day) => sum + day.netKcal, 0)
    const fromDateISO = todayUTC()
    const todayIntake = intakeByDate.get(fromDateISO) ?? 0

    return {
      userName: profile.name?.trim() || federicoSeed.userName,
      startKg,
      goalKg,
      debtTotalKcal,
      cumulativeNet,
      todayNet: todayIntake - tdee,
      fromDateISO,
      weighIns,
      recentNets: recentNets(intakeByDate, tdee, fromDateISO),
    }
  } catch (error) {
    console.warn('Falling back to federicoSeed home model', error)
    return federicoSeed
  }
}

function toWeighIn(row: WeightRow): WeighIn {
  return {
    dateISO: requiredDate(row.date, 'weight_entries.date'),
    kg: requiredNumber(row.weight_kg, 'weight_entries.weight_kg'),
  }
}

function groupIntakeByDate(rows: FoodRow[]): Map<string, number> {
  const intakeByDate = new Map<string, number>()

  for (const row of rows) {
    const dateISO = requiredDate(row.date, 'food_entries.date')
    const calories = requiredNumber(row.calories, 'food_entries.calories')
    intakeByDate.set(dateISO, (intakeByDate.get(dateISO) ?? 0) + calories)
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
