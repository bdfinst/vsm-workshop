import { useCallback, useRef } from 'react'
import { useSimulationStore } from '../stores/simulationStore'
import { SimulationService } from '../services/SimulationService'

export function useScenarioManager() {
  const serviceRef = useRef(null)

  const {
    scenarios,
    activeScenarioId,
    comparisonResults,
    removeScenario,
    setActiveScenario,
  } = useSimulationStore()

  // Initialize service once
  if (!serviceRef.current) {
    serviceRef.current = new SimulationService()
  }

  // Create scenario
  const createScenario = useCallback(() => {
    return serviceRef.current.createScenario()
  }, [])

  // Run scenario comparison
  const runComparison = useCallback(async (scenarioId) => {
    serviceRef.current.runComparison(scenarioId)
  }, [])

  return {
    scenarios,
    activeScenarioId,
    comparisonResults,
    createScenario,
    removeScenario,
    setActiveScenario,
    runComparison,
  }
}
