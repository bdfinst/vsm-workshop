import { describe, it, expect } from 'vitest'
import { calculateWaitTimeBreakdown } from '../../../src/utils/calculations/waitTime'

const step = (o) => ({
  id: 'x',
  name: 'Step',
  type: 'development',
  processTime: 60,
  leadTime: 240,
  automated: true,
  ...o,
})

describe('calculateWaitTimeBreakdown', () => {
  it('returns no rows for an empty stream', () => {
    const result = calculateWaitTimeBreakdown([])
    expect(result.steps).toEqual([])
    expect(result.totals.leadTime).toBe(0)
  })

  it('splits each step into value-add and wait time', () => {
    const row = calculateWaitTimeBreakdown([step({ id: 'a', processTime: 60, leadTime: 240 })]).steps[0]
    expect(row.processTime).toBe(60)
    expect(row.waitTime).toBe(180)
    expect(row.waitPercentage).toBe(75)
  })

  it('never reports negative wait when process exceeds lead time', () => {
    const row = calculateWaitTimeBreakdown([step({ processTime: 100, leadTime: 60 })]).steps[0]
    expect(row.waitTime).toBe(0)
    expect(row.waitPercentage).toBe(0)
  })

  it('flags a wait-dominated step as a hidden queue', () => {
    const row = calculateWaitTimeBreakdown([step({ processTime: 10, leadTime: 200 })]).steps[0]
    expect(row.waitDominated).toBe(true)
  })

  it('does not flag a value-add-dominated step', () => {
    const row = calculateWaitTimeBreakdown([step({ processTime: 180, leadTime: 200 })]).steps[0]
    expect(row.waitDominated).toBe(false)
  })

  it('flags a manual step as a handoff', () => {
    const row = calculateWaitTimeBreakdown([step({ automated: false })]).steps[0]
    expect(row.manual).toBe(true)
  })

  it('treats a step with no automated property as automated (not a handoff)', () => {
    const s = step({})
    delete s.automated
    expect(calculateWaitTimeBreakdown([s]).steps[0].manual).toBe(false)
  })

  it('totals process, wait, and lead time across steps', () => {
    const { totals } = calculateWaitTimeBreakdown([
      step({ id: 'a', processTime: 60, leadTime: 240 }),
      step({ id: 'b', processTime: 40, leadTime: 160 }),
    ])
    expect(totals.processTime).toBe(100)
    expect(totals.waitTime).toBe(300)
    expect(totals.leadTime).toBe(400)
    expect(totals.waitPercentage).toBe(75)
  })
})
