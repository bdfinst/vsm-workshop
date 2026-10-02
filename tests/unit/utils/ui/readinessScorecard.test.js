import { describe, it, expect } from 'vitest'
import {
  groupReadinessItems,
  summarizeReadiness,
  readinessStatusText,
} from '../../../../src/utils/ui/readinessScorecard'

const item = (overrides) => ({
  id: 'x',
  label: 'X',
  kind: 'signal',
  status: 'met',
  source: 'inferred',
  ...overrides,
})

describe('groupReadinessItems', () => {
  it('splits items into practices and signals', () => {
    const result = groupReadinessItems([
      item({ kind: 'practice' }),
      item({ kind: 'signal' }),
      item({ kind: 'signal' }),
    ])
    expect(result.practices).toHaveLength(1)
    expect(result.signals).toHaveLength(2)
  })

  it('orders gaps before non-gaps within a group', () => {
    const result = groupReadinessItems([
      item({ id: 'met', kind: 'signal', status: 'met' }),
      item({ id: 'gap', kind: 'signal', status: 'gap' }),
    ])
    expect(result.signals.map((i) => i.id)).toEqual(['gap', 'met'])
  })
})

describe('summarizeReadiness', () => {
  it('counts items by status', () => {
    const summary = summarizeReadiness([
      item({ status: 'met' }),
      item({ status: 'met' }),
      item({ status: 'gap' }),
      item({ status: 'needs-review' }),
    ])
    expect(summary).toEqual({ met: 2, gap: 1, needsReview: 1 })
  })
})

describe('readinessStatusText', () => {
  it('renders human-readable status text', () => {
    expect(readinessStatusText('met')).toBe('met')
    expect(readinessStatusText('gap')).toBe('gap')
    expect(readinessStatusText('needs-review')).toBe('needs review')
  })
})
