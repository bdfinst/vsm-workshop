import { describe, it, expect } from 'vitest'
import { calculateCdReadiness } from '../../../src/utils/calculations/cdReadiness'

// Minimal step builder — only the fields the engine reads.
const makeStep = (overrides = {}) => ({
  id: overrides.id || `step-${Math.random().toString(36).slice(2)}`,
  name: 'Step',
  type: 'development',
  processTime: 60,
  leadTime: 240,
  percentCompleteAccurate: 100,
  queueSize: 0,
  automated: true,
  ...overrides,
})

const itemById = (result, id) => result.find((i) => i.id === id)

describe('calculateCdReadiness', () => {
  it('returns 13 readiness items (9 practices + 4 signals)', () => {
    const result = calculateCdReadiness([makeStep()], [])
    expect(result).toHaveLength(13)
    expect(result.filter((i) => i.kind === 'practice')).toHaveLength(9)
    expect(result.filter((i) => i.kind === 'signal')).toHaveLength(4)
  })

  describe('Work Decomposition signal', () => {
    it('flags a gap pinned to a step whose lead time exceeds two days', () => {
      const step = makeStep({ id: 'dev', name: 'Development', leadTime: 1200 })
      const wd = itemById(calculateCdReadiness([step], []), 'work-decomposition')
      expect(wd.status).toBe('gap')
      expect(wd.stepId).toBe('dev')
      expect(wd.explanation.toLowerCase()).toContain('two days')
    })

    it('is met when every lead time is within two days', () => {
      const step = makeStep({ leadTime: 360 })
      const wd = itemById(calculateCdReadiness([step], []), 'work-decomposition')
      expect(wd.status).toBe('met')
    })
  })

  describe('Testing Fundamentals signal', () => {
    it('flags a gap for a slow test step', () => {
      const qa = makeStep({ id: 'qa', name: 'QA', type: 'testing', processTime: 45 })
      const tf = itemById(calculateCdReadiness([qa], []), 'testing-fundamentals')
      expect(tf.status).toBe('gap')
      expect(tf.stepId).toBe('qa')
    })

    it('is met for a fast test step', () => {
      const qa = makeStep({ type: 'testing', processTime: 8 })
      const tf = itemById(calculateCdReadiness([qa], []), 'testing-fundamentals')
      expect(tf.status).toBe('met')
    })
  })

  describe('Work In Progress Limits signal', () => {
    it('flags a gap pinned to a bottleneck step', () => {
      const steps = [
        makeStep({ id: 'a', queueSize: 2 }),
        makeStep({ id: 'b', queueSize: 2 }),
        makeStep({ id: 'review', name: 'Review', queueSize: 25 }),
      ]
      const wip = itemById(calculateCdReadiness(steps, []), 'wip-limits')
      expect(wip.status).toBe('gap')
      expect(wip.stepId).toBe('review')
    })

    it('is met when there is no bottleneck', () => {
      const steps = [makeStep({ queueSize: 0 }), makeStep({ queueSize: 0 })]
      const wip = itemById(calculateCdReadiness(steps, []), 'wip-limits')
      expect(wip.status).toBe('met')
    })
  })

  describe('Small Batches signal', () => {
    it('flags a gap for wait-dominated flow', () => {
      const step = makeStep({ processTime: 100, leadTime: 1000 })
      const sb = itemById(calculateCdReadiness([step], []), 'small-batches')
      expect(sb.status).toBe('gap')
      expect(sb.explanation.toLowerCase()).toContain('wait')
    })

    it('does not flag a gap when there is no lead-time data', () => {
      const step = makeStep({ processTime: 0, leadTime: 0 })
      const sb = itemById(calculateCdReadiness([step], []), 'small-batches')
      expect(sb.status).toBe('met')
    })

    it('is met when flow efficiency is at least 25 percent', () => {
      const step = makeStep({ processTime: 120, leadTime: 360 })
      const sb = itemById(calculateCdReadiness([step], []), 'small-batches')
      expect(sb.status).toBe('met')
    })
  })

  describe('Single Path to Production practice', () => {
    it('flags a gap pinned to a manual deployment step', () => {
      const deploy = makeStep({ id: 'prod', name: 'Prod Deploy', type: 'deployment', automated: false })
      const sp = itemById(calculateCdReadiness([deploy], []), 'single-path-to-production')
      expect(sp.status).toBe('gap')
      expect(sp.stepId).toBe('prod')
    })

    it('flags a gap when there are two deployment steps', () => {
      const steps = [
        makeStep({ id: 'd1', type: 'deployment', automated: true }),
        makeStep({ id: 'd2', type: 'deployment', automated: true }),
      ]
      const sp = itemById(calculateCdReadiness(steps, []), 'single-path-to-production')
      expect(sp.status).toBe('gap')
    })

    it('is met for a single automated deployment step', () => {
      const deploy = makeStep({ type: 'deployment', automated: true })
      const sp = itemById(calculateCdReadiness([deploy], []), 'single-path-to-production')
      expect(sp.status).toBe('met')
    })

    it('treats a deployment step with no automated property as automated', () => {
      const deploy = makeStep({ type: 'deployment' })
      delete deploy.automated
      const sp = itemById(calculateCdReadiness([deploy], []), 'single-path-to-production')
      expect(sp.status).toBe('met')
    })
  })

  describe('Continuous Integration and Definition of Deployable practices', () => {
    it('both flag a gap when a rework loop is present', () => {
      const dev = makeStep({ id: 'dev', name: 'Development' })
      const qa = makeStep({ id: 'qa', name: 'QA', type: 'testing', processTime: 5 })
      const connections = [{ source: 'qa', target: 'dev', type: 'rework', reworkRate: 20 }]
      const result = calculateCdReadiness([dev, qa], connections)
      expect(itemById(result, 'continuous-integration').status).toBe('gap')
      expect(itemById(result, 'definition-of-deployable').status).toBe('gap')
    })

    it('both flag a gap pinned to a step with low percent complete and accurate', () => {
      const dev = makeStep({ id: 'dev', name: 'Development', percentCompleteAccurate: 50 })
      const result = calculateCdReadiness([dev], [])
      const ci = itemById(result, 'continuous-integration')
      const dod = itemById(result, 'definition-of-deployable')
      expect(ci.status).toBe('gap')
      expect(ci.stepId).toBe('dev')
      expect(dod.status).toBe('gap')
      expect(dod.stepId).toBe('dev')
    })

    it('default to needs-review at the percent-complete-accurate threshold with no rework', () => {
      const dev = makeStep({ percentCompleteAccurate: 60 })
      const result = calculateCdReadiness([dev], [])
      expect(itemById(result, 'continuous-integration').status).toBe('needs-review')
      expect(itemById(result, 'definition-of-deployable').status).toBe('needs-review')
    })
  })

  describe('Rollback practice', () => {
    it('flags a gap when there is no deployment step', () => {
      const rb = itemById(calculateCdReadiness([makeStep()], []), 'rollback')
      expect(rb.status).toBe('gap')
    })

    it('defaults to needs-review when a deployment step exists', () => {
      const deploy = makeStep({ type: 'deployment', automated: true })
      const rb = itemById(calculateCdReadiness([deploy], []), 'rollback')
      expect(rb.status).toBe('needs-review')
    })
  })

  describe('practices with no VSM signal', () => {
    it('default to needs-review', () => {
      const result = calculateCdReadiness([makeStep()], [])
      ;[
        'trunk-based-development',
        'deterministic-pipeline',
        'immutable-artifacts',
        'production-like-environments',
        'application-configuration',
      ].forEach((id) => {
        expect(itemById(result, id).status).toBe('needs-review')
      })
    })
  })

  describe('no false positives', () => {
    it('produces no signal gaps for a healthy stream', () => {
      const steps = [
        makeStep({ id: 'dev', leadTime: 360, processTime: 120, percentCompleteAccurate: 90, queueSize: 0 }),
        makeStep({ id: 'deploy', type: 'deployment', leadTime: 240, processTime: 120, automated: true }),
      ]
      const result = calculateCdReadiness(steps, [])
      const signalGaps = result.filter((i) => i.kind === 'signal' && i.status === 'gap')
      expect(signalGaps).toHaveLength(0)
    })
  })

  describe('inferred source', () => {
    it('marks every item as inferred when there are no overrides', () => {
      const result = calculateCdReadiness([makeStep()], [])
      result.forEach((i) => expect(i.source).toBe('inferred'))
    })
  })

  describe('confirm / override / reset resolution', () => {
    const gapStep = () => makeStep({ id: 'dev', name: 'Development', leadTime: 1200 })

    it('forces an item to met and records the overridden source', () => {
      const result = calculateCdReadiness([gapStep()], [], { 'work-decomposition': 'met' })
      const wd = itemById(result, 'work-decomposition')
      expect(wd.status).toBe('met')
      expect(wd.source).toBe('overridden')
    })

    it('keeps the inferred gap and records the confirmed source', () => {
      const result = calculateCdReadiness([gapStep()], [], { 'work-decomposition': 'confirmed' })
      const wd = itemById(result, 'work-decomposition')
      expect(wd.status).toBe('gap')
      expect(wd.source).toBe('confirmed')
    })

    it('exposes the raw inferred status as signal so a reset can restore it', () => {
      const result = calculateCdReadiness([gapStep()], [], { 'work-decomposition': 'met' })
      const wd = itemById(result, 'work-decomposition')
      expect(wd.signal).toBe('gap')
    })

    it('returns to the inferred status when the override is removed (reset)', () => {
      const wd = itemById(calculateCdReadiness([gapStep()], [], {}), 'work-decomposition')
      expect(wd.status).toBe('gap')
      expect(wd.source).toBe('inferred')
    })

    it('ignores an unrecognized override value (e.g. from corrupted storage)', () => {
      const result = calculateCdReadiness([gapStep()], [], { 'work-decomposition': ['met'] })
      const wd = itemById(result, 'work-decomposition')
      expect(wd.status).toBe('gap')
      expect(wd.source).toBe('inferred')
    })
  })
})
