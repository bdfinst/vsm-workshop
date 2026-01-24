import { useCallback } from 'react'
import PropTypes from 'prop-types'
import { useVsmStore } from '../../stores/vsmStore'

function Sidebar() {
  const { addStep, selectStep, setEditing } = useVsmStore()

  const handleAddStep = useCallback(() => {
    const step = addStep('New Step')
    selectStep(step.id)
    setEditing(true)
  }, [addStep, selectStep, setEditing])

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <button
        onClick={handleAddStep}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        data-testid="add-step-button"
      >
        <span className="text-xl">+</span>
        <span>Add Step</span>
      </button>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          How to Use
        </h2>
        <div className="text-xs text-gray-600 space-y-3">
          <p>
            <strong>Add Step</strong> to create a new process step
          </p>
          <p>
            <strong>Click</strong> a step to select it
          </p>
          <p>
            <strong>Double-click</strong> a step to edit it
          </p>
          <p>
            <strong>Drag</strong> from handles to connect steps
          </p>
          <p>
            <strong>Delete</strong> key removes selected step
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Glossary
        </h2>
        <dl className="text-xs text-gray-600 space-y-2">
          <div>
            <dt className="font-semibold">PT (Process Time)</dt>
            <dd>Actual hands-on work time</dd>
          </div>
          <div>
            <dt className="font-semibold">LT (Lead Time)</dt>
            <dd>Total elapsed time including wait</dd>
          </div>
          <div>
            <dt className="font-semibold">%C&A</dt>
            <dd>Percent Complete & Accurate - quality passing to next step</dd>
          </div>
          <div>
            <dt className="font-semibold">Flow Efficiency</dt>
            <dd>PT ÷ LT - how much time is actual work vs waiting</dd>
          </div>
        </dl>
      </div>
    </aside>
  )
}

export default Sidebar
