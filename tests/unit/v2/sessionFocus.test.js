import { describe, it, expect, beforeEach } from 'vitest'
import {
  focusOpeningTarget,
  focusStageHeading,
} from '../../../src/utils/session/focus.js'

const heading = (testid) =>
  `<h2 tabindex="-1" data-testid="${testid}">${testid}</h2>`

describe('session focus', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('focuses the stage heading', () => {
    document.body.innerHTML = heading('stage-heading')

    focusStageHeading()

    expect(document.activeElement.dataset.testid).toBe('stage-heading')
  })

  it('opens on the notice heading when a notice is showing, so it is announced', () => {
    document.body.innerHTML =
      heading('upgrade-notice-title') + heading('stage-heading')

    focusOpeningTarget()

    expect(document.activeElement.dataset.testid).toBe('upgrade-notice-title')
  })

  it('opens on the stage heading when no notice is showing', () => {
    document.body.innerHTML = heading('stage-heading')

    focusOpeningTarget()

    expect(document.activeElement.dataset.testid).toBe('stage-heading')
  })
})
