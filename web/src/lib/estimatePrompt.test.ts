import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('estimate-food prompt', () => {
  it('requires gram-first photo estimates with user corrections', () => {
    const source = readFileSync(
      new URL('../../../supabase/functions/estimate-food/index.ts', import.meta.url),
      'utf8'
    )

    expect(source).toContain('calcula los gramos aproximados')
    expect(source).toContain('tamaño real del plato')
    expect(source).toContain('Si la nota del usuario corrige cantidad o tamaño')
    expect(source).toContain('grams')
    expect(source).toContain("required: ['name', 'grams', 'portion', 'kcal']")
  })
})
