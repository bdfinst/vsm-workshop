import { describe, it, expect } from 'vitest'
import {
  MINIMUM_CD_READINESS_ITEMS,
  CORE_PRACTICES,
  READINESS_SIGNALS,
} from '../../../src/data/minimumCdPractices'
import {
  WORK_ITEM_MAX_LEAD_TIME_MINUTES,
  TEST_STEP_MAX_PROCESS_TIME_MINUTES,
} from '../../../src/data/thresholds'

describe('MINIMUM_CD_READINESS_ITEMS', () => {
  it('contains 13 readiness items', () => {
    expect(MINIMUM_CD_READINESS_ITEMS).toHaveLength(13)
  })

  it('has 9 core practices', () => {
    const practices = MINIMUM_CD_READINESS_ITEMS.filter((i) => i.kind === 'practice')
    expect(practices).toHaveLength(9)
  })

  it('has 4 flow readiness signals', () => {
    const signals = MINIMUM_CD_READINESS_ITEMS.filter((i) => i.kind === 'signal')
    expect(signals).toHaveLength(4)
  })

  it('gives every item a stable id, label, kind, and link', () => {
    MINIMUM_CD_READINESS_ITEMS.forEach((item) => {
      expect(item.id).toBeTruthy()
      expect(item.label).toBeTruthy()
      expect(['practice', 'signal']).toContain(item.kind)
      expect(item.link).toMatch(/beyond\.minimumcd\.org/)
    })
  })

  it('uses unique ids', () => {
    const ids = MINIMUM_CD_READINESS_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes the nine MinimumCD core practices', () => {
    const ids = CORE_PRACTICES.map((i) => i.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'continuous-integration',
        'trunk-based-development',
        'single-path-to-production',
        'deterministic-pipeline',
        'definition-of-deployable',
        'immutable-artifacts',
        'production-like-environments',
        'rollback',
        'application-configuration',
      ])
    )
  })

  it('includes the four readiness signals', () => {
    const ids = READINESS_SIGNALS.map((i) => i.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'work-decomposition',
        'testing-fundamentals',
        'wip-limits',
        'small-batches',
      ])
    )
  })
})

describe('readiness thresholds', () => {
  it('caps a work item at two work days (960 minutes)', () => {
    expect(WORK_ITEM_MAX_LEAD_TIME_MINUTES).toBe(960)
  })

  it('caps a test step at 10 minutes', () => {
    expect(TEST_STEP_MAX_PROCESS_TIME_MINUTES).toBe(10)
  })
})
