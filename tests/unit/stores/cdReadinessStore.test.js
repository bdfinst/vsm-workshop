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
