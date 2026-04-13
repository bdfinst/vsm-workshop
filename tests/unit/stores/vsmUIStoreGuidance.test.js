import { describe, it, expect, beforeEach } from 'vitest'
import { vsmUIStore } from '../../../src/stores/vsmUIStore.svelte.js'

describe('vsmUIStore guidance', () => {
  beforeEach(() => {
    vsmUIStore.clearUIState()
  })

  it('guidanceForceShow defaults to false', () => {
    expect(vsmUIStore.guidanceForceShow).toBe(false)
  })

  it('forceShowGuidance sets guidanceForceShow to true', () => {
    vsmUIStore.forceShowGuidance()
    expect(vsmUIStore.guidanceForceShow).toBe(true)
  })

  it('dismissGuidance sets both guidanceDismissed=true and guidanceForceShow=false', () => {
    vsmUIStore.forceShowGuidance()
    expect(vsmUIStore.guidanceForceShow).toBe(true)

    vsmUIStore.dismissGuidance()
    expect(vsmUIStore.guidanceDismissed).toBe(true)
    expect(vsmUIStore.guidanceForceShow).toBe(false)
  })

  it('clearUIState resets guidanceForceShow', () => {
    vsmUIStore.forceShowGuidance()
    vsmUIStore.clearUIState()
    expect(vsmUIStore.guidanceForceShow).toBe(false)
    expect(vsmUIStore.guidanceDismissed).toBe(false)
  })
})
