/**
 * Toast Notification Store - Svelte 5 Runes
 * Manages a queue of toast notifications
 * Not persisted (ephemeral state)
 * @file This file uses Svelte 5 runes ($state)
 */

let nextId = 0

/**
 * Create a toast notification store
 * @returns {Object} Toast store with reactive state and actions
 */
export function createToastStore() {
  let messages = $state([])

  const dismiss = (id) => {
    messages = messages.filter((m) => m.id !== id)
  }

  const add = (text, type = 'info', duration = 5000) => {
    const id = `toast-${++nextId}`
    messages = [...messages, { id, text, type }]

    if (type !== 'error') {
      setTimeout(() => dismiss(id), duration)
    }
  }

  return {
    get messages() {
      return [...messages]
    },
    add,
    dismiss,
  }
}

// Export singleton instance
export const toastStore = createToastStore()
