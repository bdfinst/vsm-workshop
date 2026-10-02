import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  TOAST_TYPE,
  createToastStore,
} from '../../../src/stores/toastStore.svelte.js'

describe('toastStore', () => {
  let store

  beforeEach(() => {
    vi.useFakeTimers()
    store = createToastStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('add', () => {
    it('adds a message to the messages array', () => {
      store.add('Test message')
      expect(store.messages).toHaveLength(1)
      expect(store.messages[0].text).toBe('Test message')
    })

    it('defaults to info type', () => {
      store.add('Test message')
      expect(store.messages[0].type).toBe('info')
    })

    it('accepts a custom type', () => {
      store.add('Error occurred', 'error')
      expect(store.messages[0].type).toBe('error')
    })

    it('assigns a unique id to each message', () => {
      store.add('First')
      store.add('Second')
      expect(store.messages[0].id).not.toBe(store.messages[1].id)
    })

    it('preserves stack ordering (newest last)', () => {
      store.add('First')
      store.add('Second')
      store.add('Third')
      expect(store.messages[0].text).toBe('First')
      expect(store.messages[1].text).toBe('Second')
      expect(store.messages[2].text).toBe('Third')
    })
  })

  describe('TOAST_TYPE', () => {
    it('names the four types the store knows', () => {
      expect(TOAST_TYPE).toEqual({
        INFO: 'info',
        SUCCESS: 'success',
        WARNING: 'warning',
        ERROR: 'error',
      })
    })
  })

  describe('auto-dismiss', () => {
    it('auto-dismisses info messages after default duration', () => {
      store.add('Auto dismiss me', 'info')
      expect(store.messages).toHaveLength(1)

      vi.advanceTimersByTime(5000)
      expect(store.messages).toHaveLength(0)
    })

    it('auto-dismisses with custom duration', () => {
      store.add('Custom duration', 'info', 3000)
      expect(store.messages).toHaveLength(1)

      vi.advanceTimersByTime(2999)
      expect(store.messages).toHaveLength(1)

      vi.advanceTimersByTime(1)
      expect(store.messages).toHaveLength(0)
    })

    it('does not auto-dismiss error messages', () => {
      store.add('Error message', 'error')
      expect(store.messages).toHaveLength(1)

      vi.advanceTimersByTime(10000)
      expect(store.messages).toHaveLength(1)
    })
  })

  describe('dismiss', () => {
    it('removes a message by id', () => {
      store.add('First')
      store.add('Second')
      const idToRemove = store.messages[0].id

      store.dismiss(idToRemove)
      expect(store.messages).toHaveLength(1)
      expect(store.messages[0].text).toBe('Second')
    })

    it('does nothing when id is not found', () => {
      store.add('Only message')
      store.dismiss('nonexistent-id')
      expect(store.messages).toHaveLength(1)
    })

    it('allows manual dismiss of error messages', () => {
      store.add('Error', 'error')
      const id = store.messages[0].id

      store.dismiss(id)
      expect(store.messages).toHaveLength(0)
    })
  })
  describe('action', () => {
    const undo = { label: 'Undo', onclick: () => {} }

    it('keeps the action on the message', () => {
      store.add('Step deleted', 'info', undefined, { action: undo })
      expect(store.messages[0].action).toEqual(undo)
    })

    it('returns the id of the new message', () => {
      const id = store.add('Step deleted')
      expect(store.messages[0].id).toBe(id)
    })

    it('stays for 10 seconds when it has an action', () => {
      store.add('Step deleted', 'info', undefined, { action: undo })

      vi.advanceTimersByTime(9999)
      expect(store.messages).toHaveLength(1)

      vi.advanceTimersByTime(1)
      expect(store.messages).toHaveLength(0)
    })

    it('uses an explicit duration over the action default', () => {
      store.add('Step deleted', 'info', 3000, { action: undo })

      vi.advanceTimersByTime(3000)
      expect(store.messages).toHaveLength(0)
    })

    it('tolerates a null options argument', () => {
      store.add('Plain', 'info', undefined, null)
      expect(store.messages[0].action).toBeUndefined()
    })

    it('leaves messages without an action at the default duration', () => {
      store.add('Plain')
      expect(store.messages[0].action).toBeUndefined()

      vi.advanceTimersByTime(5000)
      expect(store.messages).toHaveLength(0)
    })
  })

  describe('pause and resume', () => {
    const undo = { label: 'Undo', onclick: () => {} }
    const addWithAction = () =>
      store.add('Step deleted', 'info', undefined, { action: undo })

    it('does not dismiss a paused message', () => {
      const id = addWithAction()
      store.pause(id)

      vi.advanceTimersByTime(60000)
      expect(store.messages).toHaveLength(1)
    })

    it('restarts the full wait on resume', () => {
      const id = addWithAction()
      vi.advanceTimersByTime(9000)
      store.pause(id)
      store.resume(id)

      vi.advanceTimersByTime(9999)
      expect(store.messages).toHaveLength(1)

      vi.advanceTimersByTime(1)
      expect(store.messages).toHaveLength(0)
    })

    it('keeps the duration it was added with', () => {
      const id = store.add('Short', 'info', 3000)
      store.pause(id)
      store.resume(id)

      vi.advanceTimersByTime(3000)
      expect(store.messages).toHaveLength(0)
    })

    it('does not start a timer for an error message on resume', () => {
      const id = store.add('Failed', 'error')
      store.pause(id)
      store.resume(id)

      vi.advanceTimersByTime(60000)
      expect(store.messages).toHaveLength(1)
    })

    it('ignores an unknown id', () => {
      store.add('Only message')
      store.pause('nonexistent-id')
      store.resume('nonexistent-id')

      vi.advanceTimersByTime(5000)
      expect(store.messages).toHaveLength(0)
    })

    it('cannot bring back a dismissed message by resuming it', () => {
      const id = addWithAction()
      store.dismiss(id)
      store.resume(id)

      expect(vi.getTimerCount()).toBe(0)
      vi.advanceTimersByTime(60000)
      expect(store.messages).toHaveLength(0)
    })

    it('resuming twice leaves one timer', () => {
      const id = addWithAction()
      store.pause(id)
      store.resume(id)
      vi.advanceTimersByTime(5000)
      store.resume(id)

      expect(vi.getTimerCount()).toBe(1)
      vi.advanceTimersByTime(9999)
      expect(store.messages).toHaveLength(1)

      vi.advanceTimersByTime(1)
      expect(store.messages).toHaveLength(0)
    })
  })

  describe('clear', () => {
    it('removes every message, including a paused one that is later resumed', () => {
      store.add('Plain')
      const id = store.add('Step deleted', 'info', undefined, {
        action: { label: 'Undo', onclick: () => {} },
      })
      store.pause(id)

      store.clear()
      expect(store.messages).toEqual([])

      store.resume(id)
      expect(vi.getTimerCount()).toBe(0)
      vi.advanceTimersByTime(60000)
      expect(store.messages).toEqual([])
    })
  })
})
