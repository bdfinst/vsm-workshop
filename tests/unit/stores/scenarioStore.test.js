import { describe, it, expect, beforeEach } from 'vitest'
import { scenarioStore } from '../../../src/stores/scenarioStore.svelte.js'

describe('scenarioStore', () => {
  beforeEach(() => {
    scenarioStore.reset()
  })

  describe('renameScenario', () => {
    it('renames a scenario with a valid name', () => {
      scenarioStore.addScenario({
        id: 'test-1',
        name: 'Scenario 1',
        steps: [],
      })

      scenarioStore.renameScenario('test-1', 'Reduced Wait Times')

      const scenario = scenarioStore.scenarios.find((s) => s.id === 'test-1')
      expect(scenario.name).toBe('Reduced Wait Times')
    })

    it('rejects empty string', () => {
      scenarioStore.addScenario({
        id: 'test-1',
        name: 'Scenario 1',
        steps: [],
      })

      scenarioStore.renameScenario('test-1', '')

      const scenario = scenarioStore.scenarios.find((s) => s.id === 'test-1')
      expect(scenario.name).toBe('Scenario 1')
    })

    it('rejects whitespace-only string', () => {
      scenarioStore.addScenario({
        id: 'test-1',
        name: 'Scenario 1',
        steps: [],
      })

      scenarioStore.renameScenario('test-1', '   ')

      const scenario = scenarioStore.scenarios.find((s) => s.id === 'test-1')
      expect(scenario.name).toBe('Scenario 1')
    })

    it('trims whitespace from valid name', () => {
      scenarioStore.addScenario({
        id: 'test-1',
        name: 'Scenario 1',
        steps: [],
      })

      scenarioStore.renameScenario('test-1', '  New Name  ')

      const scenario = scenarioStore.scenarios.find((s) => s.id === 'test-1')
      expect(scenario.name).toBe('New Name')
    })

    it('does nothing for non-existent scenario id', () => {
      scenarioStore.addScenario({
        id: 'test-1',
        name: 'Scenario 1',
        steps: [],
      })

      scenarioStore.renameScenario('non-existent', 'New Name')

      expect(scenarioStore.scenarios).toHaveLength(1)
      expect(scenarioStore.scenarios[0].name).toBe('Scenario 1')
    })
  })
})
