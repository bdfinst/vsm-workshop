/**
 * Toast Notification Store - Svelte 5 Runes
 * Manages a queue of toast notifications
 * Not persisted (ephemeral state)
 * @file This file uses Svelte 5 runes ($state)
 */

import { SvelteMap } from 'svelte/reactivity'

const DEFAULT_TOAST_DURATION_MS = 5000

/**
 * Create a toast notification store
 * @returns {Object} Toast store with reactive state and actions
 */
export function createToastStore() {
  let nextId = 0
  let messages = $state([])
  const timerIds = new SvelteMap()

  const dismiss = (id) => {
    if (timerIds.has(id)) {
      clearTimeout(timerIds.get(id))
      timerIds.delete(id)
    }
    messages = messages.filter((m) => m.id !== id)
  }

  const add = (text, type = 'info', duration = DEFAULT_TOAST_DURATION_MS) => {
    const id = `toast-${++nextId}`
    messages = [...messages, { id, text, type }]

    if (type !== 'error') {
      const timerId = setTimeout(() => dismiss(id), duration)
      timerIds.set(id, timerId)
    }
  }

  const clear = () => {
    timerIds.forEach((id) => clearTimeout(id))
    timerIds.clear()
    messages = []
  }

  return {
    get messages() {
      return [...messages]
    },
    add,
    dismiss,
    clear,
  }
}

// Export singleton instance
export const toastStore = createToastStore()
