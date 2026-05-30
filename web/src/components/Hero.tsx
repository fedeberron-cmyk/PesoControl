import type { debtProgress, projectGoalDate } from '../lib/ledger'
import type { WeighIn } from '../lib/seed'

type DebtProgress = ReturnType<typeof debtProgress>
type GoalProjection = ReturnType<typeof projectGoalDate>

type HeroProps = {
  startKg: number
  goalKg: number
  currentKg: number
  weighIns: WeighIn[]
  progress: DebtProgress
  projection: GoalProjection
}

// Chart geometry, in viewBox units. One consistent scale for both the real
// trajectory and the goal — so the descent reads proportionally.
const VB_W = 320
const VB_H = 150
const X_START = 20
const X_TODAY = 196
const X_GOAL = 262
const Y_TOP = 24
const Y_BOT = 120
const BASELINE = 136

export function Hero({ startKg, goalKg, currentKg, weighIns, progress }: HeroProps) {
  const progressPct = Math.round(progress.pct * 100)

  const kgs = weighIns.map((w) => w.kg)
  const maxKg = Math.max(startKg, ...kgs)
  const minKg = Math.min(goalKg, ...kgs)
  const range = maxKg - minKg || 1
  const yFor = (kg: number) => round(Y_TOP + ((maxKg - kg) / range) * (Y_BOT - Y_TOP))
  const xFor = (i: number) =>
    weighIns.length <= 1
      ? X_START
      : round(X_START + (i / (weighIns.length - 1)) * (X_TODAY - X_START))

  const pts = weighIns.map((w, i) => ({ x: xFor(i), y: yFor(w.kg) }))
  const first = pts[0] ?? { x: X_START, y: yFor(startKg) }
  const today = pts.at(-1) ?? { x: X_TODAY, y: yFor(currentKg) }
  const goal = { x: X_GOAL, y: yFor(goalKg) }
  const line = pts.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `M${first.x},${first.y} ${pts
    .slice(1)
    .map((p) => `L${p.x},${p.y}`)
    .join(' ')} L${today.x},${BASELINE} L${first.x},${BASELINE} Z`

  return (
    <section class="card hero-card" aria-labelledby="home-hero-title">
      <div class="kick">A tu ritmo</div>
      <h2 id="home-hero-title" class="serif">
        Vas a llegar.
      </h2>

      <div class="chartwrap">
        <svg
          class="chart"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          role="img"
          aria-label="Tu trayectoria de peso hacia la meta"
        >
          <path d={area} fill="var(--accent-soft)" />
          <polyline
            points={line}
            fill="none"
            stroke="var(--accent)"
            stroke-width="2.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <polyline
            points={`${today.x},${today.y} ${goal.x},${goal.y}`}
            fill="none"
            stroke="var(--accent)"
            stroke-width="2.2"
            stroke-dasharray="2 6"
            stroke-linecap="round"
            opacity=".55"
          />
          <circle
            cx={today.x}
            cy={today.y}
            r="4.5"
            fill="var(--accent)"
            stroke="var(--surface)"
            stroke-width="2.5"
          />
          <circle cx={goal.x} cy={goal.y} r="3.5" fill="none" stroke="var(--accent)" stroke-width="2" />

          <text x={first.x} y={first.y - 9} class="c-lbl" fill="var(--muted)">
            {formatKg(startKg)}
          </text>
          <text x={today.x} y={today.y - 12} text-anchor="middle" class="c-lbl" fill="var(--muted)">
            hoy {formatKg(currentKg)}
          </text>
          <text x={goal.x + 10} y={goal.y - 3} class="c-lbl" fill="var(--muted)">
            meta
          </text>
          <text x={goal.x + 10} y={goal.y + 13} class="c-goal" fill="var(--ink)">
            {formatKg(goalKg)}
          </text>
        </svg>
      </div>

      <div class="progress">
        <div class="row">
          <span class="pct serif tnum">Llevas {formatKg(progress.paidKg)} kg bajados</span>
        </div>
        <div class="bar" aria-hidden="true">
          <i style={{ width: `${progressPct}%` }} />
        </div>
        <div class="dual tnum">
          {formatKcal(progress.paidKcal)} de {formatKcal(progress.debtTotalKcal)} kcal · {progressPct}%
        </div>
        <div class="reassure serif">Eventualmente llegaremos.</div>
      </div>
    </section>
  )
}

function round(value: number) {
  return Math.round(value)
}

function formatKg(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
}

function formatKcal(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}
