/**
 * VsmLocalStorageRepository
 * Dedicated persistence layer for VSM data using localStorage
 * Extracted from vsmDataStore to separate infrastructure from domain
 */

import {
  getPersistedValue,
  persistValue,
  clearPersistedValue,
} from '../utils/persistedState.js'

/**
 * Create a localStorage repository for VSM data
 * @param {string} storageKey - localStorage key to use
 * @returns {Object} Repository with save, load, and clear methods
 */
export const createVsmLocalStorageRepository = (storageKey) => {
  /**
   * Save VSM data to localStorage
   * @param {Object} data - VSM data to persist
   */
  const save = (data) => {
    persistValue(storageKey, data)
  }

  /**
   * Load VSM data from localStorage
   * @param {Object} defaults - Default value if nothing stored
   * @param {Function} [sanitize] - Optional sanitizer for loaded data
   * @returns {Object} Loaded data or defaults
   */
  const load = (defaults, sanitize) => {
    return getPersistedValue(storageKey, defaults, sanitize)
  }

  /**
   * Clear persisted VSM data
   */
  const clear = () => {
    clearPersistedValue(storageKey)
  }

  return { save, load, clear }
}

/** Default singleton repository for the VSM data store */
export const vsmLocalStorageRepo = createVsmLocalStorageRepository('vsm-data-storage')
