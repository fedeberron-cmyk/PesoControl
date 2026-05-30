import { useEffect, useMemo, useState } from 'preact/hooks'
import { estimateFood, resizeImageToBase64, type FoodEstimate } from '../lib/estimateFood'
import { supabase, type Database } from '../lib/supabase'

type FoodUnit = 'g' | 'ml' | 'pieza' | 'porcion'
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
type FoodRow = Database['public']['Tables']['foods']['Row']

const UNIT_OPTIONS: FoodUnit[] = ['g', 'ml', 'pieza', 'porcion']
const MEAL_OPTIONS: { label: string; value: MealType }[] = [
  { label: 'Desayuno', value: 'breakfast' },
  { label: 'Almuerzo', value: 'lunch' },
  { label: 'Cena', value: 'dinner' },
  { label: 'Snack', value: 'snack' },
]

export function CaptureSheet({
  userId,
  onClose,
  onSaved,
}: {
  userId: string
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [foods, setFoods] = useState<FoodRow[]>([])
  const [selectedFood, setSelectedFood] = useState<FoodRow | null>(null)
  const [name, setName] = useState('')
  const [kcalPerUnit, setKcalPerUnit] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState<FoodUnit>('porcion')
  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [mode, setMode] = useState<'manual' | 'photo'>('manual')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [photoNote, setPhotoNote] = useState('')
  const [estimating, setEstimating] = useState(false)
  const [estimate, setEstimate] = useState<FoodEstimate | null>(null)
  const [estimatedName, setEstimatedName] = useState('')
  const [estimatedCalories, setEstimatedCalories] = useState('')
  const [loadingFoods, setLoadingFoods] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    supabase
      .from('foods')
      .select('*')
      .eq('user_id', userId)
      .order('last_used_at', { ascending: false })
      .limit(20)
      .returns<FoodRow[]>()
      .then(({ data, error }) => {
        if (cancelled) {
          return
        }
        if (error) {
          console.warn('Could not load food library', error)
          setMessage('No pude cargar tus alimentos recientes. Puedes registrar manualmente.')
        } else {
          setFoods(data ?? [])
        }
        setLoadingFoods(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl)
      }
    }
  }, [photoPreviewUrl])

  const parsedKcalPerUnit = parsePositiveNumber(kcalPerUnit)
  const parsedQuantity = parsePositiveNumber(quantity)
  const computedCalories =
    parsedKcalPerUnit !== null && parsedQuantity !== null
      ? Math.round(parsedKcalPerUnit * parsedQuantity)
      : 0

  const visibleFoods = useMemo(() => {
    const query = normalize(name)
    if (!query) {
      return foods
    }
    return foods.filter((food) => normalize(food.name).includes(query))
  }, [foods, name])

  const isNewFood = !selectedFood
  const canSave =
    name.trim().length > 0 &&
    parsedKcalPerUnit !== null &&
    parsedQuantity !== null &&
    computedCalories > 0 &&
    !saving
  const parsedEstimatedCalories = parseNonNegativeInteger(estimatedCalories)
  const canSaveEstimate =
    estimate !== null &&
    estimatedName.trim().length > 0 &&
    parsedEstimatedCalories !== null &&
    !saving

  function handleNameInput(value: string) {
    setName(value)
    if (selectedFood && normalize(selectedFood.name) !== normalize(value)) {
      setSelectedFood(null)
    }
  }

  function chooseFood(food: FoodRow) {
    setSelectedFood(food)
    setName(food.name)
    setKcalPerUnit(formatNumberInput(food.kcal_per_unit))
    setUnit(food.default_unit)
    setMessage(null)
  }

  function chooseMode(nextMode: 'manual' | 'photo') {
    setMode(nextMode)
    setMessage(null)
  }

  function handlePhotoInput(file: File | null) {
    setPhotoFile(file)
    setPhotoPreviewUrl(file ? URL.createObjectURL(file) : null)
    setEstimate(null)
    setEstimatedName('')
    setEstimatedCalories('')
    setMessage(null)
  }

  async function handleEstimatePhoto() {
    if (!photoFile || estimating) {
      return
    }

    setEstimating(true)
    setMessage(null)

    try {
      const { base64, mimeType } = await resizeImageToBase64(photoFile)
      const nextEstimate = await estimateFood(base64, mimeType, photoNote.trim() || undefined)
      setEstimate(nextEstimate)
      setEstimatedName(nextEstimate.summary)
      setEstimatedCalories(String(nextEstimate.total_kcal))
    } catch (error) {
      console.warn('Could not estimate food photo', error)
      setMessage('No pude estimar la foto. Probá otra vez o cargala manual.')
    } finally {
      setEstimating(false)
    }
  }

  async function handleSave() {
    if (!canSave || parsedKcalPerUnit === null || parsedQuantity === null) {
      setMessage('Revisa nombre, calorías y cantidad antes de guardar.')
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const now = new Date().toISOString()
      let foodId = selectedFood?.id ?? null

      if (selectedFood) {
        const { error } = await supabase
          .from('foods')
          .update({
            times_used: (selectedFood.times_used ?? 0) + 1,
            last_used_at: now,
          })
          .eq('id', selectedFood.id)
          .eq('user_id', userId)

        if (error) {
          throw error
        }
      } else {
        const { data, error } = await supabase
          .from('foods')
          .insert({
            user_id: userId,
            name: name.trim(),
            kcal_per_unit: parsedKcalPerUnit,
            default_unit: unit,
            source: 'manual',
            times_used: 1,
            last_used_at: now,
          })
          .select('id')
          .single<{ id: string }>()

        if (error) {
          throw error
        }
        foodId = data.id
      }

      const { error: entryError } = await supabase.from('food_entries').insert({
        user_id: userId,
        date: todayUTC(),
        meal_type: mealType,
        name: name.trim(),
        calories: computedCalories,
        quantity: parsedQuantity,
        unit,
        food_id: foodId,
        ai_estimated: false,
      })

      if (entryError) {
        throw entryError
      }

      await onSaved()
      onClose()
    } catch (error) {
      console.warn('Could not save food entry', error)
      setMessage('No se pudo guardar. Intenta de nuevo en un momento.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEstimate() {
    if (!canSaveEstimate || parsedEstimatedCalories === null) {
      setMessage('Revisa nombre y calorías antes de guardar.')
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase.from('food_entries').insert({
        user_id: userId,
        date: todayUTC(),
        meal_type: mealType,
        name: estimatedName.trim(),
        calories: parsedEstimatedCalories,
        ai_estimated: true,
        photo_url: null,
      })

      if (error) {
        throw error
      }

      await onSaved()
      onClose()
    } catch (error) {
      console.warn('Could not save AI food entry', error)
      setMessage('No se pudo guardar. Intenta de nuevo en un momento.')
    } finally {
      setSaving(false)
    }
  }

  function renderMealSelector() {
    return (
      <div class="meal-selector" aria-label="Comida">
        {MEAL_OPTIONS.map((option) => (
          <button
            key={option.value}
            class={mealType === option.value ? 'meal-pill is-selected' : 'meal-pill'}
            type="button"
            onClick={() => setMealType(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div class="capture-overlay" role="presentation" onClick={onClose}>
      <section
        class="capture-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div class="sheet-grip" aria-hidden="true" />
        <div class="sheet-head">
          <div>
            <p class="sheet-kick">{mode === 'manual' ? 'Registro manual' : 'Estimación por foto'}</p>
            <h2 id="capture-title">Registrar comida</h2>
          </div>
          <button class="sheet-close" type="button" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div class="capture-modes" aria-label="Tipo de captura">
          <button
            class={mode === 'manual' ? 'mode-option is-active' : 'mode-option'}
            type="button"
            onClick={() => chooseMode('manual')}
          >
            Manual
          </button>
          <button
            class={mode === 'photo' ? 'mode-option is-active' : 'mode-option'}
            type="button"
            onClick={() => chooseMode('photo')}
          >
            Foto con IA
          </button>
        </div>

        {mode === 'manual' ? (
        <div class="capture-form">
          <label class="field">
            <span>Alimento</span>
            <input
              value={name}
              type="text"
              autocomplete="off"
              placeholder="Ej. yogurt natural"
              onInput={(event) => handleNameInput(event.currentTarget.value)}
            />
          </label>

          <div class="food-chips" aria-label="Alimentos recientes">
            {loadingFoods ? (
              <span class="muted-note">Cargando recientes...</span>
            ) : visibleFoods.length > 0 ? (
              visibleFoods.map((food) => (
                <button
                  key={food.id}
                  class={selectedFood?.id === food.id ? 'food-chip is-selected' : 'food-chip'}
                  type="button"
                  onClick={() => chooseFood(food)}
                >
                  {food.name}
                  <span>
                    {formatNumberInput(food.kcal_per_unit)} kcal/{food.default_unit}
                  </span>
                </button>
              ))
            ) : (
              <span class="muted-note">Sin coincidencias recientes.</span>
            )}
          </div>

          <div class="form-grid">
            <label class="field">
              <span>{isNewFood ? 'Kcal por unidad' : 'Kcal por unidad'}</span>
              <input
                value={kcalPerUnit}
                type="number"
                min="0"
                step="0.01"
                inputmode="decimal"
                placeholder="0"
                onInput={(event) => setKcalPerUnit(event.currentTarget.value)}
              />
            </label>
            <label class="field">
              <span>Unidad</span>
              <select value={unit} onChange={(event) => setUnit(event.currentTarget.value as FoodUnit)}>
                {UNIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div class="form-grid">
            <label class="field">
              <span>Cantidad</span>
              <input
                value={quantity}
                type="number"
                min="0"
                step="0.01"
                inputmode="decimal"
                placeholder="1"
                onInput={(event) => setQuantity(event.currentTarget.value)}
              />
            </label>
            <div class="kcal-preview" aria-live="polite">
              <span>Calculado</span>
              <strong class="tnum">{computedCalories}</strong>
              <small>kcal</small>
            </div>
          </div>

          {renderMealSelector()}

          {message ? <p class="capture-message">{message}</p> : null}
        </div>
        ) : (
        <div class="capture-form">
          <label class="photo-picker">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => handlePhotoInput(event.currentTarget.files?.[0] ?? null)}
            />
            {photoPreviewUrl ? (
              <img class="photo-preview" src={photoPreviewUrl} alt="Vista previa de comida" />
            ) : (
              <span class="photo-placeholder">Tomar o elegir foto</span>
            )}
          </label>

          <label class="field">
            <span>¿Algo que deba saber? (aceite, tamaño de porción...)</span>
            <textarea
              value={photoNote}
              rows={3}
              placeholder="Opcional"
              onInput={(event) => setPhotoNote(event.currentTarget.value)}
            />
          </label>

          <button
            class="save-action estimate-action"
            type="button"
            onClick={() => void handleEstimatePhoto()}
            disabled={!photoFile || estimating}
          >
            {estimating ? 'Estimando...' : 'Estimar con IA'}
          </button>

          {estimate ? (
            <div class="estimate-result">
              <div class="estimate-summary">
                <span>Estimación</span>
                <strong>{estimate.summary}</strong>
              </div>
              <div class="estimate-items">
                {estimate.items.length > 0 ? (
                  estimate.items.map((item, index) => (
                    <div class="estimate-item" key={`${item.name}-${index}`}>
                      <span>{item.name}</span>
                      <small>{item.portion ? ` · ${item.portion}` : ''}</small>
                      <strong class="tnum">{item.kcal} kcal</strong>
                    </div>
                  ))
                ) : (
                  <span class="muted-note">Sin alimentos detectados.</span>
                )}
              </div>

              <label class="field">
                <span>Nombre</span>
                <input
                  value={estimatedName}
                  type="text"
                  autocomplete="off"
                  onInput={(event) => setEstimatedName(event.currentTarget.value)}
                />
              </label>

              <div class="form-grid">
                <label class="field">
                  <span>Total kcal</span>
                  <input
                    value={estimatedCalories}
                    type="number"
                    min="0"
                    step="1"
                    inputmode="numeric"
                    onInput={(event) => setEstimatedCalories(event.currentTarget.value)}
                  />
                </label>
                <div class="kcal-preview" aria-live="polite">
                  <span>Total</span>
                  <strong class="tnum">{parsedEstimatedCalories ?? 0}</strong>
                  <small>kcal</small>
                </div>
              </div>

              {renderMealSelector()}
            </div>
          ) : null}

          {message ? <p class="capture-message">{message}</p> : null}
        </div>
        )}

        <div class="sheet-actions">
          <button class="ghost-action" type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            class="save-action"
            type="button"
            onClick={() => void (mode === 'manual' ? handleSave() : handleSaveEstimate())}
            disabled={mode === 'manual' ? !canSave : !canSaveEstimate}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </section>
    </div>
  )
}

function parsePositiveNumber(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

function parseNonNegativeInteger(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null
  }
  return parsed
}

function formatNumberInput(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value)
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('es-MX')
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}
