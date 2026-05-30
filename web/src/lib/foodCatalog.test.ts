import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchFoodCatalog } from './foodCatalog'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('food catalog API search', () => {
  it('searches Open Food Facts and maps branded unit servings', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        products: [
          {
            code: '123',
            product_name: 'Tortilla integral',
            brands: 'Mission',
            serving_size: '1 tortilla (43 g)',
            serving_quantity: 43,
            nutriments: {
              'energy-kcal_100g': 162.79,
            },
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const results = await searchFoodCatalog('mission tortilla')

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('world.openfoodfacts.org/cgi/search.pl')
    expect(results[0]).toMatchObject({
      name: 'Tortilla integral · Mission',
      default_unit: 'pieza',
      kcal_per_unit: 70,
    })
  })

  it('maps liquids per ml from 100 ml nutrition data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [
            {
              code: '456',
              product_name: 'Leche sin lactosa',
              brands: 'Lala',
              quantity: '1 l',
              nutriments: {
                'energy-kcal_100g': 53,
              },
            },
          ],
        }),
      })
    )

    const results = await searchFoodCatalog('lala leche')

    expect(results[0]).toMatchObject({
      name: 'Leche sin lactosa · Lala',
      default_unit: 'ml',
      kcal_per_unit: 0.53,
    })
  })

  it('does not call the API for too-short searches', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(searchFoodCatalog('a')).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
