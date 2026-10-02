import { describe, it, expect } from 'vitest'
import {
  formatDuration,
  formatDurationRange,
  formatPercent,
  formatPercentRange,
  toMinutes,
  fromMinutes,
} from '../../../src/utils/calculations/v2/format.js'

describe('formatDuration', () => {
  it('shows hours below one working day and days from one working day', () => {
    expect(formatDuration(210, 8)).toBe('3.5 hours')
    expect(formatDuration(479, 8)).toBe('8.0 hours')
    expect(formatDuration(480, 8)).toBe('1.0 days')
    expect(formatDuration(0, 8)).toBe('0.0 hours')
  })

  it('moves the day boundary with the working day', () => {
    expect(formatDuration(450, 7.5)).toBe('1.0 days')
    expect(formatDuration(449, 7.5)).toBe('7.5 hours')
  })

  it.each([0, -1, NaN, Infinity, undefined])(
    'rejects a working day of %s hours',
    (hours) => {
      expect(() => formatDuration(480, hours)).toThrow(RangeError)
    }
  )
})

describe('formatDurationRange', () => {
  it('joins two values of the same unit under one unit label', () => {
    expect(formatDurationRange({ low: 7590, high: 10950 }, 8)).toBe(
      '15.8–22.8 days'
    )
  })

  it('labels each end when the units differ', () => {
    expect(formatDurationRange({ low: 210, high: 9030 }, 8)).toBe(
      '3.5 hours–18.8 days'
    )
  })

  it('shows one value when both ends display the same', () => {
    expect(formatDurationRange({ low: 9030, high: 9030 }, 8)).toBe('18.8 days')
    expect(formatDurationRange({ low: 9030, high: 9031 }, 8)).toBe('18.8 days')
  })
})

describe('formatDuration of a missing figure', () => {
  const incomplete = { incomplete: true, stepName: 'Deploy' }

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['NaN', NaN],
    ['an incomplete result', incomplete],
  ])(
    'throws a TypeError for %s instead of printing a made-up value',
    (_, value) => {
      expect(() => formatDuration(value, 8)).toThrow(TypeError)
    }
  )

  it.each([
    ['a null low end', { low: null, high: 100 }],
    ['a null high end', { low: 100, high: null }],
    ['an incomplete range', incomplete],
  ])('formatDurationRange throws a TypeError for %s', (_, range) => {
    expect(() => formatDurationRange(range, 8)).toThrow(TypeError)
  })
})

describe('formatPercent of a missing figure', () => {
  const incomplete = { incomplete: true, stepName: 'Deploy' }

  it.each([null, undefined, NaN, incomplete])(
    'throws a TypeError for %j',
    (value) => {
      expect(() => formatPercent(value)).toThrow(TypeError)
    }
  )

  it.each([
    ['a null end', { low: null, high: 0.2 }],
    ['an incomplete range', incomplete],
  ])('formatPercentRange throws a TypeError for %s', (_, range) => {
    expect(() => formatPercentRange(range, { scale: 'ratio' })).toThrow(
      TypeError
    )
  })
})

describe('formatPercent', () => {
  it('formats a 0-100 percentage by default, one decimal', () => {
    expect(formatPercent(100)).toBe('100.0%')
    expect(formatPercent(80)).toBe('80.0%')
  })

  it('formats a 0-1 ratio when the scale is "ratio"', () => {
    expect(formatPercent(870 / 9030, { scale: 'ratio' })).toBe('9.6%')
    expect(formatPercent(1, { scale: 'ratio' })).toBe('100.0%')
  })

  it('takes the number of decimals', () => {
    expect(formatPercent(20, { decimals: 0 })).toBe('20%')
    expect(formatPercent(12.5, { decimals: 0 })).toBe('13%')
  })

  it('rounds half up, not down, where binary floats fall just under the half', () => {
    expect(formatPercent(1.45)).toBe('1.5%')
    expect(formatPercent(1.005, { decimals: 2 })).toBe('1.01%')
    expect(formatPercent(2.675, { decimals: 2 })).toBe('2.68%')
    expect(formatPercent(8.345, { decimals: 2 })).toBe('8.35%')
  })

  it('rejects an unknown scale instead of guessing', () => {
    expect(() => formatPercent(0.5, { scale: 'fraction' })).toThrow(RangeError)
  })
})

