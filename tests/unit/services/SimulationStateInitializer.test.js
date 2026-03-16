import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSimulationStateInitializer } from '../../../src/services/SimulationStateInitializer.js'

const createMockStoreApi = (overrides = {}) => ({
  getWorkItemCount: () => 5,
  updateWorkItems: vi.fn(),
  updateQueueSizes: vi.fn(),
  updateElapsedTime: vi.fn(),
  setDetectedBottlenecks: vi.fn(),
  setResults: vi.fn(),
  ...overrides,
})

describe('SimulationStateInitializer', () => {
  let storeApi
  let initializer

  beforeEach(() => {
    storeApi = createMockStoreApi()
    initializer = createSimulationStateInitializer(storeApi)
  })

  it('returns initial simulation engine state', () => {
    const steps = [
      { id: 's1', name: 'Dev', processTime: 60, leadTime: 240 },
      { id: 's2', name: 'Test', processTime: 30, leadTime: 120 },
    ]
    const connections = []

    const state = initializer.initialize(steps, connections)

    expect(state).toBeDefined()
    expect(state.queueSizesByStepId).toHaveProperty('s1')
    expect(state.queueSizesByStepId).toHaveProperty('s2')
  })

  it('seeds work items in the store', () => {
    const steps = [{ id: 's1', name: 'Dev', processTime: 60, leadTime: 240 }]

    initializer.initialize(steps, [])

    expect(storeApi.updateWorkItems).toHaveBeenCalledTimes(1)
    const items = storeApi.updateWorkItems.mock.calls[0][0]
    expect(items).toHaveLength(5) // workItemCount = 5
    expect(items[0].currentStepId).toBe('s1')
  })

  it('resets elapsed time and clears results', () => {
    const steps = [{ id: 's1', name: 'Dev', processTime: 60, leadTime: 240 }]

    initializer.initialize(steps, [])

    expect(storeApi.updateElapsedTime).toHaveBeenCalledWith(0)
    expect(storeApi.setDetectedBottlenecks).toHaveBeenCalledWith([])
    expect(storeApi.setResults).toHaveBeenCalledWith(null)
  })

  it('seeds queue sizes from engine state', () => {
    const steps = [
      { id: 's1', name: 'Dev', processTime: 60, leadTime: 240 },
      { id: 's2', name: 'Test', processTime: 30, leadTime: 120 },
    ]

    initializer.initialize(steps, [])

    expect(storeApi.updateQueueSizes).toHaveBeenCalledWith(
      expect.objectContaining({ s1: 0, s2: 0 })
    )
  })
})
