import { describe, it, expect, beforeEach } from 'vitest'
import { useSimulationStore } from '../../../src/stores/simulationStore'

describe('simulationStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSimulationStore.setState({
      isRunning: false,
      isPaused: false,
      speed: 1.0,
      workItemCount: 10,
      workItems: [],
      completedCount: 0,
      elapsedTime: 0,
      queueSizes: {},
      queueHistory: [],
      detectedBottlenecks: [],
      results: null,
      scenarios: [],
      activeScenarioId: null,
      comparisonResults: null,
    })
  })

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useSimulationStore.getState()

      expect(state.isRunning).toBe(false)
      expect(state.isPaused).toBe(false)
      expect(state.speed).toBe(1.0)
      expect(state.workItemCount).toBe(10)
      expect(state.workItems).toEqual([])
      expect(state.completedCount).toBe(0)
    })
  })

  describe('setRunning', () => {
    it('sets isRunning to true', () => {
      const { setRunning } = useSimulationStore.getState()

      setRunning(true)

      expect(useSimulationStore.getState().isRunning).toBe(true)
    })

    it('clears isPaused when starting', () => {
      useSimulationStore.setState({ isPaused: true })
      const { setRunning } = useSimulationStore.getState()

      setRunning(true)

      expect(useSimulationStore.getState().isPaused).toBe(false)
    })
  })

  describe('setPaused', () => {
    it('sets isPaused to true', () => {
      const { setPaused } = useSimulationStore.getState()

      setPaused(true)

      expect(useSimulationStore.getState().isPaused).toBe(true)
    })

    it('sets isRunning to false when pausing', () => {
      useSimulationStore.setState({ isRunning: true })
      const { setPaused } = useSimulationStore.getState()

      setPaused(true)

      expect(useSimulationStore.getState().isRunning).toBe(false)
    })
  })

  describe('setSpeed', () => {
    it('sets simulation speed', () => {
      const { setSpeed } = useSimulationStore.getState()

      setSpeed(2.0)

      expect(useSimulationStore.getState().speed).toBe(2.0)
    })

    it('clamps speed to minimum of 0.25', () => {
      const { setSpeed } = useSimulationStore.getState()

      setSpeed(0.1)

      expect(useSimulationStore.getState().speed).toBe(0.25)
    })

    it('clamps speed to maximum of 4.0', () => {
      const { setSpeed } = useSimulationStore.getState()

      setSpeed(10)

      expect(useSimulationStore.getState().speed).toBe(4.0)
    })
  })

  describe('setWorkItemCount', () => {
    it('sets work item count', () => {
      const { setWorkItemCount } = useSimulationStore.getState()

      setWorkItemCount(20)

      expect(useSimulationStore.getState().workItemCount).toBe(20)
    })

    it('does not allow negative values', () => {
      const { setWorkItemCount } = useSimulationStore.getState()

      setWorkItemCount(-5)

      expect(useSimulationStore.getState().workItemCount).toBe(0)
    })
  })

  describe('updateWorkItems', () => {
    it('updates work items array', () => {
      const { updateWorkItems } = useSimulationStore.getState()
      const items = [{ id: '1', progress: 50 }]

      updateWorkItems(items)

      expect(useSimulationStore.getState().workItems).toEqual(items)
    })
  })

  describe('incrementCompletedCount', () => {
    it('increments completed count', () => {
      const { incrementCompletedCount } = useSimulationStore.getState()

      incrementCompletedCount()
      incrementCompletedCount()

      expect(useSimulationStore.getState().completedCount).toBe(2)
    })
  })

  describe('updateQueueSizes', () => {
    it('updates queue sizes map', () => {
      const { updateQueueSizes } = useSimulationStore.getState()
      const queueSizes = { 'step-1': 5, 'step-2': 3 }

      updateQueueSizes(queueSizes)

      expect(useSimulationStore.getState().queueSizes).toEqual(queueSizes)
    })
  })

  describe('addQueueHistoryEntry', () => {
    it('adds entry to queue history', () => {
      const { addQueueHistoryEntry } = useSimulationStore.getState()
      const entry = { tick: 1, stepId: 'step-1', queueSize: 5 }

      addQueueHistoryEntry(entry)

      expect(useSimulationStore.getState().queueHistory).toContainEqual(entry)
    })
  })

  describe('setDetectedBottlenecks', () => {
    it('updates detected bottlenecks array', () => {
      const { setDetectedBottlenecks } = useSimulationStore.getState()
      const bottlenecks = ['step-1', 'step-2']

      setDetectedBottlenecks(bottlenecks)

      expect(useSimulationStore.getState().detectedBottlenecks).toEqual(bottlenecks)
    })
  })

  describe('setResults', () => {
    it('sets simulation results', () => {
      const { setResults } = useSimulationStore.getState()
      const results = {
        completedCount: 10,
        avgLeadTime: 150,
        throughput: 0.5,
        bottlenecks: [],
      }

      setResults(results)

      expect(useSimulationStore.getState().results).toEqual(results)
    })
  })

  describe('reset', () => {
    it('resets all simulation state', () => {
      useSimulationStore.setState({
        isRunning: true,
        isPaused: true,
        completedCount: 10,
        workItems: [{ id: '1' }],
        elapsedTime: 100,
        queueHistory: [{ tick: 1 }],
      })

      const { reset } = useSimulationStore.getState()
      reset()

      const state = useSimulationStore.getState()
      expect(state.isRunning).toBe(false)
      expect(state.isPaused).toBe(false)
      expect(state.completedCount).toBe(0)
      expect(state.workItems).toEqual([])
      expect(state.elapsedTime).toBe(0)
      expect(state.queueHistory).toEqual([])
    })

    it('preserves workItemCount on reset', () => {
      useSimulationStore.setState({ workItemCount: 25 })

      const { reset } = useSimulationStore.getState()
      reset()

      expect(useSimulationStore.getState().workItemCount).toBe(25)
    })
  })

  describe('scenarios', () => {
    describe('addScenario', () => {
      it('adds a new scenario', () => {
        const { addScenario } = useSimulationStore.getState()
        const scenario = {
          id: 'scenario-1',
          name: 'Test Scenario',
          steps: [],
          connections: [],
        }

        addScenario(scenario)

        expect(useSimulationStore.getState().scenarios).toContainEqual(scenario)
      })
    })

    describe('removeScenario', () => {
      it('removes a scenario by id', () => {
        useSimulationStore.setState({
          scenarios: [
            { id: 'scenario-1', name: 'Test 1' },
            { id: 'scenario-2', name: 'Test 2' },
          ],
        })

        const { removeScenario } = useSimulationStore.getState()
        removeScenario('scenario-1')

        const scenarios = useSimulationStore.getState().scenarios
        expect(scenarios).toHaveLength(1)
        expect(scenarios[0].id).toBe('scenario-2')
      })
    })

    describe('setActiveScenario', () => {
      it('sets the active scenario id', () => {
        const { setActiveScenario } = useSimulationStore.getState()

        setActiveScenario('scenario-1')

        expect(useSimulationStore.getState().activeScenarioId).toBe('scenario-1')
      })
    })

    describe('setComparisonResults', () => {
      it('sets comparison results', () => {
        const { setComparisonResults } = useSimulationStore.getState()
        const comparison = {
          baseline: { avgLeadTime: 100 },
          scenario: { avgLeadTime: 80 },
          improvement: { leadTime: 20 },
        }

        setComparisonResults(comparison)

        expect(useSimulationStore.getState().comparisonResults).toEqual(comparison)
      })
    })
  })
})
