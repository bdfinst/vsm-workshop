import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSimulationOrchestrator } from '../../../src/services/SimulationOrchestrator.js'

const createMockStoreApi = (overrides = {}) => ({
  getSteps: () => [],
  getConnections: () => [],
  getWorkItemCount: () => 10,
  getIsRunning: () => false,
  setRunning: vi.fn(),
  setPaused: vi.fn(),
  setResumed: vi.fn(),
  resetControl: vi.fn(),
  updateWorkItems: vi.fn(),
  updateQueueSizes: vi.fn(),
  updateElapsedTime: vi.fn(),
  setDetectedBottlenecks: vi.fn(),
  addQueueHistoryBatch: vi.fn(),
  setResults: vi.fn(),
  resetData: vi.fn(),
  ...overrides,
})

const createMockRunner = () => ({
  start: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  stop: vi.fn(),
})

const createMockInitializer = () => ({
  initialize: vi.fn(() => ({
    queueSizesByStepId: {},
    workItems: [],
    elapsedTime: 0,
  })),
})

describe('SimulationOrchestrator', () => {
  let runner
  let storeApi
  let initializer
  let orchestrator

  beforeEach(() => {
    runner = createMockRunner()
    storeApi = createMockStoreApi()
    initializer = createMockInitializer()
    orchestrator = createSimulationOrchestrator(runner, storeApi, initializer)
  })

  describe('startSimulation', () => {
    it('does nothing when already running', () => {
      storeApi.getIsRunning = () => true

      orchestrator.startSimulation()

      expect(runner.start).not.toHaveBeenCalled()
    })

    it('does nothing when no steps', () => {
      orchestrator.startSimulation()

      expect(runner.start).not.toHaveBeenCalled()
    })

    it('stops any previous run before starting', () => {
      const steps = [{ id: 's1', name: 'Dev' }]
      storeApi.getSteps = () => steps
      orchestrator = createSimulationOrchestrator(runner, storeApi, initializer)

      orchestrator.startSimulation()

      expect(runner.stop).toHaveBeenCalledBefore(runner.start)
    })

    it('delegates initialization and starts runner', () => {
      const steps = [{ id: 's1', name: 'Dev' }]
      storeApi.getSteps = () => steps
      storeApi.getConnections = () => []
      orchestrator = createSimulationOrchestrator(runner, storeApi, initializer)

      orchestrator.startSimulation()

      expect(storeApi.setRunning).toHaveBeenCalledWith(true)
      expect(initializer.initialize).toHaveBeenCalledWith(steps, [])
      expect(runner.start).toHaveBeenCalledTimes(1)
    })

    it('throttles queue history in onTick', () => {
      storeApi.getSteps = () => [{ id: 's1' }]
      orchestrator = createSimulationOrchestrator(runner, storeApi, initializer)
      orchestrator.startSimulation()

      // HISTORY_FLUSH_INTERVAL = 5 in SimulationOrchestrator
      const [, , , callbacks] = runner.start.mock.calls[0]
      expect(callbacks).toBeDefined()
      const makeTick = (tick) => ({
        workItems: [],
        elapsedTime: tick,
        queueSizesByStepId: {},
        detectedBottlenecks: [],
        queueHistory: [{ tick }],
      })

      for (let i = 1; i <= 4; i++) callbacks.onTick(makeTick(i))
      expect(storeApi.addQueueHistoryBatch).not.toHaveBeenCalled()

      callbacks.onTick(makeTick(5))
      expect(storeApi.addQueueHistoryBatch).toHaveBeenCalledTimes(1)
    })

    it('flushes pending history on complete and clears buffer', () => {
      storeApi.getSteps = () => [{ id: 's1' }]
      orchestrator = createSimulationOrchestrator(runner, storeApi, initializer)
      orchestrator.startSimulation()

      const [, , , callbacks] = runner.start.mock.calls[0]
      callbacks.onTick({
        workItems: [],
        elapsedTime: 1,
        queueSizesByStepId: {},
        detectedBottlenecks: [],
        queueHistory: [{ tick: 1 }],
      })

      const results = { completedCount: 10 }
      callbacks.onComplete(results)

      expect(storeApi.addQueueHistoryBatch).toHaveBeenCalledTimes(1)
      expect(storeApi.addQueueHistoryBatch).toHaveBeenCalledWith([{ tick: 1 }])
      expect(storeApi.setRunning).toHaveBeenCalledWith(false)
      expect(storeApi.setResults).toHaveBeenCalledWith(results)
    })
  })

  describe('pauseSimulation', () => {
    it('sets paused and pauses runner', () => {
      orchestrator.pauseSimulation()

      expect(storeApi.setPaused).toHaveBeenCalledWith(true)
      expect(runner.pause).toHaveBeenCalled()
    })
  })

  describe('resumeSimulation', () => {
    it('atomically sets resumed state and resumes runner', () => {
      orchestrator.resumeSimulation()

      expect(storeApi.setResumed).toHaveBeenCalled()
      expect(runner.resume).toHaveBeenCalled()
    })
  })

  describe('resetSimulation', () => {
    it('stops runner and resets both stores', () => {
      orchestrator.resetSimulation()

      expect(runner.stop).toHaveBeenCalled()
      expect(storeApi.resetControl).toHaveBeenCalled()
      expect(storeApi.resetData).toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('stops the runner', () => {
      orchestrator.cleanup()

      expect(runner.stop).toHaveBeenCalled()
    })
  })
})
