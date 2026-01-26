import { useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import { useVsmStore } from '../../stores/vsmStore'
import { useConnectionValidation } from '../../hooks/useConnectionValidation'

function ConnectionEditor({ connectionId, onClose }) {
  const { connections, steps, updateConnection, deleteConnection } = useVsmStore()
  const connection = connections.find((c) => c.id === connectionId)

  const [formData, setFormData] = useState({
    type: 'forward',
    reworkRate: 0,
  })

  // Track previous connection to sync form data when connection changes
  const [prevConnectionId, setPrevConnectionId] = useState(connectionId)
  if (connectionId !== prevConnectionId) {
    setPrevConnectionId(connectionId)
    if (connection) {
      setFormData({
        type: connection.type || 'forward',
        reworkRate: connection.reworkRate || 0,
      })
    }
  }

  // Initialize form data on first render if connection exists
  const [initialized, setInitialized] = useState(false)
  if (!initialized && connection) {
    setInitialized(true)
    setFormData({
      type: connection.type || 'forward',
      reworkRate: connection.reworkRate || 0,
    })
  }

  const { errors, validate, clearError } = useConnectionValidation(formData)

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

      updateConnection(connectionId, {
        type: formData.type,
        reworkRate: formData.type === 'rework' ? Number(formData.reworkRate) : 0,
      })
      onClose()
    },
    [connectionId, formData, validate, updateConnection, onClose]
  )

  const handleDelete = useCallback(() => {
    if (confirm('Delete this connection?')) {
      deleteConnection(connectionId)
      onClose()
    }
  }, [connectionId, deleteConnection, onClose])

  if (!connection) return null

  // Get source and target step names for display
  const sourceStep = steps.find((s) => s.id === connection.source)
  const targetStep = steps.find((s) => s.id === connection.target)

  return (
    <div
      className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto"
      data-testid="connection-editor"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Edit Connection</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          data-testid="close-connection-editor"
        >
          ✕
        </button>
      </div>

      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <div className="text-sm text-gray-600">
          <span className="font-medium">{sourceStep?.name || 'Unknown'}</span>
          <span className="mx-2">→</span>
          <span className="font-medium">{targetStep?.name || 'Unknown'}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Connection Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="connection-type-select"
          >
            <option value="forward">Forward (Normal Flow)</option>
            <option value="rework">Rework (Return Loop)</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {formData.type === 'forward'
              ? 'Normal workflow progression'
              : 'Items returning for corrections'}
          </p>
        </div>

        {formData.type === 'rework' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rework Rate (%)
            </label>
            <input
              type="number"
              value={formData.reworkRate}
              onChange={(e) => handleChange('reworkRate', e.target.value)}
              min={0}
              max={100}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.reworkRate ? 'border-red-500' : 'border-gray-300'
              }`}
              data-testid="rework-rate-input"
            />
            {errors.reworkRate && (
              <p className="mt-1 text-xs text-red-500">{errors.reworkRate}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Percentage of items that need to return for rework
            </p>
          </div>
        )}

        <div className="pt-4 flex gap-2">
          <button
            type="submit"
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            data-testid="save-connection-button"
          >
            Save
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="py-2 px-4 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
            data-testid="delete-connection-button"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  )
}

ConnectionEditor.propTypes = {
  connectionId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default ConnectionEditor
