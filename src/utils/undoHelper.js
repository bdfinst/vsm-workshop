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
