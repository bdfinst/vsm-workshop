import { describe, it, expect } from 'vitest'
import {
  boundError,
  rangeOrderErrors,
  validateTimeRange,
} from '../../../src/utils/validation/v2/timeRangeValidator.js'

const wait = { label: 'Wait time' }

describe('validateTimeRange ordering messages', () => {
  it('says a min above the typical value in the Time stage wording', () => {
    expect(validateTimeRange({ typ: 960, min: 1440 }, wait)).toBe(
      "Min can't be more than typical"
    )
  })

  it('says a max below the typical value in the Time stage wording', () => {
    expect(validateTimeRange({ typ: 2400, max: 960 }, wait)).toBe(
      "Max can't be less than typical"
    )
  })

  it('says a min above the max in the same wording', () => {
    expect(validateTimeRange({ min: 1440, max: 960 }, wait)).toBe(
      "Min can't be more than max"
    )
  })

  it('names the typical value first when a min is above both the typical and the max', () => {
    expect(validateTimeRange({ typ: 960, min: 2400, max: 1440 }, wait)).toBe(
      "Min can't be more than typical"
    )
  })

  it('accepts a min equal to the typical value', () => {
    expect(validateTimeRange({ typ: 960, min: 960 }, wait)).toBeNull()
  })

  it('accepts a max equal to the typical value', () => {
    expect(validateTimeRange({ typ: 960, max: 960 }, wait)).toBeNull()
  })

  it('accepts a min equal to the max', () => {
    expect(validateTimeRange({ min: 960, max: 960 }, wait)).toBeNull()
  })
})

describe('validateTimeRange values', () => {
  it.each([null, undefined])('passes a %s range', (range) => {
    expect(validateTimeRange(range, wait)).toBeNull()
  })

  it('passes values that are not entered', () => {
    expect(
      validateTimeRange({ typ: null, min: null, max: undefined }, wait)
    ).toBeNull()
  })

  it('says a negative value is negative, naming the field', () => {
    expect(validateTimeRange({ typ: -1 }, wait)).toBe(
      "Wait time can't be negative"
    )
    expect(validateTimeRange({ typ: 5, min: -1 }, wait)).toBe(
      "Wait time min can't be negative"
    )
    expect(validateTimeRange({ typ: 5, max: -1 }, wait)).toBe(
      "Wait time max can't be negative"
    )
  })

  it('asks for whole minutes when a value has a fraction', () => {
    expect(validateTimeRange({ typ: 1.5 }, wait)).toBe(
      'Wait time must be a whole number of minutes, 0 or more'
    )
  })

  it.each([NaN, Infinity, -Infinity])(
    'asks for whole minutes when a value is %s',
    (typ) => {
      expect(validateTimeRange({ typ }, wait)).toBe(
        'Wait time must be a whole number of minutes, 0 or more'
      )
    }
  )

  it('accepts zero unless the time must be positive', () => {
    expect(validateTimeRange({ typ: 0 }, wait)).toBeNull()
  })

  describe('when the time must be positive', () => {
    const elapsed = { label: 'Elapsed time', mustBePositive: true }

    it.each([0, -5])('refuses %s as not more than 0', (typ) => {
      expect(validateTimeRange({ typ }, elapsed)).toBe(
        'Elapsed time must be more than 0'
      )
    })

    it('refuses a min or max of zero', () => {
      expect(validateTimeRange({ typ: 5, min: 0 }, elapsed)).toBe(
        'Elapsed time min must be more than 0'
      )
    })

    it('asks for whole minutes when a value above zero has a fraction', () => {
      expect(validateTimeRange({ typ: 1.5 }, elapsed)).toBe(
        'Elapsed time must be a whole number of minutes, above 0'
      )
    })

    it('asks for whole minutes, not "more than 0", when a value is NaN', () => {
      expect(validateTimeRange({ typ: NaN }, elapsed)).toBe(
        'Elapsed time must be a whole number of minutes, above 0'
      )
    })

    it('accepts a whole number above zero', () => {
      expect(validateTimeRange({ typ: 1 }, elapsed)).toBeNull()
    })
  })
})

describe('boundError', () => {
  it.each([-1, -0.5])('says %s is negative when 0 is allowed', (minutes) => {
    expect(boundError('Wait time', minutes, false)).toBe(
      "Wait time can't be negative"
    )
  })

  it.each([0, 0.5, 60])('accepts %s when 0 is allowed', (minutes) => {
    expect(boundError('Wait time', minutes, false)).toBeNull()
  })

  it.each([0, -5])(
    'says %s is not more than 0 when it must be positive',
    (minutes) => {
      expect(boundError('Elapsed time', minutes, true)).toBe(
        'Elapsed time must be more than 0'
      )
    }
  )

  it.each([0.5, 1])('accepts %s when it must be positive', (minutes) => {
    expect(boundError('Elapsed time', minutes, true)).toBeNull()
  })
})

describe('rangeOrderErrors', () => {
  it('shows a min above the typical, and a max below it, each on its own field', () => {
    expect(rangeOrderErrors({ typ: 5, min: 6, max: 4 })).toEqual({
      min: "Min can't be more than typical",
      max: "Max can't be less than typical",
    })
  })

  it('shows only the max error when the min is fine but the max is below the typical', () => {
    expect(rangeOrderErrors({ typ: 5, min: 4, max: 3 })).toEqual({
      max: "Max can't be less than typical",
    })
  })

  it('compares the min with the max when there is no typical', () => {
    expect(rangeOrderErrors({ min: 3, max: 2 })).toEqual({
      min: "Min can't be more than max",
    })
  })

  it('finds nothing in an ordered range', () => {
    expect(rangeOrderErrors({ typ: 5, min: 4, max: 6 })).toEqual({})
  })
})
