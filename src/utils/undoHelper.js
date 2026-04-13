/**
 * Undo helper - captures a snapshot before a mutation.
 * Used at component call sites to push undo state before vsmDataStore mutations.
 *
 * Design decision D1: Undo snapshots are pushed at COMPONENT CALL SITES,
 * NOT inside vsmDataStore. This keeps vsmDataStore unaware of undo.
 *
 * @file Pure JS helper (no Svelte runes)
 */
import { vsmDataStore } from '../stores/vsmDataStore.svelte.js'
import { undoStore } from '../stores/undoStore.svelte.js'

/**
 * Capture current vsmDataStore state as a snapshot and push to undo stack,
 * then execute the mutation function.
 * @param {Function} mutationFn - The vsmDataStore mutation to perform
 * @returns {*} The return value of the mutation function
 */
export const withUndo = (mutationFn) => {
  undoStore.pushSnapshot({
    steps: vsmDataStore.steps,
    connections: vsmDataStore.connections,
  })
  return mutationFn()
}

/**
 * Perform an undo operation: restore the previous snapshot from the undo stack.
 * Does nothing if the undo stack is empty.
 */
export const performUndo = () => {
  const snapshot = undoStore.undo({
    steps: vsmDataStore.steps,
    connections: vsmDataStore.connections,
  })
  if (snapshot) {
    vsmDataStore.restoreSnapshot(snapshot)
  }
}

/**
 * Perform a redo operation: restore the next snapshot from the redo stack.
 * Does nothing if the redo stack is empty.
 */
export const performRedo = () => {
  const snapshot = undoStore.redo({
    steps: vsmDataStore.steps,
    connections: vsmDataStore.connections,
  })
  if (snapshot) {
    vsmDataStore.restoreSnapshot(snapshot)
  }
}
