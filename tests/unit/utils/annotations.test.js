import { describe, it, expect } from 'vitest'
import {
  createAnnotation,
  groupAnnotationsByWaste,
  summarizeAnnotations,
} from '../../../src/utils/annotations'
import { WASTE_TYPES } from '../../../src/data/wasteTypes'

describe('createAnnotation', () => {
  it('builds an annotation with an id and the given fields', () => {
    const a = createAnnotation('step', 's1', WASTE_TYPES.WAITING, 'Long queue here')
    expect(a.id).toBeTruthy()
    expect(a.targetType).toBe('step')
    expect(a.targetId).toBe('s1')
    expect(a.wasteType).toBe(WASTE_TYPES.WAITING)
    expect(a.note).toBe('Long queue here')
    expect(a.createdAt).toBeTruthy()
  })

  it('defaults an unrecognized waste type to practice_gap', () => {
    const a = createAnnotation('step', 's1', 'nonsense', '')
    expect(a.wasteType).toBe(WASTE_TYPES.PRACTICE_GAP)
  })
})

describe('groupAnnotationsByWaste', () => {
  it('groups annotations by their waste type', () => {
    const annotations = [
      createAnnotation('step', 's1', WASTE_TYPES.WAITING, 'a'),
      createAnnotation('step', 's2', WASTE_TYPES.WAITING, 'b'),
      createAnnotation('connection', 'c1', WASTE_TYPES.REWORK, 'c'),
    ]
    const grouped = groupAnnotationsByWaste(annotations)
    expect(grouped[WASTE_TYPES.WAITING]).toHaveLength(2)
    expect(grouped[WASTE_TYPES.REWORK]).toHaveLength(1)
    expect(grouped[WASTE_TYPES.HANDOFF]).toBeUndefined()
  })
})

describe('summarizeAnnotations', () => {
  it('counts total annotations and distinct waste types', () => {
    const annotations = [
      createAnnotation('step', 's1', WASTE_TYPES.WAITING, 'a'),
      createAnnotation('step', 's2', WASTE_TYPES.WAITING, 'b'),
      createAnnotation('connection', 'c1', WASTE_TYPES.REWORK, 'c'),
    ]
    const summary = summarizeAnnotations(annotations)
    expect(summary.total).toBe(3)
    expect(summary.byWaste[WASTE_TYPES.WAITING]).toBe(2)
    expect(summary.byWaste[WASTE_TYPES.REWORK]).toBe(1)
  })

  it('handles an empty backlog', () => {
    expect(summarizeAnnotations([])).toEqual({ total: 0, byWaste: {} })
  })
})
