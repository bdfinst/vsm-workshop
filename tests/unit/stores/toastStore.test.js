import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createToastStore } from '../../../src/stores/toastStore.svelte.js'

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
})
