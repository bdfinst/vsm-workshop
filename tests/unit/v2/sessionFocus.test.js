import { describe, it, expect, beforeEach } from 'vitest'
import {
  controlSelector,
  fieldSelector,
  focusControl,
  focusOpeningTarget,
  focusScreenHeading,
  focusStageHeading,
  focusUpgradeNotice,
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

  it('focuses the stage heading as the screen heading when there is one', () => {
    document.body.innerHTML = heading('home-heading') + heading('stage-heading')

    focusScreenHeading()

    expect(document.activeElement.dataset.testid).toBe('stage-heading')
  })

  it('focuses the home heading as the screen heading when there is no stage heading', () => {
    document.body.innerHTML = heading('home-heading')

    focusScreenHeading()

    expect(document.activeElement.dataset.testid).toBe('home-heading')
  })

  it('focuses the upgrade notice heading wherever it is showing', () => {
    document.body.innerHTML =
      heading('home-heading') + heading('upgrade-notice-title')

    focusUpgradeNotice()

    expect(document.activeElement.dataset.testid).toBe('upgrade-notice-title')
  })

  it('leaves focus alone when no upgrade notice is showing', () => {
    document.body.innerHTML = heading('stage-heading')
    const before = document.activeElement

    focusUpgradeNotice()

    expect(document.activeElement).toBe(before)
  })
})

describe('focusControl', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  const row = (id) =>
    `<li data-step-id="${id}">
      <input data-field="name" />
      <button data-control="delete">Delete</button>
    </li>`

  it('focuses the first match inside the container', () => {
    document.body.innerHTML = `<ol>${row('a')}${row('b')}</ol>`
    const second = document.querySelector('[data-step-id="b"]')

    focusControl(second, fieldSelector('name'))

    expect(document.activeElement).toBe(second.querySelector('input'))
  })

  it('finds a control by either its control or its field name', () => {
    document.body.innerHTML = row('a')

    focusControl(document.body, controlSelector('delete'))
    expect(document.activeElement.dataset.control).toBe('delete')

    focusControl(document.body, controlSelector('name'))
    expect(document.activeElement.dataset.field).toBe('name')
  })

  it('does nothing when nothing matches or there is no container', () => {
    document.body.innerHTML = row('a')
    const before = document.activeElement

    focusControl(document.body, controlSelector('missing'))
    focusControl(undefined, controlSelector('delete'))

    expect(document.activeElement).toBe(before)
  })
})
