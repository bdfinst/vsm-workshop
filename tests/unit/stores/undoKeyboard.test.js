import { describe, it, expect, beforeEach } from 'vitest'
import { vsmDataStore } from '../../../src/stores/vsmDataStore.svelte.js'
import { undoStore } from '../../../src/stores/undoStore.svelte.js'
import { performUndo, performRedo } from '../../../src/utils/undoHelper.js'

describe('performUndo / performRedo', () => {
  beforeEach(() => {
    vsmDataStore.clearMap()
    undoStore.clear()
    vsmDataStore.createNewMap('Test Map')
  })

  it('performUndo restores previous state', () => {
    undoStore.pushSnapshot({
      steps: vsmDataStore.steps,
      connections: vsmDataStore.connections,
    })
    vsmDataStore.addStep('Development')
    expect(vsmDataStore.steps).toHaveLength(1)

    performUndo()
    expect(vsmDataStore.steps).toHaveLength(0)
  })

  it('performUndo does nothing when stack is empty', () => {
    vsmDataStore.addStep('Development')
    performUndo()
    // Should still have the step since nothing was on undo stack
    expect(vsmDataStore.steps).toHaveLength(1)
  })

  it('performRedo restores undone state', () => {
    undoStore.pushSnapshot({
      steps: vsmDataStore.steps,
      connections: vsmDataStore.connections,
    })
    vsmDataStore.addStep('Development')

    performUndo()
    expect(vsmDataStore.steps).toHaveLength(0)

    performRedo()
    expect(vsmDataStore.steps).toHaveLength(1)
  })

  it('performRedo does nothing when redo stack is empty', () => {
    performRedo()
    expect(vsmDataStore.steps).toHaveLength(0)
  })
})
