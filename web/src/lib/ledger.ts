export const CALORIES_PER_KG = 7700;

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS;
export type Sex = 'male' | 'female';

export function calculateBMR(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number
): number {
  if (sex === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

export function cumulativeBalance(nets: number[]): number {
  return nets.reduce((sum, net) => sum + net, 0);
}

export function theoreticalWeight(startKg: number, cumulativeNet: number): number {
  return roundToTenth(startKg + cumulativeNet / CALORIES_PER_KG);
}

// Fallback debt total when the user has NOT set one explicitly.
// The authoritative debt is the user's stored debt_total_kcal (e.g. Federico's
// 127,500, which implies ~7,969 kcal/kg, not 7,700). This formula is only a
// suggested default for new users — never override a stored value with it.
export function defaultDebtTotalKcal(startKg: number, goalKg: number): number {
  return Math.round((startKg - goalKg) * CALORIES_PER_KG);
}

export function debtProgress({
  cumulativeNet,
  debtTotalKcal,
}: {
  cumulativeNet: number;
  debtTotalKcal: number;
}): {
  debtTotalKcal: number;
  paidKcal: number;
  paidKg: number;
  remainingKcal: number;
  remainingKg: number;
  pct: number;
} {
  const payableDebtKcal = Math.max(0, debtTotalKcal);
  const paidKcal = clamp(-cumulativeNet, 0, payableDebtKcal);
  const remainingKcal = Math.max(0, payableDebtKcal - paidKcal);

  return {
    debtTotalKcal,
    paidKcal,
    paidKg: roundToTenth(paidKcal / CALORIES_PER_KG),
    remainingKcal,
    remainingKg: roundToTenth(remainingKcal / CALORIES_PER_KG),
    pct: payableDebtKcal > 0 ? paidKcal / payableDebtKcal : 0,
  };
}

export function recalibrateTDEE(
  currentTDEE: number,
  theoreticalChangeKg: number,
  actualChangeKg: number,
  days: number
): number {
  if (days <= 0) {
    return currentTDEE;
  }

  const diffKg = theoreticalChangeKg - actualChangeKg;
  const dailyCalorieAdjustment = (diffKg * CALORIES_PER_KG) / days;
  return Math.round(currentTDEE + dailyCalorieAdjustment);
}

export function paceFromNets(nets: number[]): number {
  if (nets.length === 0) {
    return 0;
  }
  return cumulativeBalance(nets) / nets.length;
}

export function projectGoalDate({
  remainingKcal,
  paceKcalPerDay,
  fromDateISO,
}: {
  remainingKcal: number;
  paceKcalPerDay: number;
  fromDateISO: string;
}): { reachable: false } | { reachable: true; days: number; dateISO: string } {
  if (paceKcalPerDay >= 0) {
    return { reachable: false };
  }

  const days = Math.ceil(remainingKcal / -paceKcalPerDay);
  const date = new Date(`${fromDateISO}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return {
    reachable: true,
    days,
    dateISO: date.toISOString().slice(0, 10),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundToTenth(value: number): number {
  return Number(value.toFixed(1));
}
