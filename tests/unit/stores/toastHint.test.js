import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { createToastStore } from '../../../src/stores/toastStore.svelte.js'

describe('toast hint', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('keeps a hint given with the message', () => {
    const store = createToastStore()

    store.add('Alpha deleted', 'info', undefined, {
      action: { label: 'Undo', onclick: () => {} },
      hint: 'Ctrl+Z to undo',
    })

    expect(store.messages[0].hint).toBe('Ctrl+Z to undo')
  })

  it('has no hint unless one is given', () => {
    const store = createToastStore()

    store.add('Saved')

    expect(store.messages[0].hint).toBeUndefined()
  })
})
