/**
 * createReactiveStore - Experimental generic store factory
 * Spike to determine if shared store boilerplate can be extracted.
 *
 * Attempts to use $state() dynamically to create reactive getters/setters
 * from a schema definition.
 */

/**
 * Create a reactive store from a schema
 * @param {Object} schema - { fieldName: defaultValue } pairs
 * @param {Object} [options] - { actions: (state) => ({...}) } for custom actions
 * @returns {Object} Store with reactive getters, setters, and reset
 */
export const createReactiveStore = (schema, options = {}) => {
  const fields = Object.keys(schema)
  const defaults = { ...schema }

  // Attempt to create $state for each field dynamically
  const state = $state({ ...schema })

  const store = {}

  // Create reactive getters
  for (const field of fields) {
    Object.defineProperty(store, field, {
      get() {
        return state[field]
      },
      enumerable: true,
    })
  }

  // Create setter for each field: setFieldName(value)
  for (const field of fields) {
    const setterName = `set${field.charAt(0).toUpperCase()}${field.slice(1)}`
    store[setterName] = (value) => {
      state[field] = value
    }
  }

  // Reset function
  store.reset = () => {
    for (const field of fields) {
      state[field] = defaults[field]
    }
  }

  // Apply custom actions if provided
  if (options.actions) {
    const actions = options.actions(state)
    Object.assign(store, actions)
  }

  return store
}
