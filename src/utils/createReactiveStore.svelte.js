/**
 * createReactiveStore - Generic store factory
 * Creates reactive Svelte 5 stores from a schema definition,
 * generating getters, setters, and a reset function automatically.
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

  // Merge custom actions onto the store object.
  // Object.assign is intentional here — spreading would flatten the
  // defineProperty getters into static values, breaking reactivity.
  if (options.actions) {
    const actions = options.actions(state)
    Object.assign(store, actions)
  }

  return store
}
