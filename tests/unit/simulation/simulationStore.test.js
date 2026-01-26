import { describe, it, expect, beforeEach } from 'vitest'
import {
  useSimulationControlStore,
  useSimulationDataStore,
  useScenarioStore,
} from '../../../src/stores/simulationStore'

describe('simulationStore', () => {
  beforeEach(() => {
    // Reset all stores before each test
    useSimulationControlStore.setState({
      isRunning: false,
      isPaused: false,
      speed: 1.0,
    })
    useSimulationDataStore.setState({
      workItemCount: 10,
      workItems: [],
      completedCount: 0,
      elapsedTime: 0,
      queueSizesByStepId: {},
      queueHistory: [],
      detectedBottlenecks: [],
      results: null,
    })
    useScenarioStore.setState({
      scenarios: [],
      activeScenarioId: null,
      comparisonResults: null,
    })
  })

  describe('initial state', () => {
    it('has correct default values', () => {
      const controlState = useSimulationControlStore.getState()
      const dataState = useSimulationDataStore.getState()

      expect(controlState.isRunning).toBe(false)
      expect(controlState.isPaused).toBe(false)
      expect(controlState.speed).toBe(1.0)
      expect(dataState.workItemCount).toBe(10)
      expect(dataState.workItems).toEqual([])
      expect(dataState.completedCount).toBe(0)
    })
  })

  describe('setRunning', () => {
    it('sets isRunning to true', () => {
      const { setRunning } = useSimulationControlStore.getState()

      setRunning(true)

      expect(useSimulationControlStore.getState().isRunning).toBe(true)
    })

    it('clears isPaused when starting', () => {
      useSimulationControlStore.setState({ isPaused: true })
      const { setRunning } = useSimulationControlStore.getState()

      setRunning(true)

      expect(useSimulationControlStore.getState().isPaused).toBe(false)
    })
  })

  describe('setPaused', () => {
    it('sets isPaused to true', () => {
      const { setPaused } = useSimulationControlStore.getState()

      setPaused(true)

      expect(useSimulationControlStore.getState().isPaused).toBe(true)
    })

    it('sets isRunning to false when pausing', () => {
      useSimulationControlStore.setState({ isRunning: true })
      const { setPaused } = useSimulationControlStore.getState()

      setPaused(true)

      expect(useSimulationControlStore.getState().isRunning).toBe(false)
    })
  })

  describe('setSpeed', () => {
    it('sets simulation speed', () => {
      const { setSpeed } = useSimulationControlStore.getState()

      setSpeed(2.0)

      expect(useSimulationControlStore.getState().speed).toBe(2.0)
    })

    it('clamps speed to minimum of 0.25', () => {
      const { setSpeed } = useSimulationControlStore.getState()

      setSpeed(0.1)

      expect(useSimulationControlStore.getState().speed).toBe(0.25)
    })

    it('clamps speed to maximum of 4.0', () => {
      const { setSpeed } = useSimulationControlStore.getState()

      setSpeed(10)

      expect(useSimulationControlStore.getState().speed).toBe(4.0)
    })
  })

  describe('setWorkItemCount', () => {
    it('sets work item count', () => {
      const { setWorkItemCount } = useSimulationDataStore.getState()

      setWorkItemCount(20)

      expect(useSimulationDataStore.getState().workItemCount).toBe(20)
    })

    it('does not allow negative values', () => {
      const { setWorkItemCount } = useSimulationDataStore.getState()

      setWorkItemCount(-5)

      expect(useSimulationDataStore.getState().workItemCount).toBe(0)
    })
  })

  describe('updateWorkItems', () => {
    it('updates work items array', () => {
      const { updateWorkItems } = useSimulationDataStore.getState()
      const items = [{ id: '1', progress: 50 }]

      updateWorkItems(items)

      expect(useSimulationDataStore.getState().workItems).toEqual(items)
    })
  })

  describe('incrementCompletedCount', () => {
    it('increments completed count', () => {
      const { incrementCompletedCount } = useSimulationDataStore.getState()

      incrementCompletedCount()
      incrementCompletedCount()

      expect(useSimulationDataStore.getState().completedCount).toBe(2)
    })
  })

  describe('updateQueueSizes', () => {
    it('updates queue sizes map', () => {
      const { updateQueueSizes } = useSimulationDataStore.getState()
      const queueSizesByStepId = { 'step-1': 5, 'step-2': 3 }

      updateQueueSizes(queueSizesByStepId)

      expect(useSimulationDataStore.getState().queueSizesByStepId).toEqual(
        queueSizesByStepId
      )
    })
  })

  describe('addQueueHistoryEntry', () => {
    it('adds entry to queue history', () => {
      const { addQueueHistoryEntry } = useSimulationDataStore.getState()
      const entry = { tick: 1, stepId: 'step-1', queueSize: 5 }

      addQueueHistoryEntry(entry)

      expect(useSimulationDataStore.getState().queueHistory).toContainEqual(
        entry
      )
    })
  })

  describe('setDetectedBottlenecks', () => {
    it('updates detected bottlenecks array', () => {
      const { setDetectedBottlenecks } = useSimulationDataStore.getState()
      const bottlenecks = ['step-1', 'step-2']

      setDetectedBottlenecks(bottlenecks)

      expect(useSimulationDataStore.getState().detectedBottlenecks).toEqual(
        bottlenecks
      )
    })
  })

  describe('setResults', () => {
    it('sets simulation results', () => {
      const { setResults } = useSimulationDataStore.getState()
      const results = {
        completedCount: 10,
        avgLeadTime: 150,
        throughput: 0.5,
        bottlenecks: [],
      }

      setResults(results)

      expect(useSimulationDataStore.getState().results).toEqual(results)
    })
  })

  describe('reset', () => {
    it('resets all simulation state', () => {
      useSimulationControlStore.setState({
        isRunning: true,
        isPaused: true,
      })
      useSimulationDataStore.setState({
        completedCount: 10,
        workItems: [{ id: '1' }],
        elapsedTime: 100,
        queueHistory: [{ tick: 1 }],
      })

      const { reset: resetControl } = useSimulationControlStore.getState()
      const { reset: resetData } = useSimulationDataStore.getState()
      resetControl()
      resetData()

      const controlState = useSimulationControlStore.getState()
      const dataState = useSimulationDataStore.getState()
      expect(controlState.isRunning).toBe(false)
      expect(controlState.isPaused).toBe(false)
      expect(dataState.completedCount).toBe(0)
      expect(dataState.workItems).toEqual([])
      expect(dataState.elapsedTime).toBe(0)
      expect(dataState.queueHistory).toEqual([])
    })

    it('preserves workItemCount on reset', () => {
      useSimulationDataStore.setState({ workItemCount: 25 })

      const { reset } = useSimulationDataStore.getState()
      reset()

      expect(useSimulationDataStore.getState().workItemCount).toBe(25)
    })
  })

  describe('scenarios', () => {
    describe('addScenario', () => {
      it('adds a new scenario', () => {
        const { addScenario } = useScenarioStore.getState()
        const scenario = {
          id: 'scenario-1',
          name: 'Test Scenario',
          steps: [],
          connections: [],
        }

        addScenario(scenario)

        expect(useScenarioStore.getState().scenarios).toContainEqual(scenario)
      })
    })

    describe('removeScenario', () => {
      it('removes a scenario by id', () => {
        useScenarioStore.setState({
          scenarios: [
            { id: 'scenario-1', name: 'Test 1' },
            { id: 'scenario-2', name: 'Test 2' },
          ],
        })

        const { removeScenario } = useScenarioStore.getState()
        removeScenario('scenario-1')

        const scenarios = useScenarioStore.getState().scenarios
        expect(scenarios).toHaveLength(1)
        expect(scenarios[0].id).toBe('scenario-2')
      })
    })

    describe('setActiveScenario', () => {
      it('sets the active scenario id', () => {
        const { setActiveScenario } = useScenarioStore.getState()

        setActiveScenario('scenario-1')

        expect(useScenarioStore.getState().activeScenarioId).toBe('scenario-1')
      })
    })

    describe('setComparisonResults', () => {
      it('sets comparison results', () => {
        const { setComparisonResults } = useScenarioStore.getState()
        const comparison = {
          baseline: { avgLeadTime: 100 },
          scenario: { avgLeadTime: 80 },
          improvement: { leadTime: 20 },
        }

        setComparisonResults(comparison)

        expect(useScenarioStore.getState().comparisonResults).toEqual(
          comparison
        )
      })
    })
  })

  describe('integration: simulation lifecycle', () => {
    it('completes full simulation lifecycle: start → pause → resume → complete', () => {
      const { setRunning, setPaused } = useSimulationControlStore.getState()
      const {
        updateWorkItems,
        incrementCompletedCount,
        updateQueueSizes,
        addQueueHistoryEntry,
        setResults,
        reset: resetData,
      } = useSimulationDataStore.getState()
      const { reset: resetControl } = useSimulationControlStore.getState()

      // Initial state
      let controlState = useSimulationControlStore.getState()
      let dataState = useSimulationDataStore.getState()
      expect(controlState.isRunning).toBe(false)
      expect(controlState.isPaused).toBe(false)
      expect(dataState.completedCount).toBe(0)

      // Start simulation
      setRunning(true)
      controlState = useSimulationControlStore.getState()
      expect(controlState.isRunning).toBe(true)
      expect(controlState.isPaused).toBe(false)

      // Simulate some progress
      updateWorkItems([
        { id: '1', progress: 50 },
        { id: '2', progress: 25 },
      ])
      updateQueueSizes({ 'step-1': 3, 'step-2': 2 })
      addQueueHistoryEntry({ tick: 1, stepId: 'step-1', queueSize: 3 })
      incrementCompletedCount()

      dataState = useSimulationDataStore.getState()
      expect(dataState.workItems).toHaveLength(2)
      expect(dataState.completedCount).toBe(1)
      expect(dataState.queueSizesByStepId).toEqual({ 'step-1': 3, 'step-2': 2 })

      // Pause simulation
      setPaused(true)
      controlState = useSimulationControlStore.getState()
      dataState = useSimulationDataStore.getState()
      expect(controlState.isRunning).toBe(false)
      expect(controlState.isPaused).toBe(true)
      expect(dataState.completedCount).toBe(1) // State preserved

      // Resume simulation
      setRunning(true)
      controlState = useSimulationControlStore.getState()
      dataState = useSimulationDataStore.getState()
      expect(controlState.isRunning).toBe(true)
      expect(controlState.isPaused).toBe(false)
      expect(dataState.completedCount).toBe(1) // State still preserved

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

      controlState = useSimulationControlStore.getState()
      dataState = useSimulationDataStore.getState()
      expect(controlState.isRunning).toBe(false)
      expect(dataState.completedCount).toBe(3)
      expect(dataState.results).toEqual({
        completedCount: 3,
        avgLeadTime: 150,
        throughput: 0.5,
        bottlenecks: ['step-1'],
      })

      // Reset for next simulation
      resetControl()
      resetData()
      controlState = useSimulationControlStore.getState()
      dataState = useSimulationDataStore.getState()
      expect(controlState.isRunning).toBe(false)
      expect(controlState.isPaused).toBe(false)
      expect(dataState.completedCount).toBe(0)
      expect(dataState.workItems).toEqual([])
      expect(dataState.queueHistory).toEqual([])
      expect(dataState.results).toBeNull()
    })

    it('handles speed changes during active simulation', () => {
      const { setRunning, setSpeed } = useSimulationControlStore.getState()

      // Start simulation at normal speed
      setRunning(true)
      setSpeed(1.0)

      let state = useSimulationControlStore.getState()
      expect(state.isRunning).toBe(true)
      expect(state.speed).toBe(1.0)

      // Speed up during simulation
      setSpeed(2.0)
      state = useSimulationControlStore.getState()
      expect(state.isRunning).toBe(true)
      expect(state.speed).toBe(2.0)

      // Slow down
      setSpeed(0.5)
      state = useSimulationControlStore.getState()
      expect(state.isRunning).toBe(true)
      expect(state.speed).toBe(0.5)
    })

    it('tracks queue history throughout simulation', () => {
      const { setRunning } = useSimulationControlStore.getState()
      const { addQueueHistoryEntry } = useSimulationDataStore.getState()

      setRunning(true)

      // Simulate multiple ticks with queue changes
      addQueueHistoryEntry({ tick: 1, stepId: 'step-1', queueSize: 5 })
      addQueueHistoryEntry({ tick: 2, stepId: 'step-1', queueSize: 7 })
      addQueueHistoryEntry({ tick: 3, stepId: 'step-1', queueSize: 4 })
      addQueueHistoryEntry({ tick: 1, stepId: 'step-2', queueSize: 2 })

      const state = useSimulationDataStore.getState()
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
      const { setRunning } = useSimulationControlStore.getState()
      const { setResults, reset: resetData } = useSimulationDataStore.getState()
      const {
        addScenario,
        setActiveScenario,
        setComparisonResults,
      } = useScenarioStore.getState()

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

      const baselineResults = useSimulationDataStore.getState().results

      // Add improved scenario
      const improved = {
        id: 'improved',
        name: 'Future State',
        steps: [],
        connections: [],
      }
      addScenario(improved)
      setActiveScenario('improved')

      let scenarioState = useScenarioStore.getState()
      expect(scenarioState.activeScenarioId).toBe('improved')
      expect(scenarioState.scenarios).toHaveLength(2)

      // Reset and run improved scenario
      resetData()
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
        scenario: useSimulationDataStore.getState().results,
        improvement: { leadTime: 50 },
      })

      scenarioState = useScenarioStore.getState()
      expect(scenarioState.comparisonResults).toBeDefined()
      expect(scenarioState.comparisonResults.improvement.leadTime).toBe(50)
    })
  })
})
