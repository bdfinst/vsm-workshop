import { useState, useCallback } from 'react'
import { validateConnection } from '../utils/validation/connectionValidator'

/**
 * Custom hook for managing connection form validation
 * @param {Object} formData - The form data to validate
 * @returns {Object} Validation state and methods
 */
export function useConnectionValidation(formData) {
  const [errors, setErrors] = useState({})

  const validate = useCallback(() => {
    const validationResult = validateConnection(formData)
    setErrors(validationResult.errors)
    return validationResult.valid
  }, [formData])

  const clearError = useCallback((field) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }, [])

  const clearAllErrors = useCallback(() => {
    setErrors({})
  }, [])

  return {
    errors,
    validate,
    clearError,
    clearAllErrors,
  }
}
