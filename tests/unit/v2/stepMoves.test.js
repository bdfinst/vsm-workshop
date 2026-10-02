import { describe, it, expect } from 'vitest'
import {
  INTAKE_INDEX,
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
    ['up', 2, 4, MOVE_UP],
    ['down', 1, 4, MOVE_DOWN],
    ['down', 2, 4, MOVE_DOWN],
    ['up', 3, 4, MOVE_UP],
  ])(
    'allows moving %s from index %i of %i steps',
    (_, index, count, direction) => {
      expect(moveBlockReason(index, count, direction)).toBeNull()
    }
  )

  it('blocks moving Intake itself up, naming Intake', () => {
    expect(moveBlockReason(0, 4, MOVE_UP)).toBe('Intake is always first')
  })

  it('blocks moving a list of one step down', () => {
    expect(moveBlockReason(0, 1, MOVE_DOWN)).toBe('This is the last step')
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

  it('trims a padded name', () => {
    expect(movedAnnouncement('  Development ', 2)).toBe(
      'Development moved to position 3'
    )
  })

  it.each(['', '   '])('labels a blank name %j by its position', (name) => {
    expect(movedAnnouncement(name, 1)).toBe('step 2 moved to position 2')
  })
})

describe('INTAKE_INDEX', () => {
  it('is the first position in the list', () => {
    expect(INTAKE_INDEX).toBe(0)
  })
})
