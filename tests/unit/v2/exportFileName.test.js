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

  it.each(['', '   ', undefined, null])(
    'falls back to the card name for %j',
    (name) => {
      expect(exportFileName(name)).toBe('Untitled value stream.json')
    }
  )

  it.each([
    ['control characters', 'a\u0000b\u001fc\u007fd\u0085e', 'abcde.json'],
    ['a newline and a tab', 'a\nb\tc', 'abc.json'],
    ['a right-to-left override', 'a\u202Eb', 'ab.json'],
    ['a bidi isolate', 'a\u2066b\u2069c', 'abc.json'],
    ['a left-to-right mark', 'a\u200Eb', 'ab.json'],
    ['an Arabic letter mark', 'a\u061Cb', 'ab.json'],
  ])('removes %s', (_, name, expected) => {
    expect(exportFileName(name)).toBe(expected)
  })

  it('keeps a zero-width joiner, so an emoji sequence stays one emoji', () => {
    const family = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}'

    expect(exportFileName(`${family} Team`)).toBe(`${family} Team.json`)
  })

  it('keeps a zero-width non-joiner, which Persian words need', () => {
    const persian = '\u0645\u06CC\u200C\u062E\u0648\u0627\u0647\u0645'

    expect(exportFileName(persian)).toBe(`${persian}.json`)
  })

  it('removes a zero-width space', () => {
    expect(exportFileName('a\u200Bb')).toBe('ab.json')
  })

  it('removes a right-to-left mark', () => {
    expect(exportFileName('a\u200Fb')).toBe('ab.json')
  })

  it('removes a right-to-left override so the extension cannot be disguised', () => {
    expect(exportFileName('report\u202Egnp.exe')).toBe('reportgnp.exe.json')
  })

  it.each([
    ['dots', 'Plan...', 'Plan.json'],
    ['spaces', 'Plan   ', 'Plan.json'],
    ['dots and spaces', 'Plan . . ', 'Plan.json'],
  ])(
    'drops trailing %s, which Windows silently removes',
    (_, name, expected) => {
      expect(exportFileName(name)).toBe(expected)
    }
  )

  it('keeps dots inside the name', () => {
    expect(exportFileName('v1.2 plan')).toBe('v1.2 plan.json')
  })

  it.each(['.', '...', ' . '])(
    'falls back to the card name when only dots and spaces are left (%j)',
    (name) => {
      expect(exportFileName(name)).toBe('Untitled value stream.json')
    }
  )

  it.each([
    'CON',
    'con',
    'PRN',
    'AUX',
    'NUL',
    'COM1',
    'com9',
    'LPT1',
    'lpt9',
    'COM\u00B9',
    'con.txt',
    'NUL .x',
  ])('does not name the file after the Windows device %s', (name) => {
    expect(exportFileName(name)).toBe(`_${name}.json`)
  })

  it('treats a device name with a trailing dot as the device, once the dot is dropped', () => {
    expect(exportFileName('CON.')).toBe('_CON.json')
  })

  it.each(['CONSOLE', 'COM10', 'Communication', 'LPT', 'my CON'])(
    'leaves %s alone, since it is not a device name',
    (name) => {
      expect(exportFileName(name)).toBe(`${name}.json`)
    }
  )

  it('caps a long name, leaving room for the extension', () => {
    const fileName = exportFileName('a'.repeat(500))

    expect(fileName).toBe(`${'a'.repeat(245)}.json`)
  })

  it('does not cut a character in half when capping', () => {
    const fileName = exportFileName('\u{1F600}'.repeat(150))

    expect(fileName).toBe(`${'\u{1F600}'.repeat(61)}.json`)
  })

  it('removes the right-to-left override from evil-RLO-nosj', () => {
    expect(exportFileName('evil\u202Enosj')).toBe('evilnosj.json')
  })

  it('leaves an ASCII name under the byte cap unchanged', () => {
    const name = 'a'.repeat(245)

    expect(exportFileName(name)).toBe(`${name}.json`)
  })

  it.each([
    ['CJK characters', '中'.repeat(100)],
    ['astral emoji', '\u{1F600}'.repeat(100)],
  ])('keeps 100 %s within 255 bytes with the extension', (_, name) => {
    const fileName = exportFileName(name)

    expect(new TextEncoder().encode(fileName).length).toBeLessThanOrEqual(255)
    expect(fileName.endsWith('.json')).toBe(true)
    expect(fileName).not.toContain('\uFFFD')
  })

  it('drops the dots a cap leaves at the end', () => {
    expect(exportFileName(`${'a'.repeat(243)}...b`)).toBe(
      `${'a'.repeat(243)}.json`
    )
  })
})
