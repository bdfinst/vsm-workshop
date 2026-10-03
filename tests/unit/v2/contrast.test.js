import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

const TEXT_MIN = 4.5
const GRAPHIC_MIN = 3

// The colour tokens are declared as plain hex values in two blocks of
// src/index.css: `:root` (light, the default) and `:root[data-theme='dark']`.
const blockOf = (selectorPattern) => {
  const match = css.match(new RegExp(`${selectorPattern}\\s*\\{([^}]*)\\}`))
  if (!match) throw new Error(`No ${selectorPattern} block in src/index.css`)
  return match[1]
}

const hexTokensIn = (block) =>
  Object.fromEntries(
    [...block.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/g)].map(
      ([, name, hex]) => [name, hex]
    )
  )

const MODES = {
  light: hexTokensIn(blockOf(':root(?!\\[)')),
  dark: hexTokensIn(blockOf(`:root\\[data-theme=["']dark["']\\]`)),
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

// Every colour token is listed here with what it sits on. A token that is not
// in this table fails the "every token has a pair" test below, so a new token
// cannot arrive without a contrast check.
//
// | kind    | token                  | sits on                       | minimum |
// | ------- | ---------------------- | ----------------------------- | ------- |
// | text    | --map-text             | --map-bg                      | 4.5     |
// | text    | --muted-text           | --map-bg                      | 4.5     |
// | text    | --good-text            | --map-bg                      | 4.5     |
// | text    | --warn-text            | --map-bg                      | 4.5     |
// | text    | --crit-text            | --map-bg                      | 4.5     |
// | text    | --handoff-text         | --map-bg                      | 4.5     |
// | graphic | --map-track            | --map-bg                      | 3       |
// | graphic | --map-wait-outline     | --map-bg, --map-wait-fill     | 3       |
// | graphic | --map-process-outline  | --map-bg, --map-process-fill  | 3       |
// | graphic | --map-handoff-outline  | --map-bg                      | 3       |
// | graphic | --map-dashed-outline   | --map-bg                      | 3       |
// | graphic | --hatch-outside-color  | --map-bg                      | 3       |
//
// Loop strokes and depth colours arrive with the rework loops (Slice 12); each
// is added to this table with its token.
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

describe('colour tokens', () => {
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
