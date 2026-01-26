import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  initSimulation,
  processTick,
  generateWorkItems,
  routeWorkItem,
  shouldRework,
  detectBottlenecks,
  calculateResults,
} from '../../../src/utils/simulation/simulationEngine'

describe('simulationEngine', () => {
  const mockSteps = [
    { id: 'step-1', name: 'Step 1', processTime: 30, leadTime: 60, percentCompleteAccurate: 100, batchSize: 1, peopleCount: 1 },
    { id: 'step-2', name: 'Step 2', processTime: 60, leadTime: 120, percentCompleteAccurate: 100, batchSize: 1, peopleCount: 1 },
    { id: 'step-3', name: 'Step 3', processTime: 30, leadTime: 60, percentCompleteAccurate: 100, batchSize: 1, peopleCount: 1 },
  ]

  const mockConnections = [
    { id: 'conn-1', source: 'step-1', target: 'step-2', type: 'forward', reworkRate: 0 },
    { id: 'conn-2', source: 'step-2', target: 'step-3', type: 'forward', reworkRate: 0 },
  ]

  describe('initSimulation', () => {
    it('creates initial simulation state', () => {
      const state = initSimulation(mockSteps, mockConnections, { workItemCount: 10 })

      expect(state.isRunning).toBe(false)
      expect(state.isPaused).toBe(false)
      expect(state.speed).toBe(1.0)
      expect(state.workItemCount).toBe(10)
      expect(state.completedCount).toBe(0)
      expect(state.elapsedTime).toBe(0)
    })

    it('initializes queue sizes for all steps', () => {
      const state = initSimulation(mockSteps, mockConnections, { workItemCount: 5 })

      mockSteps.forEach((step) => {
        expect(state.queueSizesByStepId[step.id]).toBe(0)
      })
    })

    it('handles empty steps array', () => {
      const state = initSimulation([], [], { workItemCount: 5 })

      expect(state.queueSizesByStepId).toEqual({})
      expect(state.workItems).toEqual([])
    })
  })

  describe('generateWorkItems', () => {
    it('creates the specified number of work items', () => {
      const items = generateWorkItems(5, mockSteps[0].id)

      expect(items).toHaveLength(5)
    })

    it('places all items at the first step', () => {
      const items = generateWorkItems(3, mockSteps[0].id)

      items.forEach((item) => {
        expect(item.currentStepId).toBe(mockSteps[0].id)
      })
    })

    it('initializes work items with correct properties', () => {
      const items = generateWorkItems(1, mockSteps[0].id)
      const item = items[0]

      expect(item.id).toBeDefined()
      expect(item.progress).toBe(0)
      expect(item.enteredAt).toBe(0)
      expect(item.history).toEqual([])
      expect(item.isRework).toBe(false)
    })

    it('creates unique IDs for each work item', () => {
      let idCounter = 0
      vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `item-${idCounter++}`)

      const items = generateWorkItems(10, mockSteps[0].id)
      const ids = items.map((i) => i.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(10)

      vi.restoreAllMocks()
    })
  })

  describe('processTick', () => {
    it('advances work item progress', () => {
      const state = initSimulation(mockSteps, mockConnections, { workItemCount: 1 })
      state.workItems = generateWorkItems(1, mockSteps[0].id)
      state.isRunning = true

      const newState = processTick(state, mockSteps, mockConnections)

      expect(newState.workItems[0].progress).toBeGreaterThan(0)
    })

    it('updates queue sizes when work items transition between steps', () => {
      const state = initSimulation(mockSteps, mockConnections, { workItemCount: 1 })
      state.workItems = generateWorkItems(1, mockSteps[0].id)
      state.workItems[0].progress = mockSteps[0].processTime + 1
      state.isRunning = true

      const initialQueueSize = state.queueSizesByStepId[mockSteps[1].id]

      const newState = processTick(state, mockSteps, mockConnections)

      expect(newState.queueSizesByStepId[mockSteps[1].id]).toBeGreaterThan(initialQueueSize)
    })

    it('does not advance when simulation is paused', () => {
      const state = initSimulation(mockSteps, mockConnections, { workItemCount: 1 })
      state.workItems = generateWorkItems(1, mockSteps[0].id)
      state.isPaused = true

      const newState = processTick(state, mockSteps, mockConnections)

      expect(newState.workItems[0].progress).toBe(0)
    })

    it('moves item to next step when progress exceeds process time', () => {
      const state = initSimulation(mockSteps, mockConnections, { workItemCount: 1 })
      state.workItems = generateWorkItems(1, mockSteps[0].id)
      state.workItems[0].progress = mockSteps[0].processTime + 1
      state.isRunning = true

      const newState = processTick(state, mockSteps, mockConnections)

      expect(newState.workItems[0].currentStepId).toBe(mockSteps[1].id)
      expect(newState.workItems[0].progress).toBe(0)
    })

    it('records history when item completes a step', () => {
      const state = initSimulation(mockSteps, mockConnections, { workItemCount: 1 })
      state.workItems = generateWorkItems(1, mockSteps[0].id)
      state.workItems[0].progress = mockSteps[0].processTime + 1
      state.isRunning = true

      const newState = processTick(state, mockSteps, mockConnections)

      expect(newState.workItems[0].history).toHaveLength(1)
      expect(newState.workItems[0].history[0].stepId).toBe(mockSteps[0].id)
    })

    it('marks item as completed when no next step exists', () => {
      const state = initSimulation(mockSteps, mockConnections, { workItemCount: 1 })
      state.workItems = [{
        id: 'test',
        currentStepId: mockSteps[2].id,
        progress: mockSteps[2].processTime + 1,
        enteredAt: 0,
        history: [],
        isRework: false,
      }]
      state.isRunning = true

      const initialCompletedCount = state.completedCount
      const newState = processTick(state, mockSteps, mockConnections)

      expect(newState.workItems[0].currentStepId).toBe(null)
      expect(newState.completedCount).toBe(initialCompletedCount + 1)
    })

    it('applies speed multiplier to progress', () => {
      const state = initSimulation(mockSteps, mockConnections, { workItemCount: 1 })
      state.workItems = generateWorkItems(1, mockSteps[0].id)
      state.isRunning = true
      state.speed = 2.0

      const newState = processTick(state, mockSteps, mockConnections)

      // At 2x speed, progress should advance faster
      expect(newState.elapsedTime).toBe(0.5) // 1/speed
    })

    it('records queue history each tick', () => {
      const state = initSimulation(mockSteps, mockConnections, { workItemCount: 1 })
      state.workItems = generateWorkItems(1, mockSteps[0].id)
      state.isRunning = true

      const newState = processTick(state, mockSteps, mockConnections)

      expect(newState.queueHistory.length).toBeGreaterThan(0)
    })
  })

  describe('routeWorkItem', () => {
    it('returns next step ID for forward connection', () => {
      const nextStepId = routeWorkItem(mockSteps[0], mockConnections)

      expect(nextStepId).toBe(mockSteps[1].id)
    })

    it('returns null when no forward connection exists', () => {
      const nextStepId = routeWorkItem(mockSteps[2], mockConnections)

      expect(nextStepId).toBe(null)
    })

    it('finds rework connection when rework is triggered', () => {
      const connectionsWithRework = [
        ...mockConnections,
        { id: 'rework-1', source: 'step-2', target: 'step-1', type: 'rework', reworkRate: 20 },
      ]

      const nextStepId = routeWorkItem(mockSteps[1], connectionsWithRework, true)

      expect(nextStepId).toBe(mockSteps[0].id)
    })
  })

  describe('shouldRework', () => {
    it('returns false when %C&A is 100', () => {
      const step = { ...mockSteps[0], percentCompleteAccurate: 100 }
      const connectionsWithRework = [
        { id: 'rework-1', source: 'step-1', target: 'step-1', type: 'rework', reworkRate: 20 },
      ]

      // With 100% C&A, rework should rarely occur (0% chance)
      let reworkCount = 0
      for (let i = 0; i < 100; i++) {
        if (shouldRework(step, connectionsWithRework, () => 0.5)) {
          reworkCount++
        }
      }

      expect(reworkCount).toBe(0)
    })

    it('returns true based on %C&A probability', () => {
      const step = { ...mockSteps[0], percentCompleteAccurate: 50 }
      const connectionsWithRework = [
        { id: 'rework-1', source: 'step-1', target: 'step-1', type: 'rework', reworkRate: 100 },
      ]

      // Run shouldRework multiple times and verify the percentage matches expected probability
      const iterations = 1000
      let reworkCount = 0
      for (let i = 0; i < iterations; i++) {
        if (shouldRework(step, connectionsWithRework)) {
          reworkCount++
        }
      }

      const reworkPercentage = (reworkCount / iterations) * 100
      // With 50% C&A, expect ~50% rework rate (allow ±5% margin for randomness)
      expect(reworkPercentage).toBeGreaterThan(45)
      expect(reworkPercentage).toBeLessThan(55)
    })

    it('returns false when no rework connection exists', () => {
      const step = { ...mockSteps[0], percentCompleteAccurate: 50 }

      const result = shouldRework(step, mockConnections, () => 0.1)

      expect(result).toBe(false)
    })
  })

  describe('detectBottlenecks', () => {
    it('identifies steps with high queue sizes', () => {
      const queueSizesByStepId = {
        'step-1': 2,
        'step-2': 8,
        'step-3': 1,
      }

      const bottlenecks = detectBottlenecks(mockSteps, queueSizesByStepId, 5)

      expect(bottlenecks).toContain('step-2')
      expect(bottlenecks).not.toContain('step-1')
      expect(bottlenecks).not.toContain('step-3')
    })

    it('returns empty array when no bottlenecks', () => {
      const queueSizesByStepId = {
        'step-1': 1,
        'step-2': 2,
        'step-3': 1,
      }

      const bottlenecks = detectBottlenecks(mockSteps, queueSizesByStepId, 5)

      expect(bottlenecks).toEqual([])
    })

    it('identifies multiple bottlenecks', () => {
      const queueSizesByStepId = {
        'step-1': 6,
        'step-2': 8,
        'step-3': 7,
      }

      const bottlenecks = detectBottlenecks(mockSteps, queueSizesByStepId, 5)

      expect(bottlenecks).toHaveLength(3)
    })

    it('uses default threshold when not provided', () => {
      const queueSizesByStepId = {
        'step-1': 2,
        'step-2': 4,
        'step-3': 1,
      }

      const bottlenecks = detectBottlenecks(mockSteps, queueSizesByStepId)

      // Default threshold is 3
      expect(bottlenecks).toContain('step-2')
    })
  })

  describe('calculateResults', () => {
    it('calculates average lead time', () => {
      const workItems = [
        { id: '1', currentStepId: null, history: [{ enteredAt: 0, exitedAt: 100 }] },
        { id: '2', currentStepId: null, history: [{ enteredAt: 0, exitedAt: 200 }] },
      ]
      const state = {
        workItems,
        workItemCount: 2,
        completedCount: 2,
        elapsedTime: 200,
        queueHistory: [],
      }

      const results = calculateResults(state, mockSteps)

      expect(results.avgLeadTime).toBe(150)
    })

    it('calculates throughput', () => {
      const state = {
        workItems: [],
        workItemCount: 10,
        completedCount: 10,
        elapsedTime: 100,
        queueHistory: [],
      }

      const results = calculateResults(state, mockSteps)

      expect(results.throughput).toBe(0.1) // 10 items / 100 time units
    })

    it('identifies bottleneck steps in results', () => {
      const state = {
        workItems: [],
        workItemCount: 5,
        completedCount: 5,
        elapsedTime: 100,
        queueHistory: [
          { tick: 1, stepId: 'step-1', queueSize: 2 },
          { tick: 1, stepId: 'step-2', queueSize: 8 },
          { tick: 2, stepId: 'step-2', queueSize: 10 },
          { tick: 3, stepId: 'step-3', queueSize: 1 },
        ],
      }

      const results = calculateResults(state, mockSteps)

      // Should identify step-2 as bottleneck (peak 10 > threshold 3)
      expect(results.bottlenecks).toHaveLength(1)
      expect(results.bottlenecks[0].stepId).toBe('step-2')
      expect(results.bottlenecks[0].peakQueueSize).toBe(10)
      expect(results.bottlenecks[0].stepName).toBe('Step 2')

      // Should not identify step-1 (peak 2 < threshold 3)
      expect(results.bottlenecks.find(b => b.stepId === 'step-1')).toBeUndefined()

      // Should not identify step-3 (peak 1 < threshold 3)
      expect(results.bottlenecks.find(b => b.stepId === 'step-3')).toBeUndefined()
    })

    it('handles zero elapsed time', () => {
      const state = {
        workItems: [],
        workItemCount: 0,
        completedCount: 0,
        elapsedTime: 0,
        queueHistory: [],
      }

      const results = calculateResults(state, mockSteps)

      expect(results.throughput).toBe(0)
    })
  })
})
