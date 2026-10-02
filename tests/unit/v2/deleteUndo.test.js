import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createToastStore } from '../../../src/stores/toastStore.svelte.js'
import { createDeleteUndo } from '../../../src/utils/session/deleteUndo.js'

describe('createDeleteUndo', () => {
  let toastStore
  let store
  let onannounce
  let deleteUndo

  const toast = () => toastStore.messages[0]

  beforeEach(() => {
    vi.useFakeTimers()
    toastStore = createToastStore()
    store = {
      activeVersion: { id: 'version-1' },
      undo: vi.fn(() => ({ ok: true, announcement: 'Undo: change' })),
    }
    onannounce = vi.fn()
    deleteUndo = createDeleteUndo({ toastStore, store, onannounce })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('offer', () => {
    it('shows an info toast naming what was deleted, with an Undo action', () => {
      deleteUndo.offer('Development')

      expect(toastStore.messages).toHaveLength(1)
      expect(toast()).toMatchObject({
        text: 'Development deleted',
        type: 'info',
        action: { label: 'Undo' },
      })
    })

    it('undoes the delete and announces it when Undo is used', () => {
      deleteUndo.offer('Development')

      toast().action.onclick()

      expect(store.undo).toHaveBeenCalledTimes(1)
      expect(onannounce).toHaveBeenCalledWith('Undo: change')
    })

    it('announces nothing when the undo is refused', () => {
      store.undo.mockReturnValue({ ok: false, error: 'Nothing to undo' })
      deleteUndo.offer('Development')

      toast().action.onclick()

      expect(onannounce).not.toHaveBeenCalled()
    })

    it('undoes without an announcer', () => {
      deleteUndo = createDeleteUndo({ toastStore, store })
      deleteUndo.offer('Development')

      expect(() => toast().action.onclick()).not.toThrow()
      expect(store.undo).toHaveBeenCalledTimes(1)
    })

    it('replaces the previous toast, whose Undo would undo the newer delete', () => {
      deleteUndo.offer('Alpha')
      deleteUndo.offer('Beta')

      expect(toastStore.messages.map((m) => m.text)).toEqual(['Beta deleted'])
    })
  })

  describe('close', () => {
    it('removes the toast', () => {
      deleteUndo.offer('Development')

      deleteUndo.close()

      expect(toastStore.messages).toEqual([])
    })

    it('leaves other toasts alone', () => {
      toastStore.add('Something else')
      deleteUndo.offer('Development')

      deleteUndo.close()

      expect(toastStore.messages.map((m) => m.text)).toEqual(['Something else'])
    })

    it('does nothing when no toast is offered, or when closed twice', () => {
      expect(() => deleteUndo.close()).not.toThrow()

      deleteUndo.offer('Development')
      deleteUndo.close()
      expect(() => deleteUndo.close()).not.toThrow()
    })
  })

  describe('closeIfStale', () => {
    it('keeps the toast while the version it was offered on is current', () => {
      deleteUndo.offer('Development')

      deleteUndo.closeIfStale()

      expect(toastStore.messages).toHaveLength(1)
    })

    it('closes the toast once another change has made a new version', () => {
      deleteUndo.offer('Development')
      store.activeVersion = { id: 'version-2' }

      deleteUndo.closeIfStale()

      expect(toastStore.messages).toEqual([])
    })

    it('reads the version even with no toast, so an effect depends on it', () => {
      const read = vi.fn(() => ({ id: 'version-1' }))
      Object.defineProperty(store, 'activeVersion', { get: read })

      deleteUndo.closeIfStale()

      expect(read).toHaveBeenCalled()
    })
  })
})
