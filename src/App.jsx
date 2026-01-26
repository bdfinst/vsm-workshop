import { useCallback } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { useAppState } from './hooks/useAppState'
import Header from './components/ui/Header'
import Canvas from './components/canvas/Canvas'
import Sidebar from './components/ui/Sidebar'
import MetricsDashboard from './components/metrics/MetricsDashboard'
import WelcomeScreen from './components/ui/WelcomeScreen'
import EditorPanel from './components/ui/EditorPanel'
import SimulationPanel from './components/ui/SimulationPanel'
import { SimulationControls } from './components/simulation/SimulationControls'

function App() {
  const {
    hasVsm,
    selectedStepId,
    isEditing,
    setEditing,
    clearSelection,
    selectedConnectionId,
    isEditingConnection,
    clearConnectionSelection,
    simulationResults,
    simulationScenarios,
    comparisonResults,
  } = useAppState()

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

  if (!hasVsm) {
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
            <SimulationPanel
              simulationResults={simulationResults}
              simulationScenarios={simulationScenarios}
              comparisonResults={comparisonResults}
            />
            <MetricsDashboard />
          </main>
          <EditorPanel
            selectedStepId={selectedStepId}
            isEditing={isEditing}
            selectedConnectionId={selectedConnectionId}
            isEditingConnection={isEditingConnection}
            onCloseEditor={handleCloseEditor}
            onCloseConnectionEditor={handleCloseConnectionEditor}
          />
        </div>
      </div>
    </ReactFlowProvider>
  )
}

export default App
