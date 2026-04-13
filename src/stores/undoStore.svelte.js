/**
 * Undo/Redo Store - Svelte 5 Runes
 * Manages snapshot stacks for undo and redo operations on VSM data.
 * Snapshots contain { steps, connections } and are deep-copied to prevent
 * shared-reference mutations.
 *
 * Design decisions:
 * - D1: Undo snapshots are pushed at COMPONENT CALL SITES, not inside vsmDataStore
 * - D2: updateStepPosition (drag ops) is excluded from undo
 * - Max depth: 20 entries (oldest evicted on overflow)
 * - Redo stack clears when a new mutation is pushed after undo
 *
 * @file This file uses Svelte 5 runes ($state)
 */

const MAX_UNDO_DEPTH = 20

/**
 * Deep-copy a snapshot to prevent shared-reference mutations
 * @param {{ steps: Array, connections: Array }} snapshot
 * @returns {{ steps: Array, connections: Array }}
 */
const cloneSnapshot = (snapshot) => ({
  steps: snapshot.steps.map((s) => ({ ...s })),
  connections: snapshot.connections.map((c) => ({ ...c })),
})

/**
 * Create the undo/redo store
 * @returns {Object} Undo store with reactive state and actions
 */
function createUndoStore() {
  let undoStack = $state([])
  let redoStack = $state([])

  return {
    /** @returns {boolean} Whether undo is available */
    get canUndo() {
      return undoStack.length > 0
    },

    /** @returns {boolean} Whether redo is available */
    get canRedo() {
      return redoStack.length > 0
    },

    /**
     * Push a snapshot onto the undo stack (before a mutation).
     * Clears the redo stack since the timeline has diverged.
     * @param {{ steps: Array, connections: Array }} snapshot
     */
    pushSnapshot(snapshot) {
      const cloned = cloneSnapshot(snapshot)
      const full = [...undoStack, cloned]
      undoStack = full.length > MAX_UNDO_DEPTH ? full.slice(1) : full
      redoStack = []
    },

    /**
     * Undo the last change: pops from undo stack, pushes currentState to redo.
     * @param {{ steps: Array, connections: Array }} currentState - The current state before restoring
     * @returns {{ steps: Array, connections: Array } | null} The snapshot to restore, or null if stack empty
     */
    undo(currentState) {
      if (undoStack.length === 0) return null

      const snapshot = undoStack[undoStack.length - 1]
      undoStack = undoStack.slice(0, -1)
      redoStack = [...redoStack, cloneSnapshot(currentState)]

      return cloneSnapshot(snapshot)
    },

    /**
     * Redo the last undone change: pops from redo stack, pushes currentState to undo.
     * @param {{ steps: Array, connections: Array }} currentState - The current state before restoring
     * @returns {{ steps: Array, connections: Array } | null} The snapshot to restore, or null if stack empty
     */
    redo(currentState) {
      if (redoStack.length === 0) return null

      const snapshot = redoStack[redoStack.length - 1]
      redoStack = redoStack.slice(0, -1)
      undoStack = [...undoStack, cloneSnapshot(currentState)]

      return cloneSnapshot(snapshot)
    },

    /**
     * Clear both undo and redo stacks
     */
    clear() {
      undoStack = []
      redoStack = []
    },
  }
}

export const undoStore = createUndoStore()
