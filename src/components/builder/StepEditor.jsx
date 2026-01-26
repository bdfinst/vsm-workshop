import { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { useVsmStore } from '../../stores/vsmStore'
import { STEP_TYPES, STEP_TYPE_CONFIG } from '../../data/stepTypes'
import { useStepValidation } from '../../hooks/useStepValidation'

function StepEditor({ stepId, onClose }) {
  const { steps, updateStep, deleteStep } = useVsmStore()
  const step = steps.find((s) => s.id === stepId)

  const [formData, setFormData] = useState({
    name: '',
    type: STEP_TYPES.CUSTOM,
    description: '',
    processTime: 0,
    leadTime: 0,
    percentCompleteAccurate: 100,
    queueSize: 0,
    batchSize: 1,
    peopleCount: 1,
  })

  const { errors, validate, clearError } = useStepValidation(formData)

  useEffect(() => {
    if (step) {
      setFormData({
        name: step.name,
        type: step.type,
        description: step.description || '',
        processTime: step.processTime,
        leadTime: step.leadTime,
        percentCompleteAccurate: step.percentCompleteAccurate,
        queueSize: step.queueSize,
        batchSize: step.batchSize,
        peopleCount: step.peopleCount || 1,
      })
    }
  }, [step])

  const handleChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      clearError(field)
    },
    [clearError]
  )

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault()
      if (!validate()) return

      updateStep(stepId, {
        ...formData,
        processTime: Number(formData.processTime),
        leadTime: Number(formData.leadTime),
        percentCompleteAccurate: Number(formData.percentCompleteAccurate),
        queueSize: Number(formData.queueSize),
        batchSize: Number(formData.batchSize),
        peopleCount: Number(formData.peopleCount),
      })
      onClose()
    },
    [stepId, formData, validate, updateStep, onClose]
  )

  const handleDelete = useCallback(() => {
    if (confirm('Delete this step?')) {
      deleteStep(stepId)
      onClose()
    }
  }, [stepId, deleteStep, onClose])

  if (!step) return null

  const config = STEP_TYPE_CONFIG[formData.type]

  return (
    <div
      className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto"
      data-testid="step-editor"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Edit Step</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          data-testid="close-editor"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Step Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            data-testid="step-name-input"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Step Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="step-type-select"
          >
            {Object.entries(STEP_TYPE_CONFIG).map(([type, cfg]) => (
              <option key={type} value={type}>
                {cfg.icon} {cfg.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="step-description-input"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Process Time (min)
            </label>
            <input
              type="number"
              value={formData.processTime}
              onChange={(e) => handleChange('processTime', e.target.value)}
              min={0}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.processTime ? 'border-red-500' : 'border-gray-300'
              }`}
              data-testid="process-time-input"
            />
            {errors.processTime && (
              <p className="mt-1 text-xs text-red-500">{errors.processTime}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lead Time (min)
            </label>
            <input
              type="number"
              value={formData.leadTime}
              onChange={(e) => handleChange('leadTime', e.target.value)}
              min={0}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.leadTime ? 'border-red-500' : 'border-gray-300'
              }`}
              data-testid="lead-time-input"
            />
            {errors.leadTime && (
              <p className="mt-1 text-xs text-red-500">{errors.leadTime}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            % Complete & Accurate
          </label>
          <input
            type="number"
            value={formData.percentCompleteAccurate}
            onChange={(e) =>
              handleChange('percentCompleteAccurate', e.target.value)
            }
            min={0}
            max={100}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.percentCompleteAccurate
                ? 'border-red-500'
                : 'border-gray-300'
            }`}
            data-testid="percent-ca-input"
          />
          {errors.percentCompleteAccurate && (
            <p className="mt-1 text-xs text-red-500">
              {errors.percentCompleteAccurate}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Queue Size
            </label>
            <input
              type="number"
              value={formData.queueSize}
              onChange={(e) => handleChange('queueSize', e.target.value)}
              min={0}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.queueSize ? 'border-red-500' : 'border-gray-300'
              }`}
              data-testid="queue-size-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Batch Size
            </label>
            <input
              type="number"
              value={formData.batchSize}
              onChange={(e) => handleChange('batchSize', e.target.value)}
              min={1}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.batchSize ? 'border-red-500' : 'border-gray-300'
              }`}
              data-testid="batch-size-input"
            />
          </div>
        </div>

        <div className="pt-4 flex gap-2">
          <button
            type="submit"
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            data-testid="save-step-button"
          >
            Save
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="py-2 px-4 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
            data-testid="delete-step-button"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  )
}

StepEditor.propTypes = {
  stepId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default StepEditor
