import { describe, it, expect } from 'vitest'
import { serializeVsm, deserializeVsm } from '../../../src/infrastructure/VsmJsonRepository.js'

describe('VsmJsonRepository readinessOverrides round-trip', () => {
  it('preserves readinessOverrides through export and import', () => {
    const vsm = {
      id: 'm1',
      name: 'Map',
      description: '',
      steps: [],
      connections: [],
      createdAt: null,
      updatedAt: null,
      readinessOverrides: { 'work-decomposition': 'met', rollback: 'confirmed' },
    }

    const restored = deserializeVsm(serializeVsm(vsm))

    expect(restored.readinessOverrides).toEqual({
      'work-decomposition': 'met',
      rollback: 'confirmed',
    })
  })

  it('defaults readinessOverrides to an empty object for legacy JSON', () => {
    const legacyJson = JSON.stringify({ id: 'm1', name: 'Legacy', steps: [], connections: [] })
    expect(deserializeVsm(legacyJson).readinessOverrides).toEqual({})
  })
})
