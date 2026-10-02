/**
 * Wrap collected errors in the validators' result shape.
 * @param {Object<string, string>} errors - Field (or path) to message
 * @returns {{valid: boolean, errors: Object<string, string>}}
 */
export const toResult = (errors) => ({
  valid: Object.keys(errors).length === 0,
  errors,
})

/**
 * Collect errors into one object. `set` ignores an empty message, so a check
 * that returns `null` when valid can be passed straight in. `addAll` copies a
 * nested result's errors under `prefix.`.
 * @returns {{errors: Object<string, string>, set: function(string, ?string): void, addAll: function(string, {errors: Object<string, string>}): void}}
 */
export const createErrorCollector = () => {
  const errors = {}
  return {
    errors,
    set: (field, message) => {
      if (message) errors[field] = message
    },
    addAll: (prefix, result) => {
      for (const [field, message] of Object.entries(result.errors)) {
        errors[`${prefix}.${field}`] = message
      }
    },
  }
}

export const isRecord = (value) => value !== null && typeof value === 'object'
