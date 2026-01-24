import { useState, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { useVsmStore } from '../../stores/vsmStore'

function WelcomeScreen() {
  const { createNewMap, loadExample, importFromJson } = useVsmStore()
  const [mapName, setMapName] = useState('')
  const fileInputRef = useRef(null)

  const handleCreate = useCallback(
    (e) => {
      e.preventDefault()
      const name = mapName.trim() || 'My Value Stream'
      createNewMap(name)
    },
    [mapName, createNewMap]
  )

  const handleStartWithExample = useCallback(() => {
    loadExample()
  }, [loadExample])

  const handleImport = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        const result = importFromJson(event.target.result)
        if (!result) {
          alert('Failed to import file. Please check the format.')
        }
      }
      reader.readAsText(file)
    },
    [importFromJson]
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <span className="text-6xl mb-4 block">🗺️</span>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">VSM Workshop</h1>
          <p className="text-gray-600">
            Create value stream maps to visualize and improve your delivery
            process
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleCreate}>
            <label className="block mb-4">
              <span className="text-sm font-medium text-gray-700">Map Name</span>
              <input
                type="text"
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                placeholder="e.g., Feature Delivery Process"
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="new-map-name-input"
                autoFocus
              />
            </label>
            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              data-testid="create-map-button"
            >
              Create Blank Map
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          <button
            onClick={handleStartWithExample}
            className="w-full py-3 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors mb-3"
            data-testid="start-with-example-button"
          >
            Start with Example Map
          </button>

          <p className="text-xs text-gray-500 text-center mb-4">
            A pre-built software delivery value stream with sample data
          </p>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          <button
            onClick={handleImport}
            className="w-full py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            data-testid="import-map-button"
          >
            Import Existing Map
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Value stream mapping helps teams visualize their workflow, identify
            bottlenecks, and improve flow efficiency.
          </p>
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen
