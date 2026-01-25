import { useCallback } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { useVsmStore } from './stores/vsmStore'
import Header from './components/ui/Header'
import Canvas from './components/canvas/Canvas'
import Sidebar from './components/ui/Sidebar'
import MetricsDashboard from './components/metrics/MetricsDashboard'
import WelcomeScreen from './components/ui/WelcomeScreen'
import StepEditor from './components/builder/StepEditor'
import ConnectionEditor from './components/builder/ConnectionEditor'
import { SimulationControls } from './components/simulation/SimulationControls'
import { SimulationResults } from './components/simulation/SimulationResults'
import { ScenarioComparison } from './components/simulation/ScenarioComparison'
import { useSimulation } from './hooks/useSimulation'

function App() {
  const {
    id,
    selectedStepId,
    isEditing,
    setEditing,
    clearSelection,
    selectedConnectionId,
    isEditingConnection,
    clearConnectionSelection,
  } = useVsmStore()

  const { results, scenarios, comparisonResults } = useSimulation()

  const handleCanvasClick = useCallback(() => {
    if (isEditing || isEditingConnection) return
    clearSelection()
    clearConnectionSelection()
  }, [isEditing, isEditingConnection, clearSelection, clearConnectionSelection])

  const handleCloseEditor = useCallback(() => {
    setEditing(false)
    clearSelection()
  }, [setEditing, clearSelection])

  const handleCloseConnectionEditor = useCallback(() => {
    clearConnectionSelection()
  }, [clearConnectionSelection])

  if (!id) {
    return <WelcomeScreen />
  }

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-gray-100">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <main className="flex-1 flex flex-col" onClick={handleCanvasClick}>
            <SimulationControls />
            <div className="flex-1 relative">
              <Canvas />
            </div>
            {results && <SimulationResults />}
            {(scenarios.length > 0 || comparisonResults) && <ScenarioComparison />}
            <MetricsDashboard />
          </main>
          {selectedStepId && isEditing && (
            <StepEditor stepId={selectedStepId} onClose={handleCloseEditor} />
          )}
          {selectedConnectionId && isEditingConnection && (
            <ConnectionEditor
              connectionId={selectedConnectionId}
              onClose={handleCloseConnectionEditor}
            />
          )}
        </div>
      </div>
    </ReactFlowProvider>
  )
}

export default App
