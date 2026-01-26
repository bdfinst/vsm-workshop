import { useSimulationStore } from '../stores/simulationStore'

export function useSimulationState() {
  const {
    workItems,
    completedCount,
    elapsedTime,
    queueSizesByStepId,
    detectedBottlenecks,
    results,
  } = useSimulationStore()

  return {
    workItems,
    completedCount,
    elapsedTime,
    queueSizesByStepId,
    detectedBottlenecks,
    results,
  }
}
