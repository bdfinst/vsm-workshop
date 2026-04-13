import { describe, it, expect, beforeEach } from 'vitest'
import { vsmDataStore } from '../../../src/stores/vsmDataStore.svelte.js'
import { undoStore } from '../../../src/stores/undoStore.svelte.js'

/**
 * Helper: capture a shallow-cloned snapshot of current vsmDataStore state.
 * Uses spread to avoid capturing live reactive references that would
 * reflect post-mutation state.
 * @returns {{ steps: Array, connections: Array }}
 */
const snapshot = () => ({
  steps: [...vsmDataStore.steps],
  connections: [...vsmDataStore.connections],
})

/**
 * Helper: push snapshot then perform mutation (simulates component call site pattern)
 * @param {Function} mutationFn
 */
const withUndo = (mutationFn) => {
  undoStore.pushSnapshot(snapshot())
  mutationFn()
}

describe('undo/redo integration with vsmDataStore', () => {
  beforeEach(() => {
    vsmDataStore.clearMap()
    undoStore.clear()
    vsmDataStore.createNewMap('Test Map')
  })

  describe('restoreSnapshot', () => {
    it('bulk-assigns steps and connections from snapshot', () => {
      vsmDataStore.addStep('Step A')
      vsmDataStore.addStep('Step B')

      const snap = {
        steps: [{ id: 'restored-1', name: 'Restored', type: 'custom', processTime: 10, leadTime: 20, percentCompleteAccurate: 100, queueSize: 0, batchSize: 1, peopleCount: 1, position: { x: 0, y: 0 } }],
        connections: [],
      }

      vsmDataStore.restoreSnapshot(snap)

      expect(vsmDataStore.steps).toHaveLength(1)
      expect(vsmDataStore.steps[0].name).toBe('Restored')
      expect(vsmDataStore.connections).toHaveLength(0)
    })
  })

  describe('addStep undo', () => {
    it('undoes addStep - step is removed', () => {
      withUndo(() => vsmDataStore.addStep('Development'))

      expect(vsmDataStore.steps).toHaveLength(1)

      const prev = undoStore.undo(snapshot())
      vsmDataStore.restoreSnapshot(prev)

      expect(vsmDataStore.steps).toHaveLength(0)
    })
  })

  describe('deleteStep undo', () => {
    it('undoes deleteStep - step is restored', () => {
      const step = vsmDataStore.addStep('Development')
      const stepId = step.id

      withUndo(() => vsmDataStore.deleteStep(stepId))

      expect(vsmDataStore.steps).toHaveLength(0)

      const prev = undoStore.undo(snapshot())
      vsmDataStore.restoreSnapshot(prev)

      expect(vsmDataStore.steps).toHaveLength(1)
      expect(vsmDataStore.steps[0].name).toBe('Development')
    })
  })

  describe('updateStep undo', () => {
    it('undoes updateStep - old values restored', () => {
      const step = vsmDataStore.addStep('Development', { processTime: 60 })

      withUndo(() =>
        vsmDataStore.updateStep(step.id, { processTime: 120 })
      )

      expect(vsmDataStore.steps[0].processTime).toBe(120)

      const prev = undoStore.undo(snapshot())
      vsmDataStore.restoreSnapshot(prev)

      expect(vsmDataStore.steps[0].processTime).toBe(60)
    })
  })

  describe('addConnection undo', () => {
    it('undoes addConnection - connection is removed', () => {
      const step1 = vsmDataStore.addStep('Dev')
      const step2 = vsmDataStore.addStep('Test')

      withUndo(() =>
        vsmDataStore.addConnection(step1.id, step2.id, 'forward')
      )

      expect(vsmDataStore.connections).toHaveLength(1)

      const prev = undoStore.undo(snapshot())
      vsmDataStore.restoreSnapshot(prev)

      expect(vsmDataStore.connections).toHaveLength(0)
    })
  })

  describe('deleteConnection undo', () => {
    it('undoes deleteConnection - connection is restored', () => {
      const step1 = vsmDataStore.addStep('Dev')
      const step2 = vsmDataStore.addStep('Test')
      const conn = vsmDataStore.addConnection(step1.id, step2.id, 'forward')

      withUndo(() => vsmDataStore.deleteConnection(conn.id))

      expect(vsmDataStore.connections).toHaveLength(0)

      const prev = undoStore.undo(snapshot())
      vsmDataStore.restoreSnapshot(prev)

      expect(vsmDataStore.connections).toHaveLength(1)
      expect(vsmDataStore.connections[0].source).toBe(step1.id)
    })
  })

  describe('updateConnection undo', () => {
    it('undoes updateConnection - old values restored', () => {
      const step1 = vsmDataStore.addStep('Dev')
      const step2 = vsmDataStore.addStep('Test')
      const conn = vsmDataStore.addConnection(
        step1.id,
        step2.id,
        'rework',
        15
      )

      withUndo(() =>
        vsmDataStore.updateConnection(conn.id, { reworkRate: 25 })
      )

      expect(vsmDataStore.connections[0].reworkRate).toBe(25)

      const prev = undoStore.undo(snapshot())
      vsmDataStore.restoreSnapshot(prev)

      expect(vsmDataStore.connections[0].reworkRate).toBe(15)
    })
  })

  describe('redo stack clears on new mutation after undo', () => {
    it('clears redo when a new mutation occurs after undo', () => {
      withUndo(() => vsmDataStore.addStep('Step 1'))
      withUndo(() => vsmDataStore.addStep('Step 2'))

      // Undo last add
      const prev = undoStore.undo(snapshot())
      vsmDataStore.restoreSnapshot(prev)
      expect(undoStore.canRedo).toBe(true)

      // New mutation should clear redo
      withUndo(() => vsmDataStore.addStep('Step 3'))
      expect(undoStore.canRedo).toBe(false)
    })
  })

  describe('redo after undo', () => {
    it('redo restores the undone state', () => {
      withUndo(() => vsmDataStore.addStep('Development'))

      expect(vsmDataStore.steps).toHaveLength(1)

      // Undo
      const prev = undoStore.undo(snapshot())
      vsmDataStore.restoreSnapshot(prev)
      expect(vsmDataStore.steps).toHaveLength(0)

      // Redo
      const next = undoStore.redo(snapshot())
      vsmDataStore.restoreSnapshot(next)
      expect(vsmDataStore.steps).toHaveLength(1)
      expect(vsmDataStore.steps[0].name).toBe('Development')
    })
  })
})
