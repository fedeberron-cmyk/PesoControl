export type FoodUnit = 'g' | 'ml' | 'pieza' | 'porcion'

export type FoodCatalogItem = {
  id: string
  name: string
  kcal_per_unit: number
  default_unit: FoodUnit
}

export const FOOD_CATALOG: FoodCatalogItem[] = [
  { id: 'chicken-breast-cooked', name: 'Pechuga de pollo cocida', kcal_per_unit: 1.65, default_unit: 'g' },
  { id: 'chicken-breast-grilled', name: 'Pechuga de pollo asada', kcal_per_unit: 1.65, default_unit: 'g' },
  { id: 'egg-whole', name: 'Huevo entero', kcal_per_unit: 72, default_unit: 'pieza' },
  { id: 'egg-white', name: 'Clara de huevo', kcal_per_unit: 17, default_unit: 'pieza' },
  { id: 'rice-cooked', name: 'Arroz cocido', kcal_per_unit: 1.3, default_unit: 'g' },
  { id: 'beans-cooked', name: 'Frijol cocido', kcal_per_unit: 1.32, default_unit: 'g' },
  { id: 'avocado', name: 'Aguacate', kcal_per_unit: 1.6, default_unit: 'g' },
  { id: 'banana', name: 'Platano', kcal_per_unit: 105, default_unit: 'pieza' },
  { id: 'apple', name: 'Manzana', kcal_per_unit: 95, default_unit: 'pieza' },
  { id: 'greek-yogurt-natural', name: 'Yogurt griego natural', kcal_per_unit: 0.97, default_unit: 'g' },
  { id: 'milk-whole', name: 'Leche entera', kcal_per_unit: 0.61, default_unit: 'ml' },
  { id: 'olive-oil', name: 'Aceite de oliva', kcal_per_unit: 8.84, default_unit: 'ml' },
  { id: 'corn-tortilla', name: 'Tortilla de maiz', kcal_per_unit: 60, default_unit: 'pieza' },
  { id: 'flour-tortilla-misionera', name: 'Tortilla de harina Misionera', kcal_per_unit: 95, default_unit: 'pieza' },
  { id: 'bread-slice', name: 'Pan de caja', kcal_per_unit: 75, default_unit: 'pieza' },
  { id: 'salmon-cooked', name: 'Salmon cocido', kcal_per_unit: 2.08, default_unit: 'g' },
  { id: 'tuna-water', name: 'Atun en agua drenado', kcal_per_unit: 1.16, default_unit: 'g' },
  { id: 'ground-beef-lean', name: 'Carne molida magra cocida', kcal_per_unit: 2.5, default_unit: 'g' },
  { id: 'potato-cooked', name: 'Papa cocida', kcal_per_unit: 0.87, default_unit: 'g' },
  { id: 'sweet-potato-cooked', name: 'Camote cocido', kcal_per_unit: 0.9, default_unit: 'g' },
]

export function searchFoodCatalog(query: string, limit = 8): FoodCatalogItem[] {
  const normalizedQuery = normalize(query)
  const candidates = normalizedQuery
    ? FOOD_CATALOG.filter((food) => normalize(food.name).includes(normalizedQuery))
    : FOOD_CATALOG

  return candidates.slice(0, limit)
}

function normalize(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}
