import { describe, it, expect } from 'vitest'
import { resolveUiMode } from '../../../src/utils/ui/resolveUiMode.js'

describe('resolveUiMode', () => {
  it('uses guided when the address says ?ui=guided', () => {
    expect(resolveUiMode('?ui=guided', undefined)).toBe('guided')
  })

  it('uses guided when the build default is guided', () => {
    expect(resolveUiMode('', 'guided')).toBe('guided')
  })

  it('uses v1 with no address option and no default', () => {
    expect(resolveUiMode('', undefined)).toBe('v1')
  })

  it('lets the address choose v1 over a guided default', () => {
    expect(resolveUiMode('?ui=v1', 'guided')).toBe('v1')
  })

  it.each([['?ui=nonsense'], ['?other=1']])(
    'ignores %s and falls back to the default',
    (search) => {
      expect(resolveUiMode(search, undefined)).toBe('v1')
      expect(resolveUiMode(search, 'guided')).toBe('guided')
    }
  )

  it('uses a build default of v1', () => {
    expect(resolveUiMode('', 'v1')).toBe('v1')
  })

  it('treats an unknown default as v1', () => {
    expect(resolveUiMode('', 'something')).toBe('v1')
  })
})
