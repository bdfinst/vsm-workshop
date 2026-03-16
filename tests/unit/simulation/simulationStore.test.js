import { describe, it, expect, beforeEach } from 'vitest'

// Import the new Svelte stores
import { simControlStore } from '../../../src/stores/simulationControlStore.svelte.js'
import { simDataStore } from '../../../src/stores/simulationDataStore.svelte.js'
import { scenarioStore } from '../../../src/stores/scenarioStore.svelte.js'

describe('simulationStore (Svelte)', () => {
  beforeEach(() => {
    // Reset all stores before each test
    simControlStore.reset()
    simDataStore.reset()
    scenarioStore.reset()
    // Reset workItemCount since reset() preserves it
    simDataStore.setWorkItemCount(10)
    // Reset speed since reset() preserves it
    simControlStore.setSpeed(1.0)
  })

  describe('initial state', () => {
    it('has correct default values', () => {
      expect(simControlStore.isRunning).toBe(false)
      expect(simControlStore.isPaused).toBe(false)
      expect(simControlStore.speed).toBe(1.0)
      expect(simDataStore.workItemCount).toBe(10)
      expect(simDataStore.workItems).toEqual([])
      expect(simDataStore.completedCount).toBe(0)
    })
  })

  describe('setRunning', () => {
    it('sets isRunning to true', () => {
      simControlStore.setRunning(true)

      expect(simControlStore.isRunning).toBe(true)
    })

    it('clears isPaused when starting', () => {
      simControlStore.setPaused(true)

      simControlStore.setRunning(true)

      expect(simControlStore.isPaused).toBe(false)
    })
  })

  describe('setPaused', () => {
    it('sets isPaused to true', () => {
      simControlStore.setPaused(true)

      expect(simControlStore.isPaused).toBe(true)
    })

    it('sets isRunning to false when pausing', () => {
      simControlStore.setRunning(true)

      simControlStore.setPaused(true)

      expect(simControlStore.isRunning).toBe(false)
    })
  })

  describe('setSpeed', () => {
    it('sets simulation speed', () => {
      simControlStore.setSpeed(2.0)

      expect(simControlStore.speed).toBe(2.0)
    })

    it('clamps speed to minimum of 0.25', () => {
      simControlStore.setSpeed(0.1)

      expect(simControlStore.speed).toBe(0.25)
    })

    it('clamps speed to maximum of 4.0', () => {
      simControlStore.setSpeed(10)

      expect(simControlStore.speed).toBe(4.0)
    })
  })

  describe('setWorkItemCount', () => {
    it('sets work item count', () => {
      simDataStore.setWorkItemCount(20)

      expect(simDataStore.workItemCount).toBe(20)
    })

    it('does not allow negative values', () => {
      simDataStore.setWorkItemCount(-5)

      expect(simDataStore.workItemCount).toBe(0)
    })
  })

  describe('updateWorkItems', () => {
    it('updates work items array', () => {
      const items = [{ id: '1', progress: 50 }]

      simDataStore.updateWorkItems(items)

      expect(simDataStore.workItems).toEqual(items)
    })
  })

  describe('incrementCompletedCount', () => {
    it('increments completed count', () => {
      simDataStore.incrementCompletedCount()
      simDataStore.incrementCompletedCount()

      expect(simDataStore.completedCount).toBe(2)
    })
  })

  describe('updateQueueSizes', () => {
    it('updates queue sizes map', () => {
      const queueSizesByStepId = { 'step-1': 5, 'step-2': 3 }

      simDataStore.updateQueueSizes(queueSizesByStepId)

      expect(simDataStore.queueSizesByStepId).toEqual(queueSizesByStepId)
    })
  })

  describe('addQueueHistoryBatch (single entry)', () => {
    it('adds entry to queue history', () => {
      const entry = { tick: 1, stepId: 'step-1', queueSize: 5 }

      simDataStore.addQueueHistoryBatch([entry])

      expect(simDataStore.queueHistory).toContainEqual(entry)
    })
  })

  describe('setDetectedBottlenecks', () => {
    it('updates detected bottlenecks array', () => {
      const bottlenecks = ['step-1', 'step-2']

      simDataStore.setDetectedBottlenecks(bottlenecks)

      expect(simDataStore.detectedBottlenecks).toEqual(bottlenecks)
    })
  })

  describe('setResults', () => {
    it('sets simulation results', () => {
      const results = {
        completedCount: 10,
        avgLeadTime: 150,
        throughput: 0.5,
        bottlenecks: [],
      }

      simDataStore.setResults(results)

      expect(simDataStore.results).toEqual(results)
    })
  })

  describe('reset', () => {
    it('resets all simulation state', () => {
      simControlStore.setRunning(true)
      simControlStore.setPaused(true)
      simDataStore.setCompletedCount(10)
      simDataStore.updateWorkItems([{ id: '1' }])
      simDataStore.updateElapsedTime(100)
      simDataStore.addQueueHistoryBatch([{ tick: 1 }])

      simControlStore.reset()
      simDataStore.reset()

      expect(simControlStore.isRunning).toBe(false)
      expect(simControlStore.isPaused).toBe(false)
      expect(simDataStore.completedCount).toBe(0)
      expect(simDataStore.workItems).toEqual([])
      expect(simDataStore.elapsedTime).toBe(0)
      expect(simDataStore.queueHistory).toEqual([])
    })

    it('preserves workItemCount on reset', () => {
      simDataStore.setWorkItemCount(25)

      simDataStore.reset()

      expect(simDataStore.workItemCount).toBe(25)
    })
  })

  describe('scenarios', () => {
    describe('addScenario', () => {
      it('adds a new scenario', () => {
        const scenario = {
          id: 'scenario-1',
          name: 'Test Scenario',
          steps: [],
          connections: [],
        }

        scenarioStore.addScenario(scenario)

        expect(scenarioStore.scenarios).toContainEqual(scenario)
      })
    })

    describe('removeScenario', () => {
      it('removes a scenario by id', () => {
        scenarioStore.addScenario({ id: 'scenario-1', name: 'Test 1' })
        scenarioStore.addScenario({ id: 'scenario-2', name: 'Test 2' })

        scenarioStore.removeScenario('scenario-1')

        const scenarios = scenarioStore.scenarios
        expect(scenarios).toHaveLength(1)
        expect(scenarios[0].id).toBe('scenario-2')
      })
    })

    describe('setActiveScenario', () => {
      it('sets the active scenario id', () => {
        scenarioStore.setActiveScenario('scenario-1')

        expect(scenarioStore.activeScenarioId).toBe('scenario-1')
      })
    })

    describe('setComparisonResults', () => {
      it('sets comparison results', () => {
        const comparison = {
          baseline: { avgLeadTime: 100 },
          scenario: { avgLeadTime: 80 },
          improvement: { leadTime: 20 },
        }

        scenarioStore.setComparisonResults(comparison)

        expect(scenarioStore.comparisonResults).toEqual(comparison)
      })
    })
  })

  describe('integration: simulation lifecycle', () => {
    it('completes full simulation lifecycle: start → pause → resume → complete', () => {
      // Initial state
      expect(simControlStore.isRunning).toBe(false)
      expect(simControlStore.isPaused).toBe(false)
      expect(simDataStore.completedCount).toBe(0)

      // Start simulation
      simControlStore.setRunning(true)
      expect(simControlStore.isRunning).toBe(true)
      expect(simControlStore.isPaused).toBe(false)

      // Simulate some progress
      simDataStore.updateWorkItems([
        { id: '1', progress: 50 },
        { id: '2', progress: 25 },
      ])
      simDataStore.updateQueueSizes({ 'step-1': 3, 'step-2': 2 })
      simDataStore.addQueueHistoryBatch([{ tick: 1, stepId: 'step-1', queueSize: 3 }])
      simDataStore.incrementCompletedCount()

      expect(simDataStore.workItems).toHaveLength(2)
      expect(simDataStore.completedCount).toBe(1)
      expect(simDataStore.queueSizesByStepId).toEqual({ 'step-1': 3, 'step-2': 2 })

      // Pause simulation
      simControlStore.setPaused(true)
      expect(simControlStore.isRunning).toBe(false)
      expect(simControlStore.isPaused).toBe(true)
      expect(simDataStore.completedCount).toBe(1) // State preserved

      // Resume simulation
      simControlStore.setRunning(true)
      expect(simControlStore.isRunning).toBe(true)
      expect(simControlStore.isPaused).toBe(false)
      expect(simDataStore.completedCount).toBe(1) // State still preserved

      // Continue and complete simulation
      simDataStore.incrementCompletedCount()
      simDataStore.incrementCompletedCount()
      simDataStore.setResults({
        completedCount: 3,
        avgLeadTime: 150,
        throughput: 0.5,
        bottlenecks: ['step-1'],
      })
      simControlStore.setRunning(false)

      expect(simControlStore.isRunning).toBe(false)
      expect(simDataStore.completedCount).toBe(3)
      expect(simDataStore.results).toEqual({
        completedCount: 3,
        avgLeadTime: 150,
        throughput: 0.5,
        bottlenecks: ['step-1'],
      })

      // Reset for next simulation
      simControlStore.reset()
      simDataStore.reset()
      expect(simControlStore.isRunning).toBe(false)
      expect(simControlStore.isPaused).toBe(false)
      expect(simDataStore.completedCount).toBe(0)
      expect(simDataStore.workItems).toEqual([])
      expect(simDataStore.queueHistory).toEqual([])
      expect(simDataStore.results).toBeNull()
    })

    it('handles speed changes during active simulation', () => {
      // Start simulation at normal speed
      simControlStore.setRunning(true)
      simControlStore.setSpeed(1.0)

      expect(simControlStore.isRunning).toBe(true)
      expect(simControlStore.speed).toBe(1.0)

      // Speed up during simulation
      simControlStore.setSpeed(2.0)
      expect(simControlStore.isRunning).toBe(true)
      expect(simControlStore.speed).toBe(2.0)

      // Slow down
      simControlStore.setSpeed(0.5)
      expect(simControlStore.isRunning).toBe(true)
      expect(simControlStore.speed).toBe(0.5)
    })

    it('tracks queue history throughout simulation', () => {
      simControlStore.setRunning(true)

      // Simulate multiple ticks with queue changes
      simDataStore.addQueueHistoryBatch([{ tick: 1, stepId: 'step-1', queueSize: 5 }])
      simDataStore.addQueueHistoryBatch([{ tick: 2, stepId: 'step-1', queueSize: 7 }])
      simDataStore.addQueueHistoryBatch([{ tick: 3, stepId: 'step-1', queueSize: 4 }])
      simDataStore.addQueueHistoryBatch([{ tick: 1, stepId: 'step-2', queueSize: 2 }])

      expect(simDataStore.queueHistory).toHaveLength(4)
      expect(simDataStore.queueHistory[0]).toEqual({
        tick: 1,
        stepId: 'step-1',
        queueSize: 5,
      })
      expect(simDataStore.queueHistory[1]).toEqual({
        tick: 2,
        stepId: 'step-1',
        queueSize: 7,
      })
    })

    it('handles scenario switching during simulation workflow', () => {
      // Add baseline scenario
      const baseline = {
        id: 'baseline',
        name: 'Current State',
        steps: [],
        connections: [],
      }
      scenarioStore.addScenario(baseline)
      scenarioStore.setActiveScenario('baseline')

      // Run baseline simulation
      simControlStore.setRunning(true)
      simDataStore.setResults({
        completedCount: 10,
        avgLeadTime: 200,
        throughput: 0.5,
        bottlenecks: ['step-1'],
      })
      simControlStore.setRunning(false)

      const baselineResults = simDataStore.results

      // Add improved scenario
      const improved = {
        id: 'improved',
        name: 'Future State',
        steps: [],
        connections: [],
      }
      scenarioStore.addScenario(improved)
      scenarioStore.setActiveScenario('improved')

      expect(scenarioStore.activeScenarioId).toBe('improved')
      expect(scenarioStore.scenarios).toHaveLength(2)

      // Reset and run improved scenario
      simDataStore.reset()
      simControlStore.setRunning(true)
      simDataStore.setResults({
        completedCount: 10,
        avgLeadTime: 150,
        throughput: 0.67,
        bottlenecks: [],
      })
      simControlStore.setRunning(false)

      // Set comparison results
      scenarioStore.setComparisonResults({
        baseline: baselineResults,
        scenario: simDataStore.results,
        improvement: { leadTime: 50 },
      })

      expect(scenarioStore.comparisonResults).toBeDefined()
      expect(scenarioStore.comparisonResults.improvement.leadTime).toBe(50)
    })
  })
})