describe('formatPercentRange', () => {
  it('joins the two ends, each with its % sign', () => {
    expect(
      formatPercentRange({ low: 0.0831, high: 0.2206 }, { scale: 'ratio' })
    ).toBe('8.3%–22.1%')
  })

  it('shows one value when both ends display the same', () => {
    expect(formatPercentRange({ low: 9.6, high: 9.6 })).toBe('9.6%')
  })
})

describe('toMinutes', () => {
  it('converts working days at the working day length', () => {
    expect(toMinutes(1.5, 'days', 8)).toEqual({ minutes: 720 })
    expect(toMinutes(1, 'days', 7.5)).toEqual({ minutes: 450 })
    expect(toMinutes(2, 'days', 7.5)).toEqual({ minutes: 900 })
  })

  it('converts hours and minutes', () => {
    expect(toMinutes(1.5, 'hours', 7.5)).toEqual({ minutes: 90 })
    expect(toMinutes(45, 'minutes', 8)).toEqual({ minutes: 45 })
  })

  it('rounds decimals to whole minutes', () => {
    expect(toMinutes(10.4, 'minutes', 8)).toEqual({ minutes: 10 })
    expect(toMinutes(10.5, 'minutes', 8)).toEqual({ minutes: 11 })
    expect(toMinutes(0.3333, 'hours', 8)).toEqual({ minutes: 20 })
    expect(toMinutes(0.3333, 'days', 8)).toEqual({ minutes: 160 })
  })

  it('accepts what a text field holds', () => {
    expect(toMinutes('1.5', 'days', 8)).toEqual({ minutes: 720 })
    expect(toMinutes(' 30 ', 'minutes', 8)).toEqual({ minutes: 30 })
    expect(toMinutes('0', 'minutes', 8)).toEqual({ minutes: 0 })
  })

  it.each([
    ['empty text', ''],
    ['blank text', '   '],
    ['null', null],
    ['undefined', undefined],
    ['letters', 'abc'],
    ['a number with a unit', '5h'],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['an object', {}],
  ])('returns an error for %s', (_, value) => {
    const result = toMinutes(value, 'minutes', 8)

    expect(result).toEqual({ error: 'Enter a number' })
  })

  it('throws on a unit it does not know', () => {
    expect(() => toMinutes(1, 'weeks', 8)).toThrow(RangeError)
  })

  it('throws for days when the working day is not a positive number', () => {
    expect(() => toMinutes(1, 'days', 0)).toThrow(RangeError)
    expect(() => toMinutes(1, 'days', undefined)).toThrow(RangeError)
  })

  it('converts a negative amount; validation, not conversion, rejects it', () => {
    expect(toMinutes(-1.5, 'hours', 8)).toEqual({ minutes: -90 })
    expect(toMinutes(-30, 'minutes', 8)).toEqual({ minutes: -30 })
  })

  it('never returns negative zero', () => {
    expect(Object.is(toMinutes(-0.2, 'minutes', 8).minutes, 0)).toBe(true)
  })
})

describe('fromMinutes', () => {
  it('converts minutes into the unit a field shows', () => {
    expect(fromMinutes(720, 'days', 8)).toBe(1.5)
    expect(fromMinutes(450, 'days', 7.5)).toBe(1)
    expect(fromMinutes(90, 'hours', 8)).toBe(1.5)
    expect(fromMinutes(45, 'minutes', 8)).toBe(45)
  })

  it('rounds to 4 decimals', () => {
    expect(fromMinutes(100, 'days', 8)).toBe(0.2083)
  })

  it('throws on a unit it does not know', () => {
    expect(() => fromMinutes(60, 'weeks', 8)).toThrow(RangeError)
  })

  it.each([0, -1, NaN, undefined])(
    'throws for days when the working day is %s hours',
    (hours) => {
      expect(() => fromMinutes(480, 'days', hours)).toThrow(RangeError)
    }
  )

  describe('round trip', () => {
    // A stepped sample plus the boundaries around one working day
    const sample = [
      ...Array.from({ length: 100 }, (_, i) => i * 53),
      ...[1, 59, 60, 61, 449, 450, 479, 480, 481, 5000],
    ]

    it.each([
      [8, 'days'],
      [7.5, 'days'],
      [8, 'hours'],
      [8, 'minutes'],
    ])('returns every sampled whole minute (%s h day, %s)', (hours, unit) => {
      for (const minutes of sample) {
        expect(
          toMinutes(fromMinutes(minutes, unit, hours), unit, hours)
        ).toEqual({ minutes })
      }
    })
  })
})
