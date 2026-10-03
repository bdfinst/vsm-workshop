import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createToastStore } from '../../../src/stores/toastStore.svelte.js'
import { createDeleteUndo } from '../../../src/utils/session/deleteUndo.js'

// What the home screen needs from the shared Undo toast: its own undo (a
// restore, not the open stream's history) and a hint shown with the message.
describe('createDeleteUndo for a delete with its own undo', () => {
  let toastStore

  beforeEach(() => {
    vi.useFakeTimers()
    toastStore = createToastStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('undoes through the given undo, with no value stream store', () => {
    const undo = vi.fn(() => ({ ok: true, announcement: 'Alpha restored' }))
    const onannounce = vi.fn()
    const deleteUndo = createDeleteUndo({ toastStore, undo, onannounce })

    deleteUndo.offer('Alpha')
    toastStore.messages[0].action.onclick()

    expect(undo).toHaveBeenCalledTimes(1)
    expect(onannounce).toHaveBeenCalledWith('Alpha restored')
  })

  it('shows the hint with the toast', () => {
    const deleteUndo = createDeleteUndo({
      toastStore,
      undo: vi.fn(() => ({ ok: true })),
      hint: 'Ctrl+Z to undo',
    })

    deleteUndo.offer('Alpha')

    expect(toastStore.messages[0]).toMatchObject({
      text: 'Alpha deleted',
      hint: 'Ctrl+Z to undo',
    })
  })

  it('does not close for staleness when there is no store to go stale', () => {
    const deleteUndo = createDeleteUndo({
      toastStore,
      undo: vi.fn(() => ({ ok: true })),
    })
    deleteUndo.offer('Alpha')

    deleteUndo.closeIfStale()

    expect(toastStore.messages).toHaveLength(1)
  })
})
