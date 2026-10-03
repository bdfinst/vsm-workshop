import { createStep } from '../../../src/models/v2/step.js'

/**
 * Step builders with no test-runner or store imports, so Playwright specs can
 * share them with the Vitest suites (tests/unit/v2/fixtures.js re-exports them).
 * Times are in minutes.
 */

/** The working day, in hours, of the streams the tests build. */
export const REFERENCE_WORKDAY_HOURS = 8

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

// The position of the first step called `name`, or an error: a fixture that
// edits a step that is not there would otherwise change nothing and let the
// test pass for the wrong reason.
const positionOf = (steps, name) => {
  const at = steps.findIndex((step) => step.name === name)
  if (at === -1) throw new Error(`No step named ${name}`)
  return at
}

// Patches only the first step called `name`, as positionOf and insertAfter do.
export const withStep = (steps, name, patch) => {
  const at = positionOf(steps, name)
  return steps.map((step, index) =>
    index === at ? { ...step, ...patch } : step
  )
}

export const withWait = (steps, name, waitTime) =>
  withStep(steps, name, { waitTime })

export const withoutWait = (steps, ...names) =>
  names.reduce((acc, name) => withWait(acc, name, { typ: null }), steps)

export const insertAfter = (steps, name, step) => {
  const at = positionOf(steps, name) + 1
  return [...steps.slice(0, at), step, ...steps.slice(at)]
}
