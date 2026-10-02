import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, unmount, flushSync } from 'svelte'
import { createStep } from '../../../src/models/v2/step.js'
import TimeStage from '../../../src/components/session/stages/TimeStage.svelte'
import { openStream, streamOf, versionOf } from './fixtures.js'

// The store refuses an edit to a step that holds a value it would not accept.
// A stored process time of 1.5 minutes is not whole, so any edit to that step
// is refused until it is corrected, whichever field the edit is on.
const NOT_WHOLE = 'Process time must be a whole number of minutes, 0 or more'
const FIX_REASON = 'Fix the times that show an error'

const team = (name, processTime, waitTime) =>
  createStep({ name, processTime, waitTime })

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

// Type into a field and leave it, as a person does.
const enter = (name, testid, text) => {
  const field = input(name, testid)
  field.value = text
  field.dispatchEvent(new Event('input', { bubbles: true }))
  field.dispatchEvent(new Event('blur'))
  flushSync()
}

const steps = () => [
  team('Intake', { typ: 30 }, { typ: 30 }),
  team('Development', { typ: 1.5 }, { typ: 120 }),
  team('Deploy', { typ: 60 }, { typ: 60 }),
]

describe('TimeStage when the store refuses an edit', () => {
  it('shows why, keeps the typed text and holds Next', () => {
    render(steps())
    expect(nextButton()).not.toHaveAttribute('aria-disabled')

    enter('Development', 'wait-time', '3')

    expect(refusals()).toEqual([NOT_WHOLE])
    expect(input('Development', 'wait-time')).toHaveValue('3')
    expect(nextButton()).toHaveAttribute('aria-disabled', 'true')
    expect(nextReason()).toBe(FIX_REASON)
  })

  it('keeps the refusal and Next held when another field is saved', () => {
    const store = render(steps())
    enter('Development', 'wait-time', '3')

    // Development's process time reads in hours, so this is 2 hours.
    enter('Development', 'process-time', '2')

    expect(store.activeVersion.steps[1].processTime).toEqual({ typ: 120 })
    expect(refusals()).toEqual([NOT_WHOLE])
    expect(nextButton()).toHaveAttribute('aria-disabled', 'true')
  })

  it('keeps the refusal when another field is committed with no change', () => {
    render(steps())
    enter('Development', 'wait-time', '3')

    // Deploy's process time of 60 minutes already reads as "1" hour.
    enter('Deploy', 'process-time', '1')

    expect(refusals()).toEqual([NOT_WHOLE])
    expect(nextButton()).toHaveAttribute('aria-disabled', 'true')
  })

  it('clears the refusal and frees Next once the same field saves', () => {
    const store = render(steps())
    enter('Development', 'wait-time', '3')
    enter('Development', 'process-time', '2')

    input('Development', 'wait-time').dispatchEvent(new Event('blur'))
    flushSync()

    expect(refusals()).toEqual([])
    expect(nextButton()).not.toHaveAttribute('aria-disabled')
    expect(store.activeVersion.steps[1].waitTime).toEqual({ typ: 180 })
  })
})

describe('TimeStage source switch the store refuses', () => {
  it('shows why and leaves the source as it was', () => {
    const store = render([
      team('Intake', { typ: 30 }, { typ: 30 }),
      createStep({
        name: 'Security review',
        kind: 'outside',
        elapsedTime: { typ: 240 },
        processTime: { typ: 5 },
      }),
    ])

    rowOf('Security review')
      .querySelector('[data-testid="time-source-button"]')
      .click()
    flushSync()

    expect(refusals()).toEqual(['An outside step has no process time'])
    expect(store.activeVersion.steps[1].timeSource).toBe('estimate')
  })
})
