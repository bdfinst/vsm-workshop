import { describe, it, expect } from 'vitest'
import { calculateReworkPath } from '../../../../src/utils/ui/reworkEdgePath.js'

describe('calculateReworkPath', () => {
  const defaultParams = {
    sourceX: 500,
    sourceY: 150,
    targetX: 100,
    targetY: 150,
    sourcePosition: 'right',
    targetPosition: 'left',
  }

  it('returns a valid SVG path string', () => {
    const result = calculateReworkPath(defaultParams)

    expect(result.path).toMatch(/^M/)
    expect(typeof result.path).toBe('string')
  })

  it('starts at the source position', () => {
    const { path } = calculateReworkPath(defaultParams)

    expect(path).toMatch(/^M 500/)
  })

  it('routes above the nodes (negative Y offset)', () => {
    const { labelPosition } = calculateReworkPath(defaultParams)

    // The path should go above the node row (Y < sourceY)
    expect(labelPosition.y).toBeLessThan(defaultParams.sourceY)
  })

  it('increases vertical offset for larger spans', () => {
    const shortSpan = calculateReworkPath({
      ...defaultParams,
      sourceX: 350,
      targetX: 100,
    })

    const longSpan = calculateReworkPath({
      ...defaultParams,
      sourceX: 850,
      targetX: 100,
    })

    // Longer span should route higher above
    expect(longSpan.labelPosition.y).toBeLessThan(shortSpan.labelPosition.y)
  })

  it('returns a label position at the midpoint', () => {
    const { labelPosition } = calculateReworkPath(defaultParams)

    const midX = (defaultParams.sourceX + defaultParams.targetX) / 2
    expect(labelPosition.x).toBe(midX)
  })

  it('handles same-Y source and target', () => {
    const { path } = calculateReworkPath({
      ...defaultParams,
      sourceY: 150,
      targetY: 150,
    })

    expect(path).toBeTruthy()
  })
})
