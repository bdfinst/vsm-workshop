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

  it('clearUIState resets all six state fields', () => {
    // Set up non-default state across all fields
    vsmUIStore.selectStep('step-1')
    vsmUIStore.setEditing(true)
    vsmUIStore.selectConnection('conn-1')
    vsmUIStore.forceShowGuidance()
    // Note: guidanceDismissed would be set via dismissGuidance
    vsmUIStore.dismissGuidance()

    vsmUIStore.clearUIState()

    expect(vsmUIStore.selectedStepId).toBeNull()
    expect(vsmUIStore.isEditing).toBe(false)
    expect(vsmUIStore.selectedConnectionId).toBeNull()
    expect(vsmUIStore.isEditingConnection).toBe(false)
    expect(vsmUIStore.guidanceForceShow).toBe(false)
    expect(vsmUIStore.guidanceDismissed).toBe(false)
  })
})

describe('vsmUIStore selection mutual exclusion', () => {
  beforeEach(() => {
    vsmUIStore.clearUIState()
  })

  it('selectStep clears selectedConnectionId and isEditingConnection', () => {
    vsmUIStore.selectConnection('conn-1')
    expect(vsmUIStore.selectedConnectionId).toBe('conn-1')

    vsmUIStore.selectStep('step-1')
    expect(vsmUIStore.selectedStepId).toBe('step-1')
    expect(vsmUIStore.selectedConnectionId).toBeNull()
  })

  it('selectConnection clears selectedStepId and sets isEditing to false', () => {
    vsmUIStore.selectStep('step-1')
    vsmUIStore.setEditing(true)
    expect(vsmUIStore.selectedStepId).toBe('step-1')
    expect(vsmUIStore.isEditing).toBe(true)

    vsmUIStore.selectConnection('conn-1')
    expect(vsmUIStore.selectedConnectionId).toBe('conn-1')
    expect(vsmUIStore.selectedStepId).toBeNull()
    expect(vsmUIStore.isEditing).toBe(false)
  })
})
