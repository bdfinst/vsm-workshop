import { useState, useCallback } from 'react'
import { validateStep } from '../utils/validation/stepValidator'

/**
 * Custom hook for managing step form validation
 * @param {Object} formData - The form data to validate
 * @returns {Object} Validation state and methods
 */
export function useStepValidation(formData) {
  const [errors, setErrors] = useState({})

  const validate = useCallback(() => {
    const validationResult = validateStep(formData)
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
