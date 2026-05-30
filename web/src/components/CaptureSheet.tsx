import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { estimateFood, resizeImageToBase64, type FoodEstimate } from '../lib/estimateFood'
import { searchFoodCatalog, type FoodCatalogItem, type FoodUnit } from '../lib/foodCatalog'
import { supabase, type Database } from '../lib/supabase'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
type FoodRow = Database['public']['Tables']['foods']['Row']
type FoodSuggestion =
  | { origin: 'recent'; food: FoodRow }
  | { origin: 'catalog'; food: FoodCatalogItem }

const UNIT_OPTIONS: FoodUnit[] = ['g', 'ml', 'pieza', 'porcion']
const GALLERY_IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.heic,.heif'
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
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

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
    const recent = foods
      .filter((food) => !query || normalize(food.name).includes(query))
      .map((food): FoodSuggestion => ({ origin: 'recent', food }))
    const recentNames = new Set(recent.map(({ food }) => normalize(food.name)))
    const catalog = searchFoodCatalog(name, query ? 8 : 6)
      .filter((food) => !recentNames.has(normalize(food.name)))
      .map((food): FoodSuggestion => ({ origin: 'catalog', food }))

    return [...recent, ...catalog].slice(0, 12)
  }, [foods, name])

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

  function chooseFood(suggestion: FoodSuggestion) {
    const food = suggestion.food
    setSelectedFood(suggestion.origin === 'recent' ? suggestion.food : null)
    setName(food.name)
    setKcalPerUnit(formatNumberInput(food.kcal_per_unit))
    setUnit(food.default_unit as FoodUnit)
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

  function openPhotoSource(source: 'camera' | 'gallery') {
    const input = source === 'camera' ? cameraInputRef.current : galleryInputRef.current
    if (!input) {
      return
    }
    input.value = ''
    input.click()
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
              placeholder="Buscar alimento"
              onInput={(event) => handleNameInput(event.currentTarget.value)}
            />
          </label>

          <div class="food-chips" aria-label="Base de alimentos">
            {loadingFoods ? (
              <span class="muted-note">Cargando base...</span>
            ) : visibleFoods.length > 0 ? (
              visibleFoods.map((suggestion) => (
                <button
                  key={`${suggestion.origin}-${suggestion.food.id}`}
                  class={
                    selectedFood?.id === suggestion.food.id ? 'food-chip is-selected' : 'food-chip'
                  }
                  type="button"
                  onClick={() => chooseFood(suggestion)}
                >
                  {suggestion.food.name}
                  <span>
                    {formatNumberInput(suggestion.food.kcal_per_unit)} kcal/
                    {suggestion.food.default_unit}
                  </span>
                </button>
              ))
            ) : (
              <span class="muted-note">Sin coincidencias.</span>
            )}
          </div>

          <div class="form-grid">
            <label class="field">
              <span>{kcalUnitLabel(unit)}</span>
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
          <div class="photo-picker">
            <input
              ref={cameraInputRef}
              class="photo-file-input"
              type="file"
              accept="image/*"
              capture="environment"
              aria-label="Tomar foto"
              onChange={(event) => handlePhotoInput(event.currentTarget.files?.[0] ?? null)}
            />
            <input
              ref={galleryInputRef}
              class="photo-file-input"
              type="file"
              accept={GALLERY_IMAGE_ACCEPT}
              aria-label="Elegir de galería"
              onChange={(event) => handlePhotoInput(event.currentTarget.files?.[0] ?? null)}
            />
            {photoPreviewUrl ? (
              <>
                <img class="photo-preview" src={photoPreviewUrl} alt="Vista previa de comida" />
                <div class="photo-overlay-actions" aria-label="Cambiar foto">
                  <button type="button" onClick={() => openPhotoSource('gallery')}>
                    Galería
                  </button>
                  <button type="button" onClick={() => openPhotoSource('camera')}>
                    Cámara
                  </button>
                </div>
              </>
            ) : (
              <div class="photo-empty">
                <span>Foto de tu comida</span>
                <button
                  class="photo-primary-action"
                  type="button"
                  onClick={() => openPhotoSource('gallery')}
                >
                  Elegir de galería
                </button>
                <button
                  class="photo-secondary-action"
                  type="button"
                  onClick={() => openPhotoSource('camera')}
                >
                  Tomar foto
                </button>
              </div>
            )}
          </div>

          {!estimate ? (
            <label class="field">
              <span>Nota para estimar</span>
              <textarea
                value={photoNote}
                rows={3}
                placeholder="Ej. plato grande, poco aceite, media porción..."
                onInput={(event) => setPhotoNote(event.currentTarget.value)}
              />
            </label>
          ) : null}

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
                      <small>{estimateItemDetail(item)}</small>
                      <strong class="tnum">{item.kcal} kcal</strong>
                    </div>
                  ))
                ) : (
                  <span class="muted-note">Sin alimentos detectados.</span>
                )}
              </div>

              <div class="estimate-correction">
                <label class="field">
                  <span>Comentario o corrección</span>
                  <textarea
                    value={photoNote}
                    rows={3}
                    placeholder="Ej. no fue tanto arroz, fueron 2 tortillas..."
                    onInput={(event) => setPhotoNote(event.currentTarget.value)}
                  />
                </label>
                <button
                  class="ghost-action"
                  type="button"
                  onClick={() => void handleEstimatePhoto()}
                  disabled={!photoFile || estimating}
                >
                  {estimating ? 'Reestimando...' : 'Reestimar'}
                </button>
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

function kcalUnitLabel(unit: FoodUnit): string {
  switch (unit) {
    case 'g':
      return 'Kcal por gramo'
    case 'ml':
      return 'Kcal por ml'
    case 'pieza':
      return 'Kcal por pieza'
    case 'porcion':
      return 'Kcal por porción'
  }
}

function estimateItemDetail(item: FoodEstimate['items'][number]): string {
  if (typeof item.grams === 'number' && Number.isFinite(item.grams) && item.grams > 0) {
    return item.portion ? `${item.grams} g · ${item.portion}` : `${item.grams} g`
  }
  return item.portion ? ` · ${item.portion}` : ''
}

function normalize(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}
