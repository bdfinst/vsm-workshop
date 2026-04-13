import { describe, it, expect } from 'vitest'
import { autoPositionStep } from '../../../../src/utils/ui/autoPositionStep.js'
import {
  CANVAS_RIGHT_X,
  CANVAS_STEP_SPACING,
  CANVAS_Y,
} from '../../../../src/data/canvasConfig.js'

describe('autoPositionStep', () => {
  it('positions the first step on the right side of the canvas', () => {
    const position = autoPositionStep(0)

    expect(position.x).toBe(CANVAS_RIGHT_X)
    expect(position.y).toBe(CANVAS_Y)
  })

  it('positions subsequent steps to the left', () => {
    const first = autoPositionStep(0)
    const second = autoPositionStep(1)

    expect(second.x).toBeLessThan(first.x)
    expect(second.x).toBe(CANVAS_RIGHT_X - CANVAS_STEP_SPACING)
  })

  it('spaces steps evenly', () => {
    const positions = [0, 1, 2, 3].map(autoPositionStep)

    for (let i = 1; i < positions.length; i++) {
      expect(positions[i - 1].x - positions[i].x).toBe(CANVAS_STEP_SPACING)
    }
  })

  it('keeps all steps at the same y coordinate', () => {
    const positions = [0, 1, 2].map(autoPositionStep)

    positions.forEach((pos) => {
      expect(pos.y).toBe(CANVAS_Y)
    })
  })
})
