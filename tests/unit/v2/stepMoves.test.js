import { describe, it, expect } from 'vitest'
import {
  MOVE_DOWN,
  MOVE_UP,
  movedAnnouncement,
  moveBlockReason,
} from '../../../src/utils/session/stepMoves.js'

describe('moveBlockReason', () => {
  it('blocks moving the step after Intake up, naming Intake', () => {
    expect(moveBlockReason(1, 4, MOVE_UP)).toBe('Intake is always first')
  })

  it('blocks moving the last step down', () => {
    expect(moveBlockReason(3, 4, MOVE_DOWN)).toBe('This is the last step')
  })

  it.each([
    [2, 4, MOVE_UP],
    [1, 4, MOVE_DOWN],
    [2, 4, MOVE_DOWN],
    [3, 4, MOVE_UP],
  ])('allows a move from index %i of %i, direction %i', (index, count, dir) => {
    expect(moveBlockReason(index, count, dir)).toBeNull()
  })

  it('blocks moving the only step after Intake in either direction', () => {
    expect(moveBlockReason(1, 2, MOVE_UP)).toBe('Intake is always first')
    expect(moveBlockReason(1, 2, MOVE_DOWN)).toBe('This is the last step')
  })
})

describe('movedAnnouncement', () => {
  it('names the step and its 1-based position', () => {
    expect(movedAnnouncement('Development', 2)).toBe(
      'Development moved to position 3'
    )
  })

  it.each(['', '   '])('calls a blank name %j an unnamed step', (name) => {
    expect(movedAnnouncement(name, 1)).toBe('Unnamed step moved to position 2')
  })
})
