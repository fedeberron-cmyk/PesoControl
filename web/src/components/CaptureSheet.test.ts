import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('CaptureSheet photo picker', () => {
  it('keeps camera and gallery as separate file inputs with gallery-specific accept', () => {
    const source = readFileSync(new URL('./CaptureSheet.tsx', import.meta.url), 'utf8')
    const galleryInputStart = source.indexOf('ref={galleryInputRef}')
    const galleryInput = source.slice(
      galleryInputStart,
      source.indexOf('/>', galleryInputStart)
    )

    expect(source).toContain('const GALLERY_IMAGE_ACCEPT =')
    expect(galleryInputStart).toBeGreaterThan(-1)
    expect(source).toContain('capture="environment"')
    expect(galleryInput).toContain("accept={GALLERY_IMAGE_ACCEPT}")
    expect(galleryInput).not.toContain('capture=')
    expect(galleryInput).not.toContain('accept="image/*"')
    expect(source).toContain("openPhotoSource('camera')")
    expect(source).toContain("openPhotoSource('gallery')")
    expect(source).toContain('Elegir de galería')
  })

  it('supports correction comments and gram-based estimate display', () => {
    const source = readFileSync(new URL('./CaptureSheet.tsx', import.meta.url), 'utf8')

    expect(source).toContain('Comentario o corrección')
    expect(source).toContain('Reestimar')
    expect(source).toContain('estimateItemDetail')
    expect(source).toContain('item.grams')
  })

  it('uses the food catalog in manual search', () => {
    const source = readFileSync(new URL('./CaptureSheet.tsx', import.meta.url), 'utf8')

    expect(source).toContain('searchFoodCatalog')
    expect(source).toContain('Base de alimentos')
    expect(source).toContain('Kcal por gramo')
  })
})
