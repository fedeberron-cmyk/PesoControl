import { useEffect, useMemo, useState } from 'preact/hooks'
import { CaptureBar } from './components/CaptureBar'
import { Hero } from './components/Hero'
import { Login } from './components/Login'
import { Today } from './components/Today'
import { WeekLedger } from './components/WeekLedger'
import { signOut, useAuthSession } from './lib/auth'
import { loadHomeModel, type AppModel, type FoodEntry, type MealType } from './lib/data'
import {
  debtProgress,
  paceFromNets,
  projectGoalDate,
  theoreticalWeight,
} from './lib/ledger'

type Theme = 'light' | 'dark'
type View = 'hoy' | 'camino' | 'comidas' | 'perfil'

export function App() {
  const [theme, setTheme] = useState<Theme>(() => preferredTheme())
  const [view, setView] = useState<View>(() => viewFromHash())
  const { session, loading: authLoading } = useAuthSession()
  const [homeModel, setHomeModel] = useState<AppModel | null>(null)

  async function handleSignOut() {
    try {
      await signOut()
    } catch (error) {
      console.warn('Could not sign out', error)
    }
  }

  async function refreshHomeModel() {
    if (!session) {
      return
    }
    setHomeModel(await loadHomeModel(session.user.id))
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

  useEffect(() => {
    const handleHashChange = () => setView(viewFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  function navigate(nextView: View) {
    setView(nextView)
    window.history.replaceState(null, '', `#${nextView}`)
  }

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

            {view === 'hoy' ? (
              <>
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
              </>
            ) : null}

            {view === 'camino' ? (
              <CaminoView homeModel={homeModel} currentKg={model.currentKg} progress={model.progress} projection={model.projection} />
            ) : null}

            {view === 'comidas' ? <ComidasView homeModel={homeModel} /> : null}

            {view === 'perfil' ? (
              <PerfilView homeModel={homeModel} currentKg={model.currentKg} />
            ) : null}
          </div>

          <CaptureBar
            userId={session.user.id}
            activeView={view}
            onNavigate={navigate}
            onSaved={refreshHomeModel}
          />
        </div>
      </div>
    </main>
  )
}

function CaminoView({
  homeModel,
  currentKg,
  progress,
  projection,
}: {
  homeModel: AppModel
  currentKg: number
  progress: ReturnType<typeof debtProgress>
  projection: ReturnType<typeof projectGoalDate>
}) {
  const loggedNets = homeModel.recentNets.flatMap((day) =>
    day.netKcal === null ? [] : [day.netKcal]
  )
  const pace = paceFromNets(loggedNets)
  const lastWeighIn = homeModel.weighIns.at(-1) ?? null

  return (
    <>
      <section class="card view-hero">
        <div class="kick">Camino</div>
        <h2 class="serif">La deuda se mueve por acumulado.</h2>
        <div class="metric-grid">
          <Metric label="Saldado" value={`${formatKg(progress.paidKg)} kg`} sub={`${formatKcal(progress.paidKcal)} kcal`} />
          <Metric label="Pendiente" value={`${formatKg(progress.remainingKg)} kg`} sub={`${formatKcal(progress.remainingKcal)} kcal`} />
        </div>
      </section>

      <section class="card detail-card">
        <h3>Ritmo actual</h3>
        <div class="detail-list">
          <DetailRow label="Promedio 7 días" value={`${formatSignedKcal(Math.round(pace))} kcal/día`} tone={pace <= 0 ? 'def' : 'sur'} />
          <DetailRow label="Peso teórico" value={`${formatKg(currentKg)} kg`} />
          <DetailRow label="Meta" value={`${formatKg(homeModel.goalKg)} kg`} />
          <DetailRow
            label="Llegada estimada"
            value={projection.reachable ? formatShortDate(projection.dateISO) : 'Sin fecha todavía'}
          />
        </div>
      </section>

      <section class="card detail-card">
        <h3>Pesajes</h3>
        <div class="timeline-list">
          {homeModel.weighIns.length > 0 ? (
            homeModel.weighIns
              .slice()
              .reverse()
              .slice(0, 8)
              .map((weighIn) => (
                <div class="timeline-row" key={weighIn.dateISO}>
                  <span>{formatShortDate(weighIn.dateISO)}</span>
                  <strong class="tnum">{formatKg(weighIn.kg)} kg</strong>
                </div>
              ))
          ) : (
            <p class="empty-state">Aún no hay pesajes guardados.</p>
          )}
        </div>
        {lastWeighIn ? (
          <p class="fine-note">Último pesaje: {formatKg(lastWeighIn.kg)} kg el {formatShortDate(lastWeighIn.dateISO)}.</p>
        ) : null}
      </section>
    </>
  )
}

function ComidasView({ homeModel }: { homeModel: AppModel }) {
  const todayEntries = homeModel.foodEntries.filter((entry) => entry.dateISO === homeModel.fromDateISO)
  const todayTotal = sumCalories(todayEntries)
  const byMeal = groupEntriesByMeal(todayEntries)
  const recent = homeModel.foodEntries.slice(0, 12)

  return (
    <>
      <section class="card view-hero">
        <div class="kick">Comidas</div>
        <h2 class="serif">{formatKcal(todayTotal)} kcal hoy.</h2>
        <p>Registrado por comida, sin convertirlo en examen diario.</p>
      </section>

      <section class="card detail-card">
        <h3>Hoy</h3>
        <div class="meal-list">
          {MEAL_ORDER.map((meal) => {
            const entries = byMeal[meal]
            return (
              <div class="meal-block" key={meal}>
                <div class="meal-head">
                  <span>{mealLabel(meal)}</span>
                  <strong class="tnum">{formatKcal(sumCalories(entries))} kcal</strong>
                </div>
                {entries.length > 0 ? (
                  entries.map((entry) => <FoodEntryRow entry={entry} key={entry.id} />)
                ) : (
                  <p class="empty-state compact">Sin registros.</p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section class="card detail-card">
        <h3>Recientes</h3>
        <div class="entry-list">
          {recent.length > 0 ? (
            recent.map((entry) => <FoodEntryRow entry={entry} showDate key={entry.id} />)
          ) : (
            <p class="empty-state">Todavía no hay comidas guardadas.</p>
          )}
        </div>
      </section>
    </>
  )
}

function PerfilView({ homeModel, currentKg }: { homeModel: AppModel; currentKg: number }) {
  const profile = homeModel.profile
  const lastWeighIn = homeModel.weighIns.at(-1) ?? null

  return (
    <>
      <section class="card view-hero">
        <div class="kick">Perfil</div>
        <h2 class="serif">{profile.name}</h2>
        <p>Datos base para calcular la deuda y el gasto diario.</p>
      </section>

      <section class="card detail-card">
        <h3>Objetivo</h3>
        <div class="detail-list">
          <DetailRow label="Inicio" value={`${formatKg(profile.startKg)} kg`} />
          <DetailRow label="Actual teórico" value={`${formatKg(currentKg)} kg`} />
          <DetailRow label="Meta" value={`${formatKg(profile.goalKg)} kg`} />
          <DetailRow label="Deuda total" value={`${formatKcal(profile.debtTotalKcal)} kcal`} />
        </div>
      </section>

      <section class="card detail-card">
        <h3>Parámetros</h3>
        <div class="detail-list">
          <DetailRow label="TDEE" value={`${formatKcal(profile.tdee)} kcal/día`} />
          <DetailRow label="Actividad" value={activityLabel(profile.activityLevel)} />
          <DetailRow label="Altura" value={profile.heightCm ? `${profile.heightCm} cm` : 'Sin dato'} />
          <DetailRow label="Edad" value={profile.age ? `${profile.age} años` : 'Sin dato'} />
          <DetailRow label="Sexo" value={sexLabel(profile.sex)} />
          <DetailRow
            label="Último pesaje real"
            value={lastWeighIn ? `${formatKg(lastWeighIn.kg)} kg` : 'Sin dato'}
          />
        </div>
      </section>
    </>
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div class="metric-card">
      <span>{label}</span>
      <strong class="serif tnum">{value}</strong>
      <small class="tnum">{sub}</small>
    </div>
  )
}

function DetailRow({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'def' | 'sur'
}) {
  return (
    <div class="detail-row">
      <span>{label}</span>
      <strong class={`tnum ${tone ?? ''}`}>{value}</strong>
    </div>
  )
}

function FoodEntryRow({ entry, showDate = false }: { entry: FoodEntry; showDate?: boolean }) {
  return (
    <div class="food-entry-row">
      <div>
        <strong>{entry.name}</strong>
        <span>
          {showDate ? `${formatShortDate(entry.dateISO)} · ` : ''}
          {entry.aiEstimated ? 'IA' : 'Manual'}
          {formatQuantity(entry)}
        </span>
      </div>
      <b class="tnum">{formatKcal(entry.calories)}</b>
    </div>
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

const VIEWS: View[] = ['hoy', 'camino', 'comidas', 'perfil']
const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

function viewFromHash(): View {
  if (typeof window === 'undefined') {
    return 'hoy'
  }
  const hash = window.location.hash.replace('#', '')
  return VIEWS.includes(hash as View) ? (hash as View) : 'hoy'
}

function formatKg(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
}

function formatKcal(value: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

function formatSignedKcal(value: number) {
  const abs = formatKcal(Math.abs(value))
  if (value < 0) {
    return `−${abs}`
  }
  if (value > 0) {
    return `+${abs}`
  }
  return '0'
}

function formatShortDate(dateISO: string) {
  const date = new Date(`${dateISO}T00:00:00.000Z`)
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
    .format(date)
    .replace('.', '')
}

function sumCalories(entries: FoodEntry[]) {
  return entries.reduce((sum, entry) => sum + entry.calories, 0)
}

function groupEntriesByMeal(entries: FoodEntry[]): Record<MealType, FoodEntry[]> {
  return {
    breakfast: entries.filter((entry) => entry.mealType === 'breakfast'),
    lunch: entries.filter((entry) => entry.mealType === 'lunch'),
    dinner: entries.filter((entry) => entry.mealType === 'dinner'),
    snack: entries.filter((entry) => entry.mealType === 'snack'),
  }
}

function mealLabel(meal: MealType) {
  switch (meal) {
    case 'breakfast':
      return 'Desayuno'
    case 'lunch':
      return 'Almuerzo'
    case 'dinner':
      return 'Cena'
    case 'snack':
      return 'Snack'
  }
}

function formatQuantity(entry: FoodEntry) {
  if (!entry.quantity || !entry.unit) {
    return ''
  }
  const quantity = Number.isInteger(entry.quantity) ? entry.quantity.toFixed(0) : entry.quantity.toFixed(2)
  return ` · ${quantity} ${entry.unit}`
}

function activityLabel(activity: AppModel['profile']['activityLevel']) {
  switch (activity) {
    case 'sedentary':
      return 'Sedentario'
    case 'light':
      return 'Ligero'
    case 'moderate':
      return 'Moderado'
    case 'active':
      return 'Activo'
    case 'very_active':
      return 'Muy activo'
    default:
      return 'Sin dato'
  }
}

function sexLabel(sex: AppModel['profile']['sex']) {
  if (sex === 'male') {
    return 'Hombre'
  }
  if (sex === 'female') {
    return 'Mujer'
  }
  return 'Sin dato'
}
