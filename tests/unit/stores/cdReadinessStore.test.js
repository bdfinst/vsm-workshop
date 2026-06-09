import { describe, it, expect, beforeEach } from 'vitest'
import { vsmDataStore } from '../../../src/stores/vsmDataStore.svelte.js'

const itemById = (result, id) => result.find((i) => i.id === id)

describe('vsmDataStore.cdReadiness', () => {
  beforeEach(() => {
    vsmDataStore.createNewMap('Readiness Test')
  })

  it('returns all 13 readiness items', () => {
    vsmDataStore.addStep('Development')
    expect(vsmDataStore.cdReadiness).toHaveLength(13)
  })

  it('recomputes when a step changes', () => {
    vsmDataStore.addStep('Development', { leadTime: 360 })
    expect(itemById(vsmDataStore.cdReadiness, 'work-decomposition').status).toBe('met')

    const slow = vsmDataStore.addStep('Big Batch', { leadTime: 1200 })
    expect(itemById(vsmDataStore.cdReadiness, 'work-decomposition').status).toBe('gap')
    expect(itemById(vsmDataStore.cdReadiness, 'work-decomposition').stepId).toBe(slow.id)
  })
})

describe('vsmDataStore readiness overrides', () => {
  beforeEach(() => {
    vsmDataStore.createNewMap('Override Test')
    vsmDataStore.addStep('Development', { leadTime: 1200 })
  })

  const wd = () => itemById(vsmDataStore.cdReadiness, 'work-decomposition')

  it('overrides an item to met and records the source', () => {
    vsmDataStore.setReadinessOverride('work-decomposition', 'met')
    expect(wd().status).toBe('met')
    expect(wd().source).toBe('overridden')
  })

  it('confirms an inferred gap', () => {
    vsmDataStore.confirmReadiness('work-decomposition')
    expect(wd().status).toBe('gap')
    expect(wd().source).toBe('confirmed')
  })

  it('resets an item back to its inferred status', () => {
    vsmDataStore.setReadinessOverride('work-decomposition', 'met')
    vsmDataStore.resetReadiness('work-decomposition')
    expect(wd().status).toBe('gap')
    expect(wd().source).toBe('inferred')
  })

  it('keeps an override after the map metrics recompute', () => {
    vsmDataStore.setReadinessOverride('work-decomposition', 'met')
    vsmDataStore.addStep('Monitoring')
    expect(wd().status).toBe('met')
  })

  it('does not mutate step objects when overriding', () => {
    const before = vsmDataStore.steps
    vsmDataStore.setReadinessOverride('work-decomposition', 'met')
    const after = vsmDataStore.steps
    expect(after[0].id).toBe(before[0].id)
    expect(after[0].leadTime).toBe(1200)
  })

  it('restores overrides from a loaded map and defaults legacy maps to none', () => {
    vsmDataStore.loadMap({
      id: 'm1',
      name: 'Loaded',
      steps: [{ id: 's1', name: 'Dev', leadTime: 1200, processTime: 60, percentCompleteAccurate: 100 }],
      connections: [],
      readinessOverrides: { 'work-decomposition': 'met' },
    })
    expect(wd().status).toBe('met')

    vsmDataStore.loadMap({
      id: 'm2',
      name: 'Legacy',
      steps: [{ id: 's1', name: 'Dev', leadTime: 1200, processTime: 60, percentCompleteAccurate: 100 }],
      connections: [],
    })
    expect(wd().status).toBe('gap')
  })
})
