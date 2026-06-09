import { describe, it, expect } from 'vitest'
import { createStep, isAutomated } from '../../../src/models/StepFactory.js'
import { STEP_TYPES } from '../../../src/data/stepTypes.js'

describe('automated flag', () => {
  it('defaults a new step to automated', () => {
    expect(createStep('Build').automated).toBe(true)
  })

  it('respects an automated override', () => {
    expect(createStep('Manual Deploy', { automated: false }).automated).toBe(false)
  })

  it('isAutomated treats a step without the property as automated', () => {
    const legacy = createStep('Legacy')
    delete legacy.automated
    expect(isAutomated(legacy)).toBe(true)
  })

  it('isAutomated returns false only when explicitly not automated', () => {
    expect(isAutomated(createStep('Manual', { automated: false }))).toBe(false)
    expect(isAutomated(createStep('Auto'))).toBe(true)
  })
})

describe('createStep', () => {
  describe('default values', () => {
    it('creates a step with generated UUID', () => {
      const step = createStep('Development')

      expect(step.id).toBeDefined()
      expect(step.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    })

    it('sets the provided name', () => {
      const step = createStep('Testing')

      expect(step.name).toBe('Testing')
    })

    it('sets default type to CUSTOM', () => {
      const step = createStep('Development')

      expect(step.type).toBe(STEP_TYPES.CUSTOM)
    })

    it('sets default empty description', () => {
      const step = createStep('Development')

      expect(step.description).toBe('')
    })

    it('sets default processTime to 60 minutes', () => {
      const step = createStep('Development')

      expect(step.processTime).toBe(60)
    })

    it('sets default leadTime to 240 minutes', () => {
      const step = createStep('Development')

      expect(step.leadTime).toBe(240)
    })

    it('sets default percentCompleteAccurate to 100', () => {
      const step = createStep('Development')

      expect(step.percentCompleteAccurate).toBe(100)
    })

    it('sets default queueSize to 0', () => {
      const step = createStep('Development')

      expect(step.queueSize).toBe(0)
    })

    it('sets default batchSize to 1', () => {
      const step = createStep('Development')

      expect(step.batchSize).toBe(1)
    })

    it('sets default peopleCount to 1', () => {
      const step = createStep('Development')

      expect(step.peopleCount).toBe(1)
    })

    it('sets default empty tools array', () => {
      const step = createStep('Development')

      expect(step.tools).toEqual([])
    })

    it('sets default position at origin', () => {
      const step = createStep('Development')

      expect(step.position).toEqual({ x: 0, y: 0 })
    })
  })

  describe('with overrides', () => {
    it('allows overriding type', () => {
      const step = createStep('Development', {
        type: STEP_TYPES.DEVELOPMENT,
      })

      expect(step.type).toBe(STEP_TYPES.DEVELOPMENT)
    })

    it('allows overriding processTime', () => {
      const step = createStep('Development', {
        processTime: 120,
      })

      expect(step.processTime).toBe(120)
    })

    it('allows overriding leadTime', () => {
      const step = createStep('Development', {
        leadTime: 480,
      })

      expect(step.leadTime).toBe(480)
    })

    it('allows overriding percentCompleteAccurate', () => {
      const step = createStep('Development', {
        percentCompleteAccurate: 85,
      })

      expect(step.percentCompleteAccurate).toBe(85)
    })

    it('allows overriding queueSize', () => {
      const step = createStep('Development', {
        queueSize: 5,
      })

      expect(step.queueSize).toBe(5)
    })

    it('allows overriding batchSize', () => {
      const step = createStep('Deployment', {
        batchSize: 3,
      })

      expect(step.batchSize).toBe(3)
    })

    it('allows overriding peopleCount', () => {
      const step = createStep('Development', {
        peopleCount: 5,
      })

      expect(step.peopleCount).toBe(5)
    })

    it('allows overriding tools', () => {
      const step = createStep('Development', {
        tools: ['IDE', 'Git', 'Docker'],
      })

      expect(step.tools).toEqual(['IDE', 'Git', 'Docker'])
    })

    it('allows overriding position', () => {
      const step = createStep('Development', {
        position: { x: 100, y: 200 },
      })

      expect(step.position).toEqual({ x: 100, y: 200 })
    })

    it('allows overriding description', () => {
      const step = createStep('Development', {
        description: 'Writing and testing code',
      })

      expect(step.description).toBe('Writing and testing code')
    })

    it('allows multiple overrides at once', () => {
      const step = createStep('Code Review', {
        type: STEP_TYPES.CODE_REVIEW,
        processTime: 30,
        leadTime: 120,
        percentCompleteAccurate: 90,
        queueSize: 2,
        description: 'Peer review of changes',
      })

      expect(step.name).toBe('Code Review')
      expect(step.type).toBe(STEP_TYPES.CODE_REVIEW)
      expect(step.processTime).toBe(30)
      expect(step.leadTime).toBe(120)
      expect(step.percentCompleteAccurate).toBe(90)
      expect(step.queueSize).toBe(2)
      expect(step.description).toBe('Peer review of changes')
    })
  })

  describe('unique IDs', () => {
    it('generates unique IDs for each step', () => {
      const step1 = createStep('Step 1')
      const step2 = createStep('Step 2')
      const step3 = createStep('Step 3')

      expect(step1.id).not.toBe(step2.id)
      expect(step2.id).not.toBe(step3.id)
      expect(step1.id).not.toBe(step3.id)
    })

    it('generates new ID even for same name', () => {
      const step1 = createStep('Development')
      const step2 = createStep('Development')

      expect(step1.id).not.toBe(step2.id)
    })
  })

  describe('immutability', () => {
    it('returns a new object, not a reference', () => {
      const overrides = { processTime: 120 }
      const step = createStep('Test', overrides)

      overrides.processTime = 999

      expect(step.processTime).toBe(120)
    })
  })
})
