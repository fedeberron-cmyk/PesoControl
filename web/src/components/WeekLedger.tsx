import { cumulativeBalance } from '../lib/ledger'
import type { DailyNet } from '../lib/seed'

type WeekLedgerProps = {
  recentNets: DailyNet[]
}

export function WeekLedger({ recentNets }: WeekLedgerProps) {
  const loggedNets = recentNets.flatMap((day) => (day.netKcal === null ? [] : [day.netKcal]))
  const weekTotal = cumulativeBalance(loggedNets)

  return (
    <section class="card ledger">
      <h3>
        Esta semana · <span class="tnum">{formatSignedKcal(weekTotal)} kcal</span>
      </h3>
      <div class="week" aria-label="Saldo diario de esta semana">
        {recentNets.map((day) => (
          <div class="d" key={day.day}>
            <div class="dn">{day.day.slice(0, 1)}</div>
            <div class="barv">
              <i
                class={day.netKcal !== null && day.netKcal > 0 ? 'sur' : undefined}
                style={{
                  height: `${barHeight(day.netKcal)}px`,
                  opacity: day.netKcal === null ? '.3' : undefined,
                }}
              />
            </div>
            <div class={`v ${valueClass(day.netKcal)} tnum`}>{formatDayValue(day.netKcal)}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function barHeight(value: number | null) {
  if (value === null) {
    return 3
  }
  return Math.max(8, Math.round((Math.abs(value) / 1000) * 26))
}

function valueClass(value: number | null) {
  if (value === null || value === 0) {
    return 'zero'
  }
  return value > 0 ? 'sur' : 'def'
}

function formatDayValue(value: number | null) {
  if (value === null) {
    return '—'
  }
  if (Math.abs(value) >= 1000) {
    return `${value < 0 ? '−' : '+'}${(Math.abs(value) / 1000).toFixed(1)}k`
  }
  return `${value < 0 ? '−' : '+'}${Math.abs(value)}`
}

function formatSignedKcal(value: number) {
  const abs = new Intl.NumberFormat('en-US').format(Math.abs(value))
  if (value < 0) {
    return `−${abs}`
  }
  if (value > 0) {
    return `+${abs}`
  }
  return '0'
}
