import { describe, it, expect, beforeEach } from 'vitest'
import { undoStore } from '../../../src/stores/undoStore.svelte.js'

describe('undoStore', () => {
  beforeEach(() => {
    undoStore.clear()
  })

  describe('pushSnapshot', () => {
    it('stores a snapshot on the undo stack', () => {
      const snapshot = { steps: [{ id: '1', name: 'Dev' }], connections: [] }
      undoStore.pushSnapshot(snapshot)

      expect(undoStore.canUndo).toBe(true)
    })

    it('stores multiple snapshots', () => {
      undoStore.pushSnapshot({ steps: [], connections: [] })
      undoStore.pushSnapshot({
        steps: [{ id: '1', name: 'Dev' }],
        connections: [],
      })

      expect(undoStore.canUndo).toBe(true)
    })

    it('enforces max depth of 20 entries', () => {
      for (let i = 0; i < 25; i++) {
        undoStore.pushSnapshot({
          steps: [{ id: String(i), name: `Step ${i}` }],
          connections: [],
        })
      }

      // Undo 20 times should work, 21st should return null
      let count = 0
      let result = undoStore.undo({ steps: [], connections: [] })
      while (result !== null) {
        count++
        result = undoStore.undo({ steps: [], connections: [] })
      }
      expect(count).toBe(20)
    })

    it('clears redo stack when new snapshot is pushed', () => {
      undoStore.pushSnapshot({ steps: [], connections: [] })
      undoStore.pushSnapshot({
        steps: [{ id: '1', name: 'Dev' }],
        connections: [],
      })

      // Undo to create redo entry
      undoStore.undo({
        steps: [{ id: '1', name: 'Dev' }],
        connections: [],
      })
      expect(undoStore.canRedo).toBe(true)

      // Push new snapshot should clear redo
      undoStore.pushSnapshot({
        steps: [{ id: '2', name: 'Test' }],
        connections: [],
      })
      expect(undoStore.canRedo).toBe(false)
    })
  })

  describe('undo', () => {
    it('returns the previous snapshot and pushes current to redo', () => {
      const snapshot1 = { steps: [], connections: [] }
      const snapshot2 = {
        steps: [{ id: '1', name: 'Dev' }],
        connections: [],
      }

      undoStore.pushSnapshot(snapshot1)
      undoStore.pushSnapshot(snapshot2)

      const currentState = {
        steps: [
          { id: '1', name: 'Dev' },
          { id: '2', name: 'Test' },
        ],
        connections: [],
      }
      const result = undoStore.undo(currentState)

      expect(result).toEqual(snapshot2)
      expect(undoStore.canRedo).toBe(true)
    })

    it('returns null when undo stack is empty', () => {
      const result = undoStore.undo({ steps: [], connections: [] })
      expect(result).toBeNull()
    })

    it('pops the most recent snapshot first', () => {
      const snapshot1 = {
        steps: [{ id: '1', name: 'Step 1' }],
        connections: [],
      }
      const snapshot2 = {
        steps: [{ id: '2', name: 'Step 2' }],
        connections: [],
      }

      undoStore.pushSnapshot(snapshot1)
      undoStore.pushSnapshot(snapshot2)

      const current = { steps: [], connections: [] }
      const result = undoStore.undo(current)
      expect(result).toEqual(snapshot2)

      const result2 = undoStore.undo(current)
      expect(result2).toEqual(snapshot1)
    })
  })

  describe('redo', () => {
    it('returns the next snapshot and pushes current to undo', () => {
      const snapshot1 = { steps: [], connections: [] }
      undoStore.pushSnapshot(snapshot1)

      const currentAfterUndo = { steps: [], connections: [] }
      undoStore.undo({
        steps: [{ id: '1', name: 'Dev' }],
        connections: [],
      })

      const result = undoStore.redo(currentAfterUndo)
      expect(result).toEqual({
        steps: [{ id: '1', name: 'Dev' }],
        connections: [],
      })
    })

    it('returns null when redo stack is empty', () => {
      const result = undoStore.redo({ steps: [], connections: [] })
      expect(result).toBeNull()
    })

    it('allows alternating undo and redo', () => {
      const empty = { steps: [], connections: [] }
      const withStep = {
        steps: [{ id: '1', name: 'Dev' }],
        connections: [],
      }

      undoStore.pushSnapshot(empty)

      // Undo: current is withStep, restores empty
      const afterUndo = undoStore.undo(withStep)
      expect(afterUndo).toEqual(empty)

      // Redo: current is empty (afterUndo), restores withStep
      const afterRedo = undoStore.redo(empty)
      expect(afterRedo).toEqual(withStep)
    })
  })

  describe('canUndo / canRedo', () => {
    it('canUndo is false when stack is empty', () => {
      expect(undoStore.canUndo).toBe(false)
    })

    it('canUndo is true after push', () => {
      undoStore.pushSnapshot({ steps: [], connections: [] })
      expect(undoStore.canUndo).toBe(true)
    })

    it('canRedo is false initially', () => {
      expect(undoStore.canRedo).toBe(false)
    })

    it('canRedo is true after undo', () => {
      undoStore.pushSnapshot({ steps: [], connections: [] })
      undoStore.undo({
        steps: [{ id: '1', name: 'Dev' }],
        connections: [],
      })
      expect(undoStore.canRedo).toBe(true)
    })

    it('canRedo becomes false after new push', () => {
      undoStore.pushSnapshot({ steps: [], connections: [] })
      undoStore.undo({
        steps: [{ id: '1', name: 'Dev' }],
        connections: [],
      })
      expect(undoStore.canRedo).toBe(true)

      undoStore.pushSnapshot({
        steps: [{ id: '2', name: 'New' }],
        connections: [],
      })
      expect(undoStore.canRedo).toBe(false)
    })
  })

  describe('clear', () => {
    it('resets both stacks', () => {
      undoStore.pushSnapshot({ steps: [], connections: [] })
      undoStore.undo({ steps: [{ id: '1' }], connections: [] })

      expect(undoStore.canUndo).toBe(false)
      // After clear, canRedo should also be false
      // but clear was called in beforeEach, let's test explicitly
      undoStore.pushSnapshot({ steps: [], connections: [] })
      undoStore.undo({ steps: [{ id: '1' }], connections: [] })
      undoStore.clear()

      expect(undoStore.canUndo).toBe(false)
      expect(undoStore.canRedo).toBe(false)
    })
  })

  describe('snapshot deep copying', () => {
    it('does not share references with pushed snapshots', () => {
      const steps = [{ id: '1', name: 'Dev' }]
      const snapshot = { steps, connections: [] }
      undoStore.pushSnapshot(snapshot)

      // Mutate original
      steps[0].name = 'Mutated'

      const result = undoStore.undo({ steps: [], connections: [] })
      expect(result.steps[0].name).toBe('Dev')
    })
  })
})
