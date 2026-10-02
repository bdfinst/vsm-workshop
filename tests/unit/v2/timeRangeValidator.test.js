import { describe, it, expect } from 'vitest'
import { validateTimeRange } from '../../../src/utils/validation/v2/timeRangeValidator.js'

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

  it('accepts a min or max equal to the typical value', () => {
    expect(validateTimeRange({ typ: 960, min: 960, max: 960 }, wait)).toBeNull()
  })
})
