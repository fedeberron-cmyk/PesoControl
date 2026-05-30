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

export const federicoSeed: HomeSeed = {
  userName: 'Fede',
  startKg: 101,
  goalKg: 85,
  debtTotalKcal: 127500,
  cumulativeNet: -75616,
  todayNet: -600,
  fromDateISO: '2026-05-29',
  weighIns: [
    { dateISO: '2025-07-01', kg: 101 },
    { dateISO: '2025-09-05', kg: 98.4 },
    { dateISO: '2025-11-14', kg: 96.4 },
    { dateISO: '2026-01-09', kg: 94.9 },
    { dateISO: '2026-03-06', kg: 93.1 },
    { dateISO: '2026-04-17', kg: 92.6 },
    { dateISO: '2026-05-29', kg: 91.2 },
  ],
  recentNets: [
    { day: 'Lun', netKcal: -1000 },
    { day: 'Mar', netKcal: -1000 },
    { day: 'Mie', netKcal: -400 },
    { day: 'Jue', netKcal: -600 },
    { day: 'Vie', netKcal: 300 },
    { day: 'Sab', netKcal: null },
    { day: 'Dom', netKcal: null },
  ],
}
