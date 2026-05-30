import { useEffect, useMemo, useState } from 'preact/hooks'
import { CaptureBar } from './components/CaptureBar'
import { Hero } from './components/Hero'
import { Login } from './components/Login'
import { Today } from './components/Today'
import { WeekLedger } from './components/WeekLedger'
import { signOut, useAuthSession } from './lib/auth'
import { loadHomeModel } from './lib/data'
import {
  debtProgress,
  paceFromNets,
  projectGoalDate,
  theoreticalWeight,
} from './lib/ledger'
import type { HomeSeed } from './lib/seed'

type Theme = 'light' | 'dark'

export function App() {
  const [theme, setTheme] = useState<Theme>(() => preferredTheme())
  const { session, loading: authLoading } = useAuthSession()
  const [homeModel, setHomeModel] = useState<HomeSeed | null>(null)

  async function handleSignOut() {
    try {
      await signOut()
    } catch (error) {
      console.warn('Could not sign out', error)
    }
  }

  useEffect(() => {
    if (!session) {
      setHomeModel(null)
      return
    }

    let cancelled = false
    setHomeModel(null)

    loadHomeModel(session.user.id).then((model) => {
      if (!cancelled) {
        setHomeModel(model)
      }
    })

    return () => {
      cancelled = true
    }
  }, [session])

  const model = useMemo(() => {
    if (!homeModel) {
      return null
    }

    const progress = debtProgress({
      debtTotalKcal: homeModel.debtTotalKcal,
      cumulativeNet: homeModel.cumulativeNet,
    })
    const loggedNets = homeModel.recentNets.flatMap((day) =>
      day.netKcal === null ? [] : [day.netKcal]
    )
    const projection = projectGoalDate({
      remainingKcal: progress.remainingKcal,
      paceKcalPerDay: paceFromNets(loggedNets),
      fromDateISO: homeModel.fromDateISO,
    })

    return {
      progress,
      projection,
      currentKg: theoreticalWeight(homeModel.startKg, homeModel.cumulativeNet),
    }
  }, [homeModel])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.accent = 'forest'
  }, [theme])

  if (authLoading) {
    return <LoadingShell message="Revisando sesion..." />
  }

  if (!session) {
    return (
      <main class="app-shell">
        <Login />
      </main>
    )
  }

  if (!homeModel || !model) {
    return <LoadingShell message="Cargando tu progreso..." />
  }

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
                <h1>Hola, {homeModel.userName}</h1>
                <span class="day">{formatDisplayDate(homeModel.fromDateISO)}</span>
              </div>
              <div class="head-actions">
                <button class="theme-toggle" type="button" onClick={() => setTheme(toggleTheme)}>
                  {theme === 'light' ? 'Oscuro' : 'Claro'}
                </button>
                <button class="signout-link" type="button" onClick={() => void handleSignOut()}>
                  Salir
                </button>
              </div>
            </header>

            <Hero
              startKg={homeModel.startKg}
              goalKg={homeModel.goalKg}
              currentKg={model.currentKg}
              weighIns={homeModel.weighIns}
              progress={model.progress}
              projection={model.projection}
            />
            <Today todayNet={homeModel.todayNet} />
            <WeekLedger recentNets={homeModel.recentNets} />
          </div>

          <CaptureBar />
        </div>
      </div>
    </main>
  )
}

function LoadingShell({ message }: { message: string }) {
  return (
    <main class="app-shell">
      <div class="phone">
        <div class="screen">
          <div class="statusbar">
            <span>9:41</span>
            <span class="r">PesoControl</span>
          </div>
          <div class="calm-loading">
            <div class="loading-mark" aria-hidden="true" />
            <p>{message}</p>
          </div>
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
