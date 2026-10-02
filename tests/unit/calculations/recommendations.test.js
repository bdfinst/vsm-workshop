import { describe, it, expect } from 'vitest'
import { generateRecommendations } from '../../../src/utils/calculations/recommendations'

const item = (o) => ({
  id: 'work-decomposition',
  label: 'Work Decomposition',
  kind: 'signal',
  status: 'gap',
  stepId: 's1',
  explanation: 'too big',
  link: 'https://beyond.minimumcd.org/x',
  ...o,
})

describe('generateRecommendations', () => {
  it('returns no recommendations when there are no gaps', () => {
    const recs = generateRecommendations([item({ status: 'met' })], [])
    expect(recs).toEqual([])
  })

  it('creates a deep-linked countermeasure for each gap', () => {
    const recs = generateRecommendations([item()], [])
    expect(recs).toHaveLength(1)
    expect(recs[0].title).toBe('Work Decomposition')
    expect(recs[0].countermeasure).toMatch(/two days|slice/i)
    expect(recs[0].link).toMatch(/beyond\.minimumcd\.org/)
    expect(recs[0].targetStepId).toBe('s1')
  })

  it('ignores items with no defined countermeasure (e.g. unknown ids)', () => {
    const recs = generateRecommendations([item({ id: 'mystery', status: 'gap' })], [])
    expect(recs).toEqual([])
  })

  it('prioritizes recommendations on the constraint (bottleneck) first', () => {
    const recs = generateRecommendations(
      [
        item({ id: 'work-decomposition', label: 'Work Decomposition', stepId: 's1' }),
        item({ id: 'wip-limits', label: 'Work In Progress Limits', stepId: 'bottleneck' }),
      ],
      ['bottleneck']
    )
    expect(recs[0].id).toBe('wip-limits')
    expect(recs[0].priority).toBe('high')
    expect(recs[1].priority).toBe('medium')
  })

  it('does not assign a single migration phase', () => {
    const recs = generateRecommendations([item()], [])
    const text = `${recs[0].finding} ${recs[0].countermeasure}`
    expect(/phase \d/i.test(text)).toBe(false)
  })
})
