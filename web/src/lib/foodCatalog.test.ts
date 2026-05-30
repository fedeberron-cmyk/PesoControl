import { describe, expect, it } from 'vitest'
import { searchFoodCatalog } from './foodCatalog'

describe('food catalog', () => {
  it('finds gram-based protein entries for manual logging', () => {
    const results = searchFoodCatalog('pechuga')

    expect(results[0]).toMatchObject({
      name: 'Pechuga de pollo cocida',
      default_unit: 'g',
    })
  })

  it('finds unit-based tortilla entries', () => {
    const results = searchFoodCatalog('misionera')

    expect(results[0]).toMatchObject({
      name: 'Tortilla de harina Misionera',
      default_unit: 'pieza',
    })
  })
})
