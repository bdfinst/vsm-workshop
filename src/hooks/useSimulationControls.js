import { useCallback, useEffect, useRef } from 'react'
import { useSimulationStore } from '../stores/simulationStore'
import { SimulationService } from '../services/SimulationService'

export function useSimulationControls() {
  const serviceRef = useRef(null)

  const {
    isRunning,
    isPaused,
    speed,
    workItemCount,
    setSpeed,
    setWorkItemCount,
  } = useSimulationStore()

  // Initialize service once
  if (!serviceRef.current) {
    serviceRef.current = new SimulationService()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (serviceRef.current) {
        serviceRef.current.cleanup()
      }
    }
  }, [])

  // Start simulation
  const start = useCallback(() => {
    serviceRef.current.startSimulation()
  }, [])

  // Pause simulation
  const pause = useCallback(() => {
    serviceRef.current.pauseSimulation()
  }, [])

  // Resume simulation
  const resume = useCallback(() => {
    serviceRef.current.resumeSimulation()
  }, [])

  // Reset simulation
  const resetSimulation = useCallback(() => {
    serviceRef.current.resetSimulation()
  }, [])

  return {
    isRunning,
    isPaused,
    speed,
    workItemCount,
    start,
    pause,
    resume,
    reset: resetSimulation,
    setSpeed,
    setWorkItemCount,
  }
}
