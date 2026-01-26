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
      queueSizesByStepId: {},
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
      const queueSizesByStepId = { 'step-1': 5, 'step-2': 3 }

      updateQueueSizes(queueSizesByStepId)

      expect(useSimulationStore.getState().queueSizesByStepId).toEqual(queueSizesByStepId)
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

  describe('integration: simulation lifecycle', () => {
    it('completes full simulation lifecycle: start → pause → resume → complete', () => {
      const {
        setRunning,
        setPaused,
        updateWorkItems,
        incrementCompletedCount,
        updateQueueSizes,
        addQueueHistoryEntry,
        setResults,
        reset,
      } = useSimulationStore.getState()

      // Initial state
      let state = useSimulationStore.getState()
      expect(state.isRunning).toBe(false)
      expect(state.isPaused).toBe(false)
      expect(state.completedCount).toBe(0)

      // Start simulation
      setRunning(true)
      state = useSimulationStore.getState()
      expect(state.isRunning).toBe(true)
      expect(state.isPaused).toBe(false)

      // Simulate some progress
      updateWorkItems([
        { id: '1', progress: 50 },
        { id: '2', progress: 25 },
      ])
      updateQueueSizes({ 'step-1': 3, 'step-2': 2 })
      addQueueHistoryEntry({ tick: 1, stepId: 'step-1', queueSize: 3 })
      incrementCompletedCount()

      state = useSimulationStore.getState()
      expect(state.workItems).toHaveLength(2)
      expect(state.completedCount).toBe(1)
      expect(state.queueSizesByStepId).toEqual({ 'step-1': 3, 'step-2': 2 })

      // Pause simulation
      setPaused(true)
      state = useSimulationStore.getState()
      expect(state.isRunning).toBe(false)
      expect(state.isPaused).toBe(true)
      expect(state.completedCount).toBe(1) // State preserved

      // Resume simulation
      setRunning(true)
      state = useSimulationStore.getState()
      expect(state.isRunning).toBe(true)
      expect(state.isPaused).toBe(false)
      expect(state.completedCount).toBe(1) // State still preserved

      // Continue and complete simulation
      incrementCompletedCount()
      incrementCompletedCount()
      setResults({
        completedCount: 3,
        avgLeadTime: 150,
        throughput: 0.5,
        bottlenecks: ['step-1'],
      })
      setRunning(false)

      state = useSimulationStore.getState()
      expect(state.isRunning).toBe(false)
      expect(state.completedCount).toBe(3)
      expect(state.results).toEqual({
        completedCount: 3,
        avgLeadTime: 150,
        throughput: 0.5,
        bottlenecks: ['step-1'],
      })

      // Reset for next simulation
      reset()
      state = useSimulationStore.getState()
      expect(state.isRunning).toBe(false)
      expect(state.isPaused).toBe(false)
      expect(state.completedCount).toBe(0)
      expect(state.workItems).toEqual([])
      expect(state.queueHistory).toEqual([])
      expect(state.results).toBeNull()
    })

    it('handles speed changes during active simulation', () => {
      const { setRunning, setSpeed } = useSimulationStore.getState()

      // Start simulation at normal speed
      setRunning(true)
      setSpeed(1.0)

      let state = useSimulationStore.getState()
      expect(state.isRunning).toBe(true)
      expect(state.speed).toBe(1.0)

      // Speed up during simulation
      setSpeed(2.0)
      state = useSimulationStore.getState()
      expect(state.isRunning).toBe(true)
      expect(state.speed).toBe(2.0)

      // Slow down
      setSpeed(0.5)
      state = useSimulationStore.getState()
      expect(state.isRunning).toBe(true)
      expect(state.speed).toBe(0.5)
    })

    it('tracks queue history throughout simulation', () => {
      const { setRunning, addQueueHistoryEntry, setRunning: stopRunning } =
        useSimulationStore.getState()

      setRunning(true)

      // Simulate multiple ticks with queue changes
      addQueueHistoryEntry({ tick: 1, stepId: 'step-1', queueSize: 5 })
      addQueueHistoryEntry({ tick: 2, stepId: 'step-1', queueSize: 7 })
      addQueueHistoryEntry({ tick: 3, stepId: 'step-1', queueSize: 4 })
      addQueueHistoryEntry({ tick: 1, stepId: 'step-2', queueSize: 2 })

      const state = useSimulationStore.getState()
      expect(state.queueHistory).toHaveLength(4)
      expect(state.queueHistory[0]).toEqual({
        tick: 1,
        stepId: 'step-1',
        queueSize: 5,
      })
      expect(state.queueHistory[1]).toEqual({
        tick: 2,
        stepId: 'step-1',
        queueSize: 7,
      })
    })

    it('handles scenario switching during simulation workflow', () => {
      const {
        addScenario,
        setActiveScenario,
        setRunning,
        setResults,
        setComparisonResults,
        reset,
      } = useSimulationStore.getState()

      // Add baseline scenario
      const baseline = {
        id: 'baseline',
        name: 'Current State',
        steps: [],
        connections: [],
      }
      addScenario(baseline)
      setActiveScenario('baseline')

      // Run baseline simulation
      setRunning(true)
      setResults({
        completedCount: 10,
        avgLeadTime: 200,
        throughput: 0.5,
        bottlenecks: ['step-1'],
      })
      setRunning(false)

      const baselineResults = useSimulationStore.getState().results

      // Add improved scenario
      const improved = {
        id: 'improved',
        name: 'Future State',
        steps: [],
        connections: [],
      }
      addScenario(improved)
      setActiveScenario('improved')

      let state = useSimulationStore.getState()
      expect(state.activeScenarioId).toBe('improved')
      expect(state.scenarios).toHaveLength(2)

      // Reset and run improved scenario
      reset()
      setRunning(true)
      setResults({
        completedCount: 10,
        avgLeadTime: 150,
        throughput: 0.67,
        bottlenecks: [],
      })
      setRunning(false)

      // Set comparison results
      setComparisonResults({
        baseline: baselineResults,
        scenario: useSimulationStore.getState().results,
        improvement: { leadTime: 50 },
      })

      state = useSimulationStore.getState()
      expect(state.comparisonResults).toBeDefined()
      expect(state.comparisonResults.improvement.leadTime).toBe(50)
    })
  })
})
