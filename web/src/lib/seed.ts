export type WeighIn = {
  dateISO: string
  kg: number
}

export type DailyNet = {
  day: 'Lun' | 'Mar' | 'Mie' | 'Jue' | 'Vie' | 'Sab' | 'Dom'
  netKcal: number | null
}

export type HomeSeed = {
  userName: string
  startKg: number
  goalKg: number
  debtTotalKcal: number
  cumulativeNet: number
  todayNet: number
  fromDateISO: string
  weighIns: WeighIn[]
  recentNets: DailyNet[]
}

export const demoSeed: HomeSeed = {
  userName: 'Invitado',
  startKg: 90,
  goalKg: 80,
  debtTotalKcal: 100000,
  cumulativeNet: -50000,
  todayNet: -400,
  fromDateISO: '2026-01-01',
  weighIns: [
    { dateISO: '2025-08-01', kg: 90 },
    { dateISO: '2025-09-15', kg: 89.2 },
    { dateISO: '2025-10-30', kg: 88.5 },
    { dateISO: '2025-12-15', kg: 87.7 },
    { dateISO: '2026-01-15', kg: 86.9 },
    { dateISO: '2026-02-15', kg: 86.1 },
  ],
  recentNets: [
    { day: 'Lun', netKcal: -800 },
    { day: 'Mar', netKcal: -650 },
    { day: 'Mie', netKcal: -400 },
    { day: 'Jue', netKcal: -550 },
    { day: 'Vie', netKcal: 250 },
    { day: 'Sab', netKcal: null },
    { day: 'Dom', netKcal: null },
  ],
}
