import { describe, it, expect } from 'vitest'
import {
  countReworkPathsOf,
  deleteConfirmMessage,
  hasStepData,
  hasTimeData,
  kindSwitchMessage,
  needsDeleteConfirm,
  stepLabelOf,
} from '../../../src/utils/session/stepData.js'
import { STEP_KIND } from '../../../src/models/v2/constants.js'

const blankTeamRow = {
  name: 'Draft step',
  description: '',
  performedBy: '',
  notes: '',
  pctCA: null,
  processTime: { typ: null },
  waitTime: { typ: null },
  elapsedTime: null,
}

describe('stepLabelOf', () => {
  it('is the name', () => {
    expect(stepLabelOf('Development', 3)).toBe('Development')
  })

  it('trims the name', () => {
    expect(stepLabelOf('  Development ', 3)).toBe('Development')
  })

  it.each(['', '   '])('stands in "step N" for a blank name %j', (name) => {
    expect(stepLabelOf(name, 3)).toBe('step 3')
  })
})

describe('hasTimeData', () => {
  it('is false for a step with no times entered', () => {
    expect(hasTimeData(blankTeamRow)).toBe(false)
  })

  it('is true when process time is entered', () => {
    expect(hasTimeData({ ...blankTeamRow, processTime: { typ: 60 } })).toBe(
      true
    )
  })

  it('is true when only the wait time is entered', () => {
    expect(hasTimeData({ ...blankTeamRow, waitTime: { typ: 0 } })).toBe(true)
  })

  it('is true when only a range bound is entered', () => {
    const row = { ...blankTeamRow, waitTime: { typ: null, max: 90 } }
    expect(hasTimeData(row)).toBe(true)
  })

  it('is true when an outside step has an elapsed time', () => {
    const row = { ...blankTeamRow, processTime: null, waitTime: null }
    expect(hasTimeData({ ...row, elapsedTime: { typ: 480 } })).toBe(true)
  })
})

describe('hasStepData', () => {
  it('is false when only the name is set', () => {
    expect(hasStepData(blankTeamRow)).toBe(false)
  })

  it.each([
    ['a description', { description: 'Stories split' }],
    ['a performer', { performedBy: 'Dev team' }],
    ['notes', { notes: 'Waits on legal' }],
    ['a %C/A', { pctCA: 80 }],
    ['a process time', { processTime: { typ: 60 } }],
  ])('is true with %s', (_, fields) => {
    expect(hasStepData({ ...blankTeamRow, ...fields })).toBe(true)
  })

  it('ignores blank text', () => {
    expect(hasStepData({ ...blankTeamRow, description: '   ' })).toBe(false)
  })

  it('does not count the handoff flag', () => {
    expect(hasStepData({ ...blankTeamRow, isHandoff: true })).toBe(false)
  })
})

describe('countReworkPathsOf', () => {
  const paths = [
    { fromStepId: 'c', toStepId: 'b' },
    { fromStepId: 'b', toStepId: 'a' },
    { fromStepId: 'c', toStepId: 'a' },
  ]

  it('counts paths that start or end at the step', () => {
    expect(countReworkPathsOf(paths, 'b')).toBe(2)
  })

  it('is 0 for a step no path touches', () => {
    expect(countReworkPathsOf(paths, 'z')).toBe(0)
  })
})

describe('needsDeleteConfirm', () => {
  it('is false for a step with only a name and no paths', () => {
    expect(needsDeleteConfirm(blankTeamRow, 0)).toBe(false)
  })

  it('is true when the step has data', () => {
    const row = { ...blankTeamRow, performedBy: 'Dev team' }
    expect(needsDeleteConfirm(row, 0)).toBe(true)
  })

  it('is true when the step has rework paths', () => {
    expect(needsDeleteConfirm(blankTeamRow, 1)).toBe(true)
  })
})

describe('deleteConfirmMessage', () => {
  it('names the step', () => {
    expect(deleteConfirmMessage('Development', 0)).toBe('Delete Development?')
  })

  it('says 1 rework path will be removed', () => {
    expect(deleteConfirmMessage('Development', 1)).toBe(
      'Delete Development? 1 rework path will be removed.'
    )
  })

  it('pluralizes for more than one path', () => {
    expect(deleteConfirmMessage('Development', 2)).toBe(
      'Delete Development? 2 rework paths will be removed.'
    )
  })
})

describe('kindSwitchMessage', () => {
  it('says process and wait time are cleared on the way to outside', () => {
    expect(kindSwitchMessage('Code review', STEP_KIND.OUTSIDE)).toBe(
      'Switch Code review to outside? Its process time and wait time will be cleared.'
    )
  })

  it('says elapsed time is cleared on the way to team', () => {
    expect(kindSwitchMessage('Security review', STEP_KIND.TEAM)).toBe(
      'Switch Security review to a team step? Its elapsed time will be cleared.'
    )
  })
})
