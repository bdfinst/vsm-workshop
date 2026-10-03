import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, unmount, flushSync } from 'svelte'
import { createStep } from '../../../src/models/v2/step.js'
import TimeStage from '../../../src/components/session/stages/TimeStage.svelte'
import {
  openStream,
  outsideStep,
  stepNamed,
  streamOf,
  team,
  versionOf,
} from './fixtures.js'

// The store refuses an edit to a step that holds a value it would not accept.
// A stored process time of 1.5 minutes is not whole, so an edit that corrects
// that value is accepted, while an edit to another field of the step is
// refused until it is corrected.
const NOT_WHOLE_MESSAGE =
  'Process time must be a whole number of minutes, 0 or more'
const FIX_REASON = 'Fix the times that show an error'

let mounted = null

const render = (steps) => {
  const { store } = openStream(streamOf(versionOf(steps)))
  mounted = mount(TimeStage, {
    target: document.body,
    props: { store, onnext: vi.fn() },
  })
  flushSync()
  return store
}

afterEach(() => {
  if (mounted) unmount(mounted)
  mounted = null
  document.body.innerHTML = ''
})

const rowOf = (name) =>
  [...document.querySelectorAll('[data-testid="time-row"]')].find(
    (row) => row.querySelector('h3').textContent.trim() === name
  )
const input = (name, testid) =>
  rowOf(name).querySelector(`[data-testid="${testid}-input"]`)
const refusals = () =>
  [...document.querySelectorAll('[data-testid="time-refusal"]')].map(
    (element) => element.textContent.trim()
  )
const nextButton = () => document.querySelector('[data-testid="next-button"]')
const nextReason = () =>
  document.querySelector('[data-testid="next-reason"]').textContent.trim()

const type = (name, testid, text) => {
  const field = input(name, testid)
  field.value = text
  field.dispatchEvent(new Event('input', { bubbles: true }))
  flushSync()
}
const leave = (name, testid) => {
  input(name, testid).dispatchEvent(new Event('blur'))
  flushSync()
}

// Type into a field and leave it, as a person does.
const enter = (name, testid, text) => {
  type(name, testid, text)
  leave(name, testid)
}

const steps = () => [
  team('Intake', 30, 30),
  team('Development', 1.5, 120),
  team('Deploy', 60, 60),
]

describe('TimeStage when the store refuses an edit', () => {
  it('shows why, keeps the typed text and holds Next', () => {
    render(steps())
    expect(nextButton()).not.toHaveAttribute('aria-disabled')

    enter('Development', 'wait-time', '3')

    expect(refusals()).toEqual([NOT_WHOLE_MESSAGE])
    expect(input('Development', 'wait-time')).toHaveValue('3')
    expect(nextButton()).toHaveAttribute('aria-disabled', 'true')
    expect(nextReason()).toBe(FIX_REASON)
  })

  it('keeps the refusal and Next held when another field is saved', () => {
    const store = render(steps())
    enter('Development', 'wait-time', '3')

    // Development's process time reads in hours, so this is 2 hours.
    enter('Development', 'process-time', '2')

    expect(stepNamed(store, 'Development').processTime).toEqual({ typ: 120 })
    expect(refusals()).toEqual([NOT_WHOLE_MESSAGE])
    expect(nextButton()).toHaveAttribute('aria-disabled', 'true')
  })

  it('keeps the refusal when another field is committed with no change', () => {
    render(steps())
    enter('Development', 'wait-time', '3')

    // Deploy's process time of 60 minutes already reads as "1" hour.
    enter('Deploy', 'process-time', '1')

    expect(refusals()).toEqual([NOT_WHOLE_MESSAGE])
    expect(nextButton()).toHaveAttribute('aria-disabled', 'true')
  })

  it('clears the refusal and frees Next once the same field saves', () => {
    const store = render(steps())
    enter('Development', 'wait-time', '3')
    enter('Development', 'process-time', '2')

    leave('Development', 'wait-time')

    expect(refusals()).toEqual([])
    expect(nextButton()).not.toHaveAttribute('aria-disabled')
    expect(stepNamed(store, 'Development').waitTime).toEqual({ typ: 180 })
  })
})

describe('TimeStage when the refused field goes away', () => {
  it('frees Next and drops the reason when its step is removed', () => {
    const store = render(steps())
    enter('Development', 'wait-time', '3')

    store.deleteStep(stepNamed(store, 'Development').id)
    flushSync()

    expect(refusals()).toEqual([])
    expect(nextButton()).not.toHaveAttribute('aria-disabled')
  })

  it('drops the reason when its step switches to the other kind', () => {
    const store = render(steps())
    enter('Development', 'wait-time', '3')

    store.switchStepKind(stepNamed(store, 'Development').id, 'outside')
    flushSync()

    expect(refusals()).toEqual([])
    expect(nextReason()).toBe('Add the elapsed time for "Development"')
  })
})

describe('TimeStage source switch the store refuses', () => {
  const securityReview = () =>
    createStep({
      name: 'Security review',
      kind: 'outside',
      elapsedTime: { typ: 240 },
      processTime: { typ: 5 },
    })
  const toggle = () => {
    rowOf('Security review')
      .querySelector('[data-testid="time-source-button"]')
      .click()
    flushSync()
  }

  it('shows why and leaves the source as it was, without holding Next', () => {
    const store = render([team('Intake', 30, 30), securityReview()])

    toggle()

    expect(refusals()).toEqual(['An outside step has no process time'])
    expect(stepNamed(store, 'Security review').timeSource).toBe('estimate')
    expect(nextButton()).not.toHaveAttribute('aria-disabled')
  })

  it('clears the reason on the next successful switch of that step', () => {
    const store = render([team('Intake', 30, 30), securityReview()])
    toggle()

    store.updateStep(stepNamed(store, 'Security review').id, {
      processTime: null,
    })
    toggle()

    expect(refusals()).toEqual([])
    expect(stepNamed(store, 'Security review').timeSource).toBe('measured')
  })
})

describe('TimeStage when typed text ends where it started', () => {
  it('saves nothing for text typed and cleared on an empty field', () => {
    // A step saved with no wait time at all holds null, not { typ: null }.
    const store = render([
      { ...createStep({ name: 'Intake' }), waitTime: null },
    ])

    type('Intake', 'wait-time', '5')
    type('Intake', 'wait-time', '')
    leave('Intake', 'wait-time')

    expect(store.canUndo).toBe(false)
  })
})

describe('TimeStage elapsed time of an outside step', () => {
  it('saves one typical value and no range', () => {
    const store = render([team('Intake', 30, 30), outsideStep('Security', 240)])

    // 240 minutes reads as 4 hours.
    enter('Security', 'elapsed-time', '6')

    expect(stepNamed(store, 'Security').elapsedTime).toEqual({ typ: 360 })
  })
})
