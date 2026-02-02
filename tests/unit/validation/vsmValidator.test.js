import { describe, it, expect } from 'vitest'
import {
  validateVSMData,
  sanitizeVSMData,
} from '../../../src/utils/validation/vsmValidator'

describe('validateVSMData', () => {
  it('accepts valid VSM data', () => {
    const validData = {
      id: 'test-id',
      name: 'Test VSM',
      description: 'Test description',
      steps: [{ id: 's1', name: 'Step 1', processTime: 60, leadTime: 120 }],
      connections: [{ id: 'c1', source: 's1', target: 's2' }],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    const result = validateVSMData(validData)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.data).toEqual(validData)
  })

  it('rejects null', () => {
    const result = validateVSMData(null)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Data must be an object')
    expect(result.data).toBeNull()
  })

  it('rejects undefined', () => {
    const result = validateVSMData(undefined)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Data must be an object')
  })

  it('rejects non-object data', () => {
    expect(validateVSMData('string').valid).toBe(false)
    expect(validateVSMData(123).valid).toBe(false)
    expect(validateVSMData([]).valid).toBe(false)
  })

  it('rejects missing id field', () => {
    const incomplete = {
      name: 'Test',
      steps: [],
      connections: [],
    }
    const result = validateVSMData(incomplete)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing field: id')
  })

  it('rejects missing name field', () => {
    const incomplete = {
      id: 'test',
      steps: [],
      connections: [],
    }
    const result = validateVSMData(incomplete)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing field: name')
  })

  it('rejects missing steps field', () => {
    const incomplete = {
      id: 'test',
      name: 'Test',
      connections: [],
    }
    const result = validateVSMData(incomplete)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing field: steps')
  })

  it('rejects missing connections field', () => {
    const incomplete = {
      id: 'test',
      name: 'Test',
      steps: [],
    }
    const result = validateVSMData(incomplete)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing field: connections')
  })

  it('rejects non-array steps', () => {
    const invalid = {
      id: 'test',
      name: 'Test',
      steps: 'not-an-array',
      connections: [],
    }
    const result = validateVSMData(invalid)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('steps must be an array')
  })

  it('rejects non-array connections', () => {
    const invalid = {
      id: 'test',
      name: 'Test',
      steps: [],
      connections: 'not-an-array',
    }
    const result = validateVSMData(invalid)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('connections must be an array')
  })

  it('validates step structure - missing id', () => {
    const invalidSteps = {
      id: 'test',
      name: 'Test',
      steps: [{ name: 'Step 1', processTime: 60 }],
      connections: [],
    }
    const result = validateVSMData(invalidSteps)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('missing id'))).toBe(true)
  })

  it('validates step structure - missing name', () => {
    const invalidSteps = {
      id: 'test',
      name: 'Test',
      steps: [{ id: 's1', processTime: 60 }],
      connections: [],
    }
    const result = validateVSMData(invalidSteps)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('missing name'))).toBe(true)
  })

  it('validates step structure - invalid processTime type', () => {
    const invalidSteps = {
      id: 'test',
      name: 'Test',
      steps: [{ id: 's1', name: 'Step 1', processTime: 'not-a-number' }],
      connections: [],
    }
    const result = validateVSMData(invalidSteps)
    expect(result.valid).toBe(false)
    expect(
      result.errors.some((e) => e.includes('processTime must be a number'))
    ).toBe(true)
  })

  it('validates step structure - invalid leadTime type', () => {
    const invalidSteps = {
      id: 'test',
      name: 'Test',
      steps: [{ id: 's1', name: 'Step 1', leadTime: 'not-a-number' }],
      connections: [],
    }
    const result = validateVSMData(invalidSteps)
    expect(result.valid).toBe(false)
    expect(
      result.errors.some((e) => e.includes('leadTime must be a number'))
    ).toBe(true)
  })

  it('validates connection structure - missing id', () => {
    const invalidConnections = {
      id: 'test',
      name: 'Test',
      steps: [],
      connections: [{ source: 's1', target: 's2' }],
    }
    const result = validateVSMData(invalidConnections)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('missing id'))).toBe(true)
  })

  it('validates connection structure - missing source', () => {
    const invalidConnections = {
      id: 'test',
      name: 'Test',
      steps: [],
      connections: [{ id: 'c1', target: 's2' }],
    }
    const result = validateVSMData(invalidConnections)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('missing source'))).toBe(true)
  })

  it('validates connection structure - missing target', () => {
    const invalidConnections = {
      id: 'test',
      name: 'Test',
      steps: [],
      connections: [{ id: 'c1', source: 's1' }],
    }
    const result = validateVSMData(invalidConnections)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('missing target'))).toBe(true)
  })
})

describe('sanitizeVSMData', () => {
  it('returns safe defaults for null', () => {
    const result = sanitizeVSMData(null)
    expect(result).toEqual({
      id: null,
      name: '',
      description: '',
      steps: [],
      connections: [],
      createdAt: null,
      updatedAt: null,
    })
  })

  it('returns safe defaults for undefined', () => {
    const result = sanitizeVSMData(undefined)
    expect(result).toEqual({
      id: null,
      name: '',
      description: '',
      steps: [],
      connections: [],
      createdAt: null,
      updatedAt: null,
    })
  })

  it('returns safe defaults for non-object', () => {
    expect(sanitizeVSMData('string')).toEqual({
      id: null,
      name: '',
      description: '',
      steps: [],
      connections: [],
      createdAt: null,
      updatedAt: null,
    })
  })

  it('provides safe defaults for missing fields', () => {
    const minimal = { id: 'test' }
    const result = sanitizeVSMData(minimal)

    expect(result.id).toBe('test')
    expect(result.name).toBe('')
    expect(result.description).toBe('')
    expect(result.steps).toEqual([])
    expect(result.connections).toEqual([])
    expect(result.createdAt).toBeNull()
    expect(result.updatedAt).toBeNull()
  })

  it('preserves valid data', () => {
    const validData = {
      id: 'test',
      name: 'Test VSM',
      description: 'Test desc',
      steps: [{ id: 's1' }],
      connections: [{ id: 'c1' }],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
    }

    const result = sanitizeVSMData(validData)
    expect(result).toEqual(validData)
  })

  it('converts non-array steps to empty array', () => {
    const data = {
      id: 'test',
      name: 'Test',
      steps: 'not-an-array',
    }
    const result = sanitizeVSMData(data)
    expect(result.steps).toEqual([])
  })

  it('converts non-array connections to empty array', () => {
    const data = {
      id: 'test',
      name: 'Test',
      connections: 'not-an-array',
    }
    const result = sanitizeVSMData(data)
    expect(result.connections).toEqual([])
  })

  it('uses empty string for falsy name', () => {
    expect(sanitizeVSMData({ name: null }).name).toBe('')
    expect(sanitizeVSMData({ name: undefined }).name).toBe('')
    expect(sanitizeVSMData({ name: '' }).name).toBe('')
  })

  it('uses null for falsy id', () => {
    expect(sanitizeVSMData({ id: null }).id).toBeNull()
    expect(sanitizeVSMData({ id: undefined }).id).toBeNull()
    expect(sanitizeVSMData({ id: '' }).id).toBeNull()
  })
})
