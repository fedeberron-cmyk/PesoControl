export type FoodUnit = 'g' | 'ml' | 'pieza' | 'porcion'

export type FoodCatalogItem = {
  id: string
  name: string
  kcal_per_unit: number
  default_unit: FoodUnit
  brand?: string
}

type OpenFoodFactsProduct = {
  code?: string
  product_name?: string
  product_name_es?: string
  generic_name?: string
  generic_name_es?: string
  brands?: string
  quantity?: string
  serving_size?: string
  serving_quantity?: number | string
  nutriments?: {
    'energy-kcal_100g'?: number
    'energy-kcal_serving'?: number
  }
}

type OpenFoodFactsSearchResponse = {
  products?: OpenFoodFactsProduct[]
}

const OPEN_FOOD_FACTS_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'

export async function searchFoodCatalog(query: string, limit = 8): Promise<FoodCatalogItem[]> {
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 2) {
    return []
  }

  const params = new URLSearchParams({
    search_terms: normalizedQuery,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(limit),
    fields:
      'code,product_name,product_name_es,generic_name,generic_name_es,brands,quantity,serving_size,serving_quantity,nutriments',
  })

  const response = await fetch(`${OPEN_FOOD_FACTS_SEARCH_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Open Food Facts search failed')
  }

  const payload = (await response.json()) as OpenFoodFactsSearchResponse
  return (payload.products ?? []).flatMap(toCatalogItem).slice(0, limit)
}

function toCatalogItem(product: OpenFoodFactsProduct): FoodCatalogItem[] {
  const kcalPer100 = product.nutriments?.['energy-kcal_100g']
  if (typeof kcalPer100 !== 'number' || !Number.isFinite(kcalPer100) || kcalPer100 <= 0) {
    return []
  }

  const name = firstText(
    product.product_name_es,
    product.product_name,
    product.generic_name_es,
    product.generic_name
  )
  if (!name) {
    return []
  }

  const servingQuantity = numberFrom(product.serving_quantity)
  const hasPieceServing =
    typeof servingQuantity === 'number' &&
    Number.isFinite(servingQuantity) &&
    servingQuantity > 0 &&
    product.serving_size !== undefined &&
    /\b(1|una|un)\s*(pieza|tortilla|barra|bolsa|paquete|rebanada)\b/i.test(
      product.serving_size
    )

  if (hasPieceServing) {
    return [
      {
        id: `off-${product.code ?? slug(name)}`,
        name: labelWithBrand(name, product.brands),
        kcal_per_unit: roundInput(
          product.nutriments?.['energy-kcal_serving'] ?? (kcalPer100 * servingQuantity) / 100
        ),
        default_unit: 'pieza',
        brand: cleanBrand(product.brands),
      },
    ]
  }

  return [
    {
      id: `off-${product.code ?? slug(name)}`,
      name: labelWithBrand(name, product.brands),
      kcal_per_unit: roundInput(kcalPer100 / 100),
      default_unit: looksLiquid(product) ? 'ml' : 'g',
      brand: cleanBrand(product.brands),
    },
  ]
}

function firstText(...values: (string | undefined)[]): string {
  return values.map((value) => value?.trim()).find((value): value is string => Boolean(value)) ?? ''
}

function labelWithBrand(name: string, brand?: string): string {
  const clean = cleanBrand(brand)
  return clean ? `${name} · ${clean}` : name
}

function cleanBrand(brand?: string): string {
  return brand?.split(',')[0]?.trim() ?? ''
}

function looksLiquid(product: OpenFoodFactsProduct): boolean {
  const text = `${product.quantity ?? ''} ${product.serving_size ?? ''}`.toLocaleLowerCase('es-MX')
  return /\b(ml|l|litro|bebida|leche|jugo|agua)\b/.test(text)
}

function roundInput(value: number): number {
  return Math.round(value * 100) / 100
}

function numberFrom(value: number | string | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function slug(value: string): string {
  return value
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
