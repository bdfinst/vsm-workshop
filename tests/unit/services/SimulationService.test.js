import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSimulationService } from '../../../src/services/SimulationService.svelte.js'

/**
 * Creates a mock storeApi with all required methods
 */
const createMockStoreApi = (overrides = {}) => ({
  getSteps: () => [],
  getConnections: () => [],
  getWorkItemCount: () => 10,
  getIsRunning: () => false,
  getScenarios: () => [],
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
  addScenario: vi.fn(),
  setComparisonResults: vi.fn(),
  ...overrides,
})

/**
 * Creates a mock runner
 */
const createMockRunner = () => ({
  start: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  stop: vi.fn(),
})

describe('SimulationService', () => {
  let service
  let mockRunner
  let mockStoreApi

  beforeEach(() => {
    mockRunner = createMockRunner()
    mockStoreApi = createMockStoreApi()
  })

  describe('startSimulation', () => {
    it('does nothing when already running', () => {
      mockStoreApi.getIsRunning = () => true
      service = createSimulationService(mockRunner, mockStoreApi)

      service.startSimulation()

      expect(mockRunner.start).not.toHaveBeenCalled()
    })

    it('does nothing when no steps exist', () => {
      mockStoreApi.getSteps = () => []
      service = createSimulationService(mockRunner, mockStoreApi)

      service.startSimulation()

      expect(mockRunner.start).not.toHaveBeenCalled()
    })

    it('sets running state and starts runner with steps', () => {
      const steps = [
        { id: 'step-1', name: 'Dev', processTime: 60, leadTime: 240 },
      ]
      const connections = [{ id: 'c1', source: 'step-1', target: 'step-2' }]
      mockStoreApi.getSteps = () => steps
      mockStoreApi.getConnections = () => connections
      mockStoreApi.getWorkItemCount = () => 5
      service = createSimulationService(mockRunner, mockStoreApi)

      service.startSimulation()

      expect(mockStoreApi.setRunning).toHaveBeenCalledWith(true)
      expect(mockRunner.start).toHaveBeenCalledTimes(1)

      // Verify runner received initial state, steps, connections, and callbacks
      const [initialState, runSteps, runConns, callbacks] =
        mockRunner.start.mock.calls[0]
      expect(initialState).toBeDefined()
      expect(runSteps).toBe(steps)
      expect(runConns).toBe(connections)
      expect(typeof callbacks.onTick).toBe('function')
      expect(typeof callbacks.onComplete).toBe('function')
    })

    it('initializes store state on start', () => {
      const steps = [{ id: 's1', name: 'Step', processTime: 10, leadTime: 20 }]
      mockStoreApi.getSteps = () => steps
      service = createSimulationService(mockRunner, mockStoreApi)

      service.startSimulation()

      expect(mockStoreApi.updateWorkItems).toHaveBeenCalled()
      expect(mockStoreApi.updateQueueSizes).toHaveBeenCalled()
      expect(mockStoreApi.updateElapsedTime).toHaveBeenCalledWith(0)
      expect(mockStoreApi.setDetectedBottlenecks).toHaveBeenCalledWith([])
      expect(mockStoreApi.setResults).toHaveBeenCalledWith(null)
    })
  })

  describe('onTick callback', () => {
    it('updates work items, elapsed time, queues, and bottlenecks', () => {
      const steps = [{ id: 's1', name: 'Step', processTime: 10, leadTime: 20 }]
      mockStoreApi.getSteps = () => steps
      service = createSimulationService(mockRunner, mockStoreApi)
      service.startSimulation()

      // Reset mocks after start setup calls
      mockStoreApi.updateWorkItems.mockClear()
      mockStoreApi.updateElapsedTime.mockClear()
      mockStoreApi.updateQueueSizes.mockClear()
      mockStoreApi.setDetectedBottlenecks.mockClear()

      const callbacks = mockRunner.start.mock.calls[0][3]
      const tickState = {
        workItems: [{ id: 'w1' }],
        elapsedTime: 5,
        queueSizesByStepId: { s1: 3 },
        detectedBottlenecks: ['s1'],
        queueHistory: [{ tick: 1 }],
      }

      callbacks.onTick(tickState)

      expect(mockStoreApi.updateWorkItems).toHaveBeenCalledWith(tickState.workItems)
      expect(mockStoreApi.updateElapsedTime).toHaveBeenCalledWith(5)
      expect(mockStoreApi.updateQueueSizes).toHaveBeenCalledWith({ s1: 3 })
      expect(mockStoreApi.setDetectedBottlenecks).toHaveBeenCalledWith(['s1'])
    })

    it('throttles queue history writes to every 5 ticks', () => {
      const steps = [{ id: 's1', name: 'Step', processTime: 10, leadTime: 20 }]
      mockStoreApi.getSteps = () => steps
      service = createSimulationService(mockRunner, mockStoreApi)
      service.startSimulation()
      mockStoreApi.addQueueHistoryBatch.mockClear()

      const callbacks = mockRunner.start.mock.calls[0][3]
      const makeTick = (tick) => ({
        workItems: [],
        elapsedTime: tick,
        queueSizesByStepId: {},
        detectedBottlenecks: [],
        queueHistory: [{ tick }],
      })

      // Ticks 1-4: no flush
      for (let i = 1; i <= 4; i++) {
        callbacks.onTick(makeTick(i))
      }
      expect(mockStoreApi.addQueueHistoryBatch).not.toHaveBeenCalled()

      // Tick 5: flush
      callbacks.onTick(makeTick(5))
      expect(mockStoreApi.addQueueHistoryBatch).toHaveBeenCalledTimes(1)
      expect(mockStoreApi.addQueueHistoryBatch).toHaveBeenCalledWith(
        expect.arrayContaining([{ tick: 1 }, { tick: 5 }])
      )
    })
  })

  describe('onComplete callback', () => {
    it('flushes pending history, sets results, and stops running', () => {
      const steps = [{ id: 's1', name: 'Step', processTime: 10, leadTime: 20 }]
      mockStoreApi.getSteps = () => steps
      service = createSimulationService(mockRunner, mockStoreApi)
      service.startSimulation()
      mockStoreApi.addQueueHistoryBatch.mockClear()
      mockStoreApi.setRunning.mockClear()
      mockStoreApi.setResults.mockClear()

      const callbacks = mockRunner.start.mock.calls[0][3]

      // Simulate 2 ticks (not enough for flush)
      callbacks.onTick({
        workItems: [],
        elapsedTime: 1,
        queueSizesByStepId: {},
        detectedBottlenecks: [],
        queueHistory: [{ tick: 1 }],
      })
      callbacks.onTick({
        workItems: [],
        elapsedTime: 2,
        queueSizesByStepId: {},
        detectedBottlenecks: [],
        queueHistory: [{ tick: 2 }],
      })

      const finalResults = { completedCount: 10, avgLeadTime: 100 }
      callbacks.onComplete(finalResults)

      // Pending history flushed
      expect(mockStoreApi.addQueueHistoryBatch).toHaveBeenCalledWith(
        expect.arrayContaining([{ tick: 1 }, { tick: 2 }])
      )
      expect(mockStoreApi.setRunning).toHaveBeenCalledWith(false)
      expect(mockStoreApi.setResults).toHaveBeenCalledWith(finalResults)
    })
  })

  describe('pauseSimulation', () => {
    it('delegates to store and runner', () => {
      service = createSimulationService(mockRunner, mockStoreApi)

      service.pauseSimulation()

      expect(mockStoreApi.setPaused).toHaveBeenCalledWith(true)
      expect(mockRunner.pause).toHaveBeenCalled()
    })
  })

  describe('resumeSimulation', () => {
    it('delegates to store and runner', () => {
      service = createSimulationService(mockRunner, mockStoreApi)

      service.resumeSimulation()

      expect(mockStoreApi.setResumed).toHaveBeenCalled()
      expect(mockRunner.resume).toHaveBeenCalled()
    })
  })

  describe('resetSimulation', () => {
    it('stops runner and resets stores', () => {
      service = createSimulationService(mockRunner, mockStoreApi)

      service.resetSimulation()

      expect(mockRunner.stop).toHaveBeenCalled()
      expect(mockStoreApi.resetControl).toHaveBeenCalled()
      expect(mockStoreApi.resetData).toHaveBeenCalled()
    })
  })

  describe('createScenario', () => {
    it('creates scenario from current VSM state', () => {
      const steps = [{ id: 's1', name: 'Dev' }]
      const connections = [{ id: 'c1', source: 's1', target: 's2' }]
      mockStoreApi.getSteps = () => steps
      mockStoreApi.getConnections = () => connections
      mockStoreApi.getScenarios = () => []
      service = createSimulationService(mockRunner, mockStoreApi)

      const scenario = service.createScenario()

      expect(scenario.id).toBeDefined()
      expect(scenario.name).toBe('Scenario 1')
      expect(scenario.steps).toEqual([{ id: 's1', name: 'Dev' }])
      expect(scenario.connections).toEqual([{ id: 'c1', source: 's1', target: 's2' }])
      expect(mockStoreApi.addScenario).toHaveBeenCalledWith(scenario)
    })

    it('increments scenario name based on existing count', () => {
      mockStoreApi.getSteps = () => [{ id: 's1' }]
      mockStoreApi.getConnections = () => []
      mockStoreApi.getScenarios = () => [{ id: 'existing-1' }, { id: 'existing-2' }]
      service = createSimulationService(mockRunner, mockStoreApi)

      const scenario = service.createScenario()

      expect(scenario.name).toBe('Scenario 3')
    })
  })

  describe('runComparison', () => {
    it('does nothing for unknown scenario', () => {
      mockStoreApi.getScenarios = () => []
      service = createSimulationService(mockRunner, mockStoreApi)

      service.runComparison('nonexistent')

      expect(mockStoreApi.setComparisonResults).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('stops the runner', () => {
      service = createSimulationService(mockRunner, mockStoreApi)

      service.cleanup()

      expect(mockRunner.stop).toHaveBeenCalled()
    })
  })
})
