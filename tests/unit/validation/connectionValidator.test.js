import { describe, it, expect } from 'vitest'
import { validateConnection } from '../../../src/utils/validation/connectionValidator.js'

describe('validateConnection', () => {
  describe('forward connections', () => {
    it('validates forward connection without rework rate', () => {
      const result = validateConnection({
        type: 'forward',
        source: 'step-1',
        target: 'step-2',
        reworkRate: 0,
      })

      expect(result.valid).toBe(true)
      expect(Object.keys(result.errors).length).toBe(0)
    })

    it('validates forward connection with zero rework rate', () => {
      const result = validateConnection({
        type: 'forward',
        source: 'step-1',
        target: 'step-2',
        reworkRate: 0,
      })

      expect(result.valid).toBe(true)
    })
  })

  describe('rework connections', () => {
    it('requires rework rate greater than 0', () => {
      const result = validateConnection({
        type: 'rework',
        source: 'step-2',
        target: 'step-1',
        reworkRate: 0,
      })

      expect(result.valid).toBe(false)
      expect(result.errors.reworkRate).toBe('Rework connections need a rate > 0')
    })

    it('rejects negative rework rate', () => {
      const result = validateConnection({
        type: 'rework',
        source: 'step-2',
        target: 'step-1',
        reworkRate: -10,
      })

      expect(result.valid).toBe(false)
      expect(result.errors.reworkRate).toBe(
        'Rework rate must be between 0 and 100'
      )
    })

    it('rejects rework rate over 100', () => {
      const result = validateConnection({
        type: 'rework',
        source: 'step-2',
        target: 'step-1',
        reworkRate: 150,
      })

      expect(result.valid).toBe(false)
      expect(result.errors.reworkRate).toBe(
        'Rework rate must be between 0 and 100'
      )
    })

    it('accepts valid rework rate of 1', () => {
      const result = validateConnection({
        type: 'rework',
        source: 'step-2',
        target: 'step-1',
        reworkRate: 1,
      })

      expect(result.valid).toBe(true)
    })

    it('accepts valid rework rate of 50', () => {
      const result = validateConnection({
        type: 'rework',
        source: 'step-2',
        target: 'step-1',
        reworkRate: 50,
      })

      expect(result.valid).toBe(true)
    })

    it('accepts valid rework rate of 100', () => {
      const result = validateConnection({
        type: 'rework',
        source: 'step-2',
        target: 'step-1',
        reworkRate: 100,
      })

      expect(result.valid).toBe(true)
    })

    it('accepts typical rework rate of 15', () => {
      const result = validateConnection({
        type: 'rework',
        source: 'step-2',
        target: 'step-1',
        reworkRate: 15,
      })

      expect(result.valid).toBe(true)
      expect(Object.keys(result.errors).length).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('handles missing type gracefully', () => {
      const result = validateConnection({
        source: 'step-1',
        target: 'step-2',
        reworkRate: 0,
      })

      // Forward is implied when type is missing
      expect(result.valid).toBe(true)
    })

    it('validates connection with boundary rework rate', () => {
      const result = validateConnection({
        type: 'rework',
        source: 'step-2',
        target: 'step-1',
        reworkRate: 0.1,
      })

      expect(result.valid).toBe(true)
    })

    it('rejects rework connection with undefined reworkRate', () => {
      const result = validateConnection({
        type: 'rework',
        source: 'step-2',
        target: 'step-1',
        reworkRate: undefined,
      })

      expect(result.valid).toBe(false)
      expect(result.errors.reworkRate).toBeDefined()
    })
  })
})
