/**
 * Check if localStorage is available
 * @returns {boolean}
 */
function isLocalStorageAvailable() {
  try {
    if (typeof window === 'undefined') return false
    if (typeof localStorage === 'undefined') return false
    // Test if localStorage actually works
    const testKey = '__storage_test__'
    localStorage.setItem(testKey, testKey)
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Creates a reactive state that persists to localStorage
 * Compatible with Svelte 5 runes
 *
 * @param {string} key - localStorage key
 * @param {*} initialValue - Default value if nothing stored
 * @param {Function} [sanitize] - Optional sanitizer function for loaded data
 * @returns {*} - The reactive state value (read from localStorage or initial)
 */
export function getPersistedValue(key, initialValue, sanitize) {
  if (!isLocalStorageAvailable()) {
    return initialValue
  }

  try {
    const stored = localStorage.getItem(key)
    if (stored !== null) {
      const parsed = JSON.parse(stored)

      if (sanitize) {
        return sanitize(parsed)
      }

      return parsed
    }
  } catch (e) {
    // Log in all environments except test to surface data-loss issues
    const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test'
    if (!isTest) {
      console.warn(`Failed to read ${key} from localStorage:`, e)
    }
  }

  return initialValue
}

/**
 * Persist a value to localStorage
 *
 * @param {string} key - localStorage key
 * @param {*} value - Value to persist
 */
export function persistValue(key, value) {
  if (!isLocalStorageAvailable()) {
    return
  }

  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    // Silent fail in test environment
    if (
      import.meta.env.DEV &&
      (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test')
    ) {
      console.warn(`Failed to write ${key} to localStorage:`, e)
    }
  }
}

/**
 * Clear a persisted value from localStorage
 *
 * @param {string} key - localStorage key
 */
export function clearPersistedValue(key) {
  if (!isLocalStorageAvailable()) {
    return
  }

  try {
    localStorage.removeItem(key)
  } catch (e) {
    // Silent fail in test environment
    if (
      import.meta.env.DEV &&
      (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test')
    ) {
      console.warn(`Failed to remove ${key} from localStorage:`, e)
    }
  }
}
