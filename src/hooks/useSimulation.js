import { useCallback, useEffect, useRef } from 'react'
import { useSimulationStore } from '../stores/simulationStore'
import { useVsmStore } from '../stores/vsmStore'
import {
  initSimulation,
  generateWorkItems,
  processTick,
  calculateResults,
} from '../utils/simulation/simulationEngine'

export function useSimulation() {
  const animationRef = useRef(null)
  const stateRef = useRef(null)

  const steps = useVsmStore((state) => state.steps)
  const connections = useVsmStore((state) => state.connections)

  const {
    isRunning,
    isPaused,
    speed,
    workItemCount,
    workItems,
    completedCount,
    elapsedTime,
    queueSizes,
    detectedBottlenecks,
    results,
    scenarios,
    activeScenarioId,
    comparisonResults,
    setRunning,
    setPaused,
    setSpeed,
    setWorkItemCount,
    updateWorkItems,
    updateElapsedTime,
    updateQueueSizes,
    setDetectedBottlenecks,
    addQueueHistoryEntry,
    setResults,
    reset,
    addScenario,
    removeScenario,
    setActiveScenario,
    setComparisonResults,
  } = useSimulationStore()

  // Initialize simulation state ref
  useEffect(() => {
    stateRef.current = {
      isRunning,
      isPaused,
      speed,
      workItemCount,
      workItems,
      completedCount,
      elapsedTime,
      queueSizes,
      detectedBottlenecks,
    }
  }, [
    isRunning,
    isPaused,
    speed,
    workItemCount,
    workItems,
    completedCount,
    elapsedTime,
    queueSizes,
    detectedBottlenecks,
  ])

  // Animation loop
  const animate = useCallback(() => {
    if (!stateRef.current?.isRunning || stateRef.current?.isPaused) {
      return
    }

    const currentState = {
      ...stateRef.current,
      queueHistory: [],
    }

    const newState = processTick(currentState, steps, connections)

    // Update store
    updateWorkItems(newState.workItems)
    updateElapsedTime(newState.elapsedTime)
    updateQueueSizes(newState.queueSizes)
    setDetectedBottlenecks(newState.detectedBottlenecks)

    // Record queue history
    newState.queueHistory.forEach((entry) => {
      addQueueHistoryEntry(entry)
    })

    // Check if simulation is complete
    if (newState.completedCount >= newState.workItemCount) {
      setRunning(false)
      const finalResults = calculateResults(newState, steps)
      setResults(finalResults)
      return
    }

    // Update state ref for next frame
    stateRef.current = newState

    animationRef.current = requestAnimationFrame(animate)
  }, [
    steps,
    connections,
    updateWorkItems,
    updateElapsedTime,
    updateQueueSizes,
    setDetectedBottlenecks,
    addQueueHistoryEntry,
    setRunning,
    setResults,
  ])

  // Start/stop animation loop
  useEffect(() => {
    if (isRunning && !isPaused) {
      animationRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isRunning, isPaused, animate])

  // Start simulation
  const start = useCallback(() => {
    if (steps.length === 0) return

    const initialState = initSimulation(steps, connections, { workItemCount })
    const firstStepId = steps[0]?.id
    const items = generateWorkItems(workItemCount, firstStepId)

    updateWorkItems(items)
    updateQueueSizes(initialState.queueSizes)
    updateElapsedTime(0)
    setDetectedBottlenecks([])
    setResults(null)
    setRunning(true)
  }, [
    steps,
    connections,
    workItemCount,
    updateWorkItems,
    updateQueueSizes,
    updateElapsedTime,
    setDetectedBottlenecks,
    setResults,
    setRunning,
  ])

  // Pause simulation
  const pause = useCallback(() => {
    setPaused(true)
  }, [setPaused])

  // Resume simulation
  const resume = useCallback(() => {
    setPaused(false)
    setRunning(true)
  }, [setPaused, setRunning])

  // Reset simulation
  const resetSimulation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    reset()
  }, [reset])

  // Create scenario
  const createScenario = useCallback(() => {
    const scenario = {
      id: crypto.randomUUID(),
      name: `Scenario ${scenarios.length + 1}`,
      steps: steps.map((s) => ({ ...s })),
      connections: connections.map((c) => ({ ...c })),
      results: null,
    }
    addScenario(scenario)
    return scenario
  }, [steps, connections, scenarios.length, addScenario])

  // Run scenario comparison
  const runComparison = useCallback(
    async (scenarioId) => {
      const scenario = scenarios.find((s) => s.id === scenarioId)
      if (!scenario) return

      // Run baseline simulation
      const baselineState = initSimulation(steps, connections, { workItemCount })
      baselineState.workItems = generateWorkItems(workItemCount, steps[0]?.id)
      baselineState.isRunning = true

      let baseState = baselineState
      let ticks = 0
      while (baseState.completedCount < workItemCount && ticks < 10000) {
        baseState = processTick(baseState, steps, connections)
        ticks++
      }
      const baselineResults = calculateResults(baseState, steps)

      // Run scenario simulation
      const scenarioState = initSimulation(scenario.steps, scenario.connections, {
        workItemCount,
      })
      scenarioState.workItems = generateWorkItems(
        workItemCount,
        scenario.steps[0]?.id
      )
      scenarioState.isRunning = true

      let scenState = scenarioState
      ticks = 0
      while (scenState.completedCount < workItemCount && ticks < 10000) {
        scenState = processTick(scenState, scenario.steps, scenario.connections)
        ticks++
      }
      const scenarioResults = calculateResults(scenState, scenario.steps)

      // Calculate improvements
      const leadTimeImprovement =
        baselineResults.avgLeadTime > 0
          ? ((baselineResults.avgLeadTime - scenarioResults.avgLeadTime) /
              baselineResults.avgLeadTime) *
            100
          : 0

      const throughputImprovement =
        baselineResults.throughput > 0
          ? ((scenarioResults.throughput - baselineResults.throughput) /
              baselineResults.throughput) *
            100
          : 0

      setComparisonResults({
        baseline: baselineResults,
        scenario: scenarioResults,
        improvements: {
          leadTime: leadTimeImprovement,
          throughput: throughputImprovement,
        },
      })
    },
    [
      steps,
      connections,
      scenarios,
      workItemCount,
      setComparisonResults,
    ]
  )

  return {
    // State
    isRunning,
    isPaused,
    speed,
    workItemCount,
    workItems,
    completedCount,
    elapsedTime,
    queueSizes,
    detectedBottlenecks,
    results,
    scenarios,
    activeScenarioId,
    comparisonResults,

    // Actions
    start,
    pause,
    resume,
    reset: resetSimulation,
    setSpeed,
    setWorkItemCount,
    createScenario,
    removeScenario,
    setActiveScenario,
    runComparison,
  }
}
