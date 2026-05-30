import { useEffect, useMemo, useState } from 'preact/hooks'
import { CaptureBar } from './components/CaptureBar'
import { Hero } from './components/Hero'
import { Today } from './components/Today'
import { WeekLedger } from './components/WeekLedger'
import {
  debtProgress,
  paceFromNets,
  projectGoalDate,
  theoreticalWeight,
} from './lib/ledger'
import { federicoSeed } from './lib/seed'

type Theme = 'light' | 'dark'

export function App() {
  const [theme, setTheme] = useState<Theme>(() => preferredTheme())
  const model = useMemo(() => {
    const progress = debtProgress({
      debtTotalKcal: federicoSeed.debtTotalKcal,
      cumulativeNet: federicoSeed.cumulativeNet,
    })
    const loggedNets = federicoSeed.recentNets.flatMap((day) =>
      day.netKcal === null ? [] : [day.netKcal]
    )
    const projection = projectGoalDate({
      remainingKcal: progress.remainingKcal,
      paceKcalPerDay: paceFromNets(loggedNets),
      fromDateISO: federicoSeed.fromDateISO,
    })

    return {
      progress,
      projection,
      currentKg: theoreticalWeight(federicoSeed.startKg, federicoSeed.cumulativeNet),
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.accent = 'forest'
  }, [theme])

  return (
    <main class="app-shell">
      <div class="phone">
        <div class="screen">
          <div class="statusbar">
            <span>9:41</span>
            <span class="r">PesoControl</span>
          </div>

          <div class="scroll">
            <header class="head">
              <div>
                <h1>Hola, {federicoSeed.userName}</h1>
                <span class="day">{formatDisplayDate(federicoSeed.fromDateISO)}</span>
              </div>
              <button class="theme-toggle" type="button" onClick={() => setTheme(toggleTheme)}>
                {theme === 'light' ? 'Oscuro' : 'Claro'}
              </button>
            </header>

            <Hero
              startKg={federicoSeed.startKg}
              goalKg={federicoSeed.goalKg}
              currentKg={model.currentKg}
              weighIns={federicoSeed.weighIns}
              progress={model.progress}
              projection={model.projection}
            />
            <Today todayNet={federicoSeed.todayNet} />
            <WeekLedger recentNets={federicoSeed.recentNets} />
          </div>

          <CaptureBar />
        </div>
      </div>
    </main>
  )
}

function preferredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function toggleTheme(theme: Theme): Theme {
  return theme === 'light' ? 'dark' : 'light'
}

function formatDisplayDate(dateISO: string) {
  const date = new Date(`${dateISO}T00:00:00.000Z`)
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
    .format(date)
    .replace('.', '')
}
