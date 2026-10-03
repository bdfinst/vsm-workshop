import { createStep } from '../../../src/models/v2/step.js'

/**
 * Step builders with no test-runner or store imports, so Playwright specs can
 * share them with the Vitest suites (tests/unit/v2/fixtures.js re-exports them).
 * Times are in minutes.
 */

/** A team step with %C/A 100 unless given. */
export const team = (name, process, wait, pctCA = 100) =>
  createStep({
    name,
    processTime: { typ: process },
    waitTime: { typ: wait },
    pctCA,
  })

export const outsideStep = (name, elapsed) =>
  createStep({ name, kind: 'outside', elapsedTime: { typ: elapsed } })

/** The Slice 1 Background table: process and wait in minutes, all %C/A 100. */
export const referenceSteps = () => [
  team('Intake', 60, 2400),
  team('Refinement', 240, 480),
  team('Development', 480, 960),
  team('Code review', 60, 2880),
  team('Deploy', 30, 1440),
]

/** The reference steps with Code review at %C/A 80 (the rework map's steps). */
export const reworkSteps = () =>
  withStep(referenceSteps(), 'Code review', { pctCA: 80 })

export const withStep = (steps, name, patch) =>
  steps.map((step) => (step.name === name ? { ...step, ...patch } : step))

export const withWait = (steps, name, waitTime) =>
  withStep(steps, name, { waitTime })

export const withoutWait = (steps, ...names) =>
  names.reduce((acc, name) => withWait(acc, name, { typ: null }), steps)

export const insertAfter = (steps, name, step) => {
  const at = steps.findIndex((s) => s.name === name) + 1
  return [...steps.slice(0, at), step, ...steps.slice(at)]
}
