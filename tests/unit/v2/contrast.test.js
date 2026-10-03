// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

const css = readFileSync(
  new URL('../../../src/index.css', import.meta.url),
  'utf8'
).replace(/\/\*[\s\S]*?\*\//g, '')

const TEXT_MIN = 4.5
const GRAPHIC_MIN = 3

// The colour tokens are declared as plain hex values in two blocks of
// src/index.css: `:root` (light, the default) and `:root[data-theme='dark']`.
const LIGHT_SELECTOR = ':root(?!\\[)'
const DARK_SELECTOR = `:root\\[data-theme=["']dark["']\\]`

const blocksOf = (selectorPattern) => [
  ...css.matchAll(new RegExp(`${selectorPattern}\\s*\\{([^}]*)\\}`, 'g')),
]

const blockOf = (selectorPattern) => {
  const [first] = blocksOf(selectorPattern)
  if (!first) throw new Error(`No ${selectorPattern} block in src/index.css`)
  return first[1]
}

const declarationsIn = (block) =>
  [...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [
    name,
    value.trim(),
  ])

const HEX_COLOUR = /^#(?:[0-9a-fA-F]{3}){1,2}$/

// Tokens that hold something other than one hex colour, so are not contrast
// checked as colours: --hatch-outside is a gradient built from
// --hatch-outside-color, which is checked.
const NON_COLOUR_TOKENS = ['--hatch-outside']

const hexTokensIn = (block) =>
  Object.fromEntries(
    declarationsIn(block).filter(([, value]) => HEX_COLOUR.test(value))
  )

const BLOCKS = {
  light: blockOf(LIGHT_SELECTOR),
  dark: blockOf(DARK_SELECTOR),
}

const MODES = {
  light: hexTokensIn(BLOCKS.light),
  dark: hexTokensIn(BLOCKS.dark),
}

const channel = (hex, at) => {
  const full =
    hex.length === 4
      ? [...hex.slice(1)].map((c) => c + c).join('')
      : hex.slice(1)
  return parseInt(full.slice(at * 2, at * 2 + 2), 16) / 255
}

const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

const luminance = (hex) =>
  0.2126 * linear(channel(hex, 0)) +
  0.7152 * linear(channel(hex, 1)) +
  0.0722 * linear(channel(hex, 2))

/** WCAG 2 contrast ratio between two hex colours. */
const contrast = (a, b) => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

// Every colour token is listed here with what it sits on and the contrast it
// needs. A token that is not here fails the "every token has a contrast pair"
// test below, so a new token cannot arrive without a contrast check.
//
// Loop strokes and depth colours arrive with the rework loops (Slice 12); each
// is added to PAIRS with its token.
const PAIRS = [
  ...[
    '--map-text',
    '--muted-text',
    '--good-text',
    '--warn-text',
    '--crit-text',
    '--handoff-text',
  ].map((token) => ({ token, on: ['--map-bg'], min: TEXT_MIN })),
  { token: '--map-track', on: ['--map-bg'], min: GRAPHIC_MIN },
  {
    token: '--map-wait-outline',
    on: ['--map-bg', '--map-wait-fill'],
    min: GRAPHIC_MIN,
  },
  {
    token: '--map-process-outline',
    on: ['--map-bg', '--map-process-fill'],
    min: GRAPHIC_MIN,
  },
  { token: '--map-handoff-outline', on: ['--map-bg'], min: GRAPHIC_MIN },
  { token: '--map-dashed-outline', on: ['--map-bg'], min: GRAPHIC_MIN },
  { token: '--hatch-outside-color', on: ['--map-bg'], min: GRAPHIC_MIN },
]

describe('the contrast helper', () => {
  it('rates black on white at 21:1', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
  })

  it('rates a colour on itself at 1:1', () => {
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
  })

  it('rates #767676 on white just above the 4.5:1 text minimum', () => {
    const ratio = contrast('#767676', '#ffffff')

    expect(ratio).toBeGreaterThan(TEXT_MIN)
    expect(ratio).toBeLessThan(4.6)
  })

  it('reads three-digit hex like six-digit hex', () => {
    expect(contrast('#000', '#fff')).toBeCloseTo(21, 5)
  })

  it('does not take #777 on white as text-safe (4.48:1)', () => {
    expect(contrast('#777777', '#ffffff')).toBeLessThan(TEXT_MIN)
  })
})

describe('colour tokens', () => {
  // The token tests below read the first match, so a second block of the same
  // selector would be silently ignored.
  it.each([
    [':root', LIGHT_SELECTOR],
    [':root[data-theme="dark"]', DARK_SELECTOR],
  ])('src/index.css has exactly one %s block', (_selector, pattern) => {
    expect(blocksOf(pattern)).toHaveLength(1)
  })

  it.each(Object.entries(BLOCKS))(
    'every declaration in the %s block is a hex colour or a named non-colour token',
    (_mode, block) => {
      const notHex = declarationsIn(block)
        .filter(([, value]) => !HEX_COLOUR.test(value))
        .map(([name]) => name)

      expect(
        notHex.filter((name) => !NON_COLOUR_TOKENS.includes(name))
      ).toEqual([])
    }
  )

  it('every named non-colour token is declared in the light block', () => {
    const declared = declarationsIn(BLOCKS.light).map(([name]) => name)

    expect(
      NON_COLOUR_TOKENS.filter((name) => !declared.includes(name))
    ).toEqual([])
  })

  it('the dark palette declares exactly the tokens the light one does', () => {
    expect(Object.keys(MODES.dark).sort()).toEqual(
      Object.keys(MODES.light).sort()
    )
  })

  it('every token has a contrast pair, as a subject or as a background', () => {
    const covered = new Set(PAIRS.flatMap(({ token, on }) => [token, ...on]))

    expect(
      Object.keys(MODES.light).filter((name) => !covered.has(name))
    ).toEqual([])
  })

  it('every pair names tokens that exist', () => {
    const known = new Set(Object.keys(MODES.light))
    const named = PAIRS.flatMap(({ token, on }) => [token, ...on])

    expect(named.filter((name) => !known.has(name))).toEqual([])
  })

  it('every *-text token is held to the text minimum', () => {
    const textTokens = Object.keys(MODES.light).filter((name) =>
      name.endsWith('-text')
    )
    const checked = PAIRS.filter(({ min }) => min === TEXT_MIN).map(
      ({ token }) => token
    )

    expect(textTokens.filter((name) => !checked.includes(name))).toEqual([])
  })
})

describe.each(Object.entries(MODES))('contrast in %s mode', (_mode, tokens) => {
  PAIRS.forEach(({ token, on, min }) => {
    on.forEach((background) => {
      it(`${token} on ${background} is at least ${min}:1`, () => {
        expect(
          contrast(tokens[token], tokens[background])
        ).toBeGreaterThanOrEqual(min)
      })
    })
  })
})
