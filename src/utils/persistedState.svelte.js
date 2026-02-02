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
 * @returns {*} - The reactive state value (read from localStorage or initial)
 */
export function getPersistedValue(key, initialValue) {
  if (!isLocalStorageAvailable()) {
    return initialValue
  }

  try {
    const stored = localStorage.getItem(key)
    if (stored !== null) {
      const parsed = JSON.parse(stored)

      // Validate VSM data structure
      if (key === 'vsm-data-storage') {
        // Import validation only when needed
        if (typeof window !== 'undefined') {
          return validateAndSanitizeVSMData(parsed)
        }
      }

      return parsed
    }
  } catch (e) {
    // Silent fail in test environment
    if (
      import.meta.env.DEV &&
      typeof process === 'undefined' ||
      process.env?.NODE_ENV !== 'test'
    ) {
      console.warn(`Failed to read ${key} from localStorage:`, e)
    }
  }

  return initialValue
}

/**
 * Validate and sanitize VSM data
 * @param {*} data - Data to validate
 * @returns {Object} Sanitized data
 */
function validateAndSanitizeVSMData(data) {
  if (!data || typeof data !== 'object') {
    return {
      id: null,
      name: '',
      description: '',
      steps: [],
      connections: [],
      createdAt: null,
      updatedAt: null,
    }
  }

  // Ensure required structure with safe defaults
  return {
    id: data.id || null,
    name: data.name || '',
    description: data.description || '',
    steps: Array.isArray(data.steps) ? data.steps : [],
    connections: Array.isArray(data.connections) ? data.connections : [],
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  }
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
      typeof process === 'undefined' ||
      process.env?.NODE_ENV !== 'test'
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
      typeof process === 'undefined' ||
      process.env?.NODE_ENV !== 'test'
    ) {
      console.warn(`Failed to remove ${key} from localStorage:`, e)
    }
  }
}
