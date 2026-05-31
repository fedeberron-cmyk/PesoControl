import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('mobile shell styles', () => {
  it('removes the mock status bar on phone-sized viewports', () => {
    const source = readFileSync(new URL('./styles.css', import.meta.url), 'utf8')
    const mobileMediaStart = source.indexOf('@media (max-width: 430px)')
    const mobileMedia = source.slice(mobileMediaStart)

    expect(mobileMediaStart).toBeGreaterThan(-1)
    expect(mobileMedia).toContain('.statusbar')
    expect(mobileMedia).toContain('display: none')
    expect(mobileMedia).toContain('padding-top: env(safe-area-inset-top)')
    expect(mobileMedia).toContain('padding-bottom: env(safe-area-inset-bottom)')
  })
})
