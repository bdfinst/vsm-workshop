import { describe, it, expect } from 'vitest'
import { deriveVsmFromEvents } from '../../../src/utils/import/deriveVsm'

// Helper: ISO timestamp at `minutes` past a fixed epoch.
const EPOCH = Date.parse('2026-01-01T00:00:00Z')
const at = (minutes) => new Date(EPOCH + minutes * 60000).toISOString()

const stepByName = (vsm, name) => vsm.steps.find((s) => s.name === name)

describe('deriveVsmFromEvents', () => {
  it('returns an empty map for no events', () => {
    const vsm = deriveVsmFromEvents([])
    expect(vsm.steps).toEqual([])
    expect(vsm.connections).toEqual([])
  })

  it('creates one step per distinct stage in first-seen order', () => {
    const events = [
      { workItemId: '1', stage: 'Dev', enteredAt: at(0), exitedAt: at(60) },
      { workItemId: '1', stage: 'Test', enteredAt: at(60), exitedAt: at(90) },
    ]
    const vsm = deriveVsmFromEvents(events)
    expect(vsm.steps.map((s) => s.name)).toEqual(['Dev', 'Test'])
  })

  it('respects an explicit stage order', () => {
    const events = [
      { workItemId: '1', stage: 'Test', enteredAt: at(60), exitedAt: at(90) },
      { workItemId: '1', stage: 'Dev', enteredAt: at(0), exitedAt: at(60) },
    ]
    const vsm = deriveVsmFromEvents(events, { stageOrder: ['Dev', 'Test'] })
    expect(vsm.steps.map((s) => s.name)).toEqual(['Dev', 'Test'])
  })

  it('derives process time as the median active time in a stage', () => {
    const events = [
      { workItemId: '1', stage: 'Dev', enteredAt: at(0), exitedAt: at(60) },
      { workItemId: '2', stage: 'Dev', enteredAt: at(0), exitedAt: at(120) },
    ]
    expect(stepByName(deriveVsmFromEvents(events), 'Dev').processTime).toBe(90)
  })

  it('derives lead time including the wait until the next stage', () => {
    const events = [
      { workItemId: '1', stage: 'Dev', enteredAt: at(0), exitedAt: at(60) },
      // 40 min wait before Test starts
      { workItemId: '1', stage: 'Test', enteredAt: at(100), exitedAt: at(130) },
    ]
    const dev = stepByName(deriveVsmFromEvents(events), 'Dev')
    expect(dev.processTime).toBe(60)
    expect(dev.leadTime).toBe(100)
  })

  it('connects consecutive stages with a forward connection', () => {
    const events = [
      { workItemId: '1', stage: 'Dev', enteredAt: at(0), exitedAt: at(60) },
      { workItemId: '1', stage: 'Test', enteredAt: at(60), exitedAt: at(90) },
    ]
    const vsm = deriveVsmFromEvents(events)
    const dev = stepByName(vsm, 'Dev')
    const test = stepByName(vsm, 'Test')
    const forward = vsm.connections.find((c) => c.type === 'forward')
    expect(forward.source).toBe(dev.id)
    expect(forward.target).toBe(test.id)
  })

  it('detects rework as a backward move and lowers %C&A of the revisited stage', () => {
    const events = [
      // Item returns to Dev after Test (rework)
      { workItemId: '1', stage: 'Dev', enteredAt: at(0), exitedAt: at(60) },
      { workItemId: '1', stage: 'Test', enteredAt: at(60), exitedAt: at(90) },
      { workItemId: '1', stage: 'Dev', enteredAt: at(90), exitedAt: at(120) },
      { workItemId: '2', stage: 'Dev', enteredAt: at(0), exitedAt: at(60) },
      { workItemId: '2', stage: 'Test', enteredAt: at(60), exitedAt: at(90) },
    ]
    const vsm = deriveVsmFromEvents(events, { stageOrder: ['Dev', 'Test'] })
    const dev = stepByName(vsm, 'Dev')
    const test = stepByName(vsm, 'Test')

    // 1 of 2 items returned to Dev → 50% reentry → %C&A 50
    expect(dev.percentCompleteAccurate).toBe(50)

    const rework = vsm.connections.find((c) => c.type === 'rework')
    expect(rework.source).toBe(test.id)
    expect(rework.target).toBe(dev.id)
    expect(rework.reworkRate).toBe(50)
  })

  it('keeps lead time at least as large as process time', () => {
    const events = [{ workItemId: '1', stage: 'Solo', enteredAt: at(0), exitedAt: at(45) }]
    const solo = stepByName(deriveVsmFromEvents(events), 'Solo')
    expect(solo.leadTime).toBeGreaterThanOrEqual(solo.processTime)
  })
})
