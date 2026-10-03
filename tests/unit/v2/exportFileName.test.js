import { describe, it, expect } from 'vitest'
import { exportFileName } from '../../../src/utils/ui/exportFileName.js'

describe('exportFileName', () => {
  it('replaces each character files cannot use, without collapsing or trimming', () => {
    expect(exportFileName('Q3: build/test?')).toBe('Q3- build-test-.json')
  })

  it.each(['\\', '/', ':', '*', '?', '"', '<', '>', '|'])(
    'replaces %s with a dash',
    (character) => {
      expect(exportFileName(`a${character}b`)).toBe('a-b.json')
    }
  )

  it('keeps consecutive invalid characters as separate dashes', () => {
    expect(exportFileName('a//b')).toBe('a--b.json')
  })

  it('leaves a plain name unchanged', () => {
    expect(exportFileName('Checkout delivery')).toBe('Checkout delivery.json')
  })

  it.each(['', '   ', undefined])(
    'falls back to the card name for %j',
    (name) => {
      expect(exportFileName(name)).toBe('Untitled value stream.json')
    }
  )
})
