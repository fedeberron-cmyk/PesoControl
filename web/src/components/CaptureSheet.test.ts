import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('CaptureSheet photo picker', () => {
  it('keeps camera and gallery as separate file inputs', () => {
    const source = readFileSync(new URL('./CaptureSheet.tsx', import.meta.url), 'utf8')
    const cameraInput = /capture="environment"[\s\S]*Tomar foto/.test(source)
    const galleryInput = /accept="image\/\*"[\s\S]*Elegir de galería/.test(source)

    expect(cameraInput).toBe(true)
    expect(galleryInput).toBe(true)
  })
})
