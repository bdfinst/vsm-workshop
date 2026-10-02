/**
 * Toast Notification Store - Svelte 5 Runes
 * Manages a queue of toast notifications
 * Not persisted (ephemeral state)
 * @file This file uses Svelte 5 runes ($state)
 */

import { SvelteMap } from 'svelte/reactivity'

const DEFAULT_TOAST_DURATION_MS = 5000
// A toast with an action gives time to reach it.
const ACTION_TOAST_DURATION_MS = 10000

/**
 * Create a toast notification store
 * @returns {Object} Toast store with reactive state and actions
 */
export function createToastStore() {
  let nextId = 0
  let messages = $state([])
  const timerIds = new SvelteMap()
  // How long each self-dismissing message waits; errors have no entry.
  const durations = new SvelteMap()

  const stopTimer = (id) => {
    clearTimeout(timerIds.get(id))
    timerIds.delete(id)
  }

  const dismiss = (id) => {
    stopTimer(id)
    durations.delete(id)
    messages = messages.filter((m) => m.id !== id)
  }

  const startTimer = (id) => {
    stopTimer(id)
    timerIds.set(
      id,
      setTimeout(() => dismiss(id), durations.get(id))
    )
  }

  // Hold a message while the user is reading or reaching for it.
  const pause = (id) => stopTimer(id)

  // The wait starts over in full.
  const resume = (id) => {
    if (durations.has(id)) startTimer(id)
  }

  /**
   * @param {string} text - The message
   * @param {string} [type] - info, success, warning or error (errors stay)
   * @param {number} [duration] - Milliseconds before it goes
   * @param {{action?: {label: string, onclick: function}}} [options] - An
   *   action button; a message with one stays 10 s unless `duration` is given
   * @returns {string} The id of the new message
   */
  const add = (text, type = 'info', duration, options) => {
    const action = options?.action
    nextId = nextId + 1
    const id = `toast-${nextId}`
    messages = [...messages, { id, text, type, action }]

    if (type !== 'error') {
      durations.set(
        id,
        duration ??
          (action ? ACTION_TOAST_DURATION_MS : DEFAULT_TOAST_DURATION_MS)
      )
      startTimer(id)
    }
    return id
  }

  const clear = () => {
    timerIds.forEach((id) => clearTimeout(id))
    timerIds.clear()
    durations.clear()
    messages = []
  }

  return {
    get messages() {
      return [...messages]
    },
    add,
    dismiss,
    pause,
    resume,
    clear,
  }
}

// Export singleton instance
export const toastStore = createToastStore()
