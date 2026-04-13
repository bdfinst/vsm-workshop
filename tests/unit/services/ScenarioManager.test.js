import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createScenarioManager } from '../../../src/services/ScenarioManager.js'

const createMockStoreApi = (overrides = {}) => ({
  getSteps: () => [],
  getConnections: () => [],
  getWorkItemCount: () => 10,
  getScenarios: () => [],
  addScenario: vi.fn(),
  setComparisonResults: vi.fn(),
  ...overrides,
})

describe('ScenarioManager', () => {
  let storeApi
  let manager
  let randomUUIDSpy

  beforeEach(() => {
    randomUUIDSpy = vi
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('test-uuid-1234')
    storeApi = createMockStoreApi()
    manager = createScenarioManager(storeApi)
  })

  afterEach(() => {
    randomUUIDSpy.mockRestore()
  })

  describe('createScenario', () => {
    it('creates scenario from current VSM state', () => {
      const steps = [{ id: 's1', name: 'Dev', processTime: 60 }]
      const connections = [{ id: 'c1', source: 's1', target: 's2' }]
      storeApi.getSteps = () => steps
      storeApi.getConnections = () => connections
      manager = createScenarioManager(storeApi)

      const scenario = manager.createScenario()

      expect(scenario.id).toBe('test-uuid-1234')
      expect(scenario.name).toBe('Scenario 1')
      expect(scenario.steps).toEqual([{ id: 's1', name: 'Dev', processTime: 60 }])
      expect(scenario.connections).toEqual([{ id: 'c1', source: 's1', target: 's2' }])
      expect(storeApi.addScenario).toHaveBeenCalledWith(scenario)
    })

    it('shallow copies steps so mutations do not affect originals', () => {
      const steps = [{ id: 's1', name: 'Dev' }]
      storeApi.getSteps = () => steps
      manager = createScenarioManager(storeApi)

      const scenario = manager.createScenario()

      expect(scenario.steps[0]).not.toBe(steps[0])
      scenario.steps[0].name = 'Changed'
      expect(steps[0].name).toBe('Dev')
    })

    it('names scenario based on existing count', () => {
      storeApi.getSteps = () => [{ id: 's1' }]
      storeApi.getScenarios = () => [{ id: 'a' }, { id: 'b' }]
      manager = createScenarioManager(storeApi)

      const scenario = manager.createScenario()

      expect(scenario.name).toBe('Scenario 3')
    })
  })

  describe('runComparison', () => {
    it('does nothing for unknown scenario', () => {
      storeApi.getScenarios = () => []
      manager = createScenarioManager(storeApi)

      manager.runComparison('nonexistent')

      expect(storeApi.setComparisonResults).not.toHaveBeenCalled()
    })

    it('runs comparison and sets results for known scenario', () => {
      const steps = [
        { id: 's1', name: 'Dev', processTime: 60, leadTime: 240, percentCompleteAccurate: 100 },
      ]
      const connections = [{ id: 'c1', source: 's1', target: null, type: 'forward' }]
      const scenario = {
        id: 'sc1',
        name: 'Scenario 1',
        steps: [
          { id: 's1', name: 'Dev', processTime: 30, leadTime: 120, percentCompleteAccurate: 100 },
        ],
        connections: [{ id: 'c1', source: 's1', target: null, type: 'forward' }],
      }
      storeApi.getSteps = () => steps
      storeApi.getConnections = () => connections
      storeApi.getWorkItemCount = () => 5
      storeApi.getScenarios = () => [scenario]
      manager = createScenarioManager(storeApi)

      manager.runComparison('sc1')

      expect(storeApi.setComparisonResults).toHaveBeenCalledTimes(1)
      const results = storeApi.setComparisonResults.mock.calls[0][0]
      expect(results).toHaveProperty('baseline')
      expect(results).toHaveProperty('scenario')
      expect(results).toHaveProperty('improvements')
      expect(results.improvements).toHaveProperty('leadTime')
      expect(results.improvements).toHaveProperty('throughput')
    })
  })
})
