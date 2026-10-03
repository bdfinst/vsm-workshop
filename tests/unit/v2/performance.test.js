import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import { performance } from 'node:perf_hooks'
import { calculateMetrics } from '../../../src/utils/calculations/v2/index.js'
import { validateVersion } from '../../../src/utils/validation/v2/versionValidator.js'
import { MIN_SCALED_BOX_WIDTH } from '../../../src/utils/ui/ladderGeometry.js'
import { LADDER_MODE, sizeLadder } from '../../../src/utils/ui/ladderLayout.js'
import { ladderModel } from '../../../src/utils/ui/ladderModel.js'
import {
  labelOverhangFor,
  layoutLabels,
  pixelsPerMinuteToFit,
} from '../../../src/utils/ui/ladderView.js'
import {
  openStream,
  pathBetween,
  streamOf,
  team,
  versionOf,
} from './fixtures.js'

// The recalculation budget: after an edit, metrics plus layout stay well
// inside the 200 ms an editor can feel as instant. The benchmarks assert the
// budget on the median of many runs, so one slow tick on a busy CI machine
// does not fail them.
const BUDGET_MS = 200
const STEP_COUNT = 40
const PATHS_PER_STEP = 2
const WARM_UP_RUNS = 5
const MEASURED_RUNS = 20
const SCROLLER_WIDTH = 1200 // pixels the ladder is fitted into

// 40 team steps (Intake first) at %C/A 90, each with two rework paths that go backward
// (to the step before it and to Intake; the first steps can only go back to
// themselves), their shares adding to 100.
const stepName = (index) => (index === 0 ? 'Intake' : `Step ${index}`)

const bigSteps = () =>
  Array.from({ length: STEP_COUNT }, (_, index) =>
    team(stepName(index), 30 + index, 120 + index * 3, 90)
  )

const reworkTargets = (index) => [Math.max(index - 1, 0), index > 1 ? 0 : index]

const bigPaths = (steps) =>
  steps.flatMap((_, index) =>
    reworkTargets(index).map((target) =>
      pathBetween(steps, stepName(index), stepName(target), {
        shareOfRejects: 100 / PATHS_PER_STEP,
      })
    )
  )

const bigVersion = () => {
  const steps = bigSteps()
  return versionOf(steps, bigPaths(steps))
}

const median = (numbers) => {
  const sorted = [...numbers].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

// Milliseconds one call to `work` takes, as the median of the measured runs
// after the warm-up runs.
const medianMs = (work) => {
  for (let run = 0; run < WARM_UP_RUNS; run++) work()
  const timings = Array.from({ length: MEASURED_RUNS }, () => {
    const start = performance.now()
    work()
    return performance.now() - start
  })
  return median(timings)
}

describe('recalculation budget', () => {
  it('the fixture is 40 steps with 80 backward rework paths', () => {
    const version = bigVersion()
    const { steps, reworkPaths } = version
    const indexOf = (id) => steps.findIndex((step) => step.id === id)

    expect(steps).toHaveLength(STEP_COUNT)
    expect(reworkPaths).toHaveLength(STEP_COUNT * PATHS_PER_STEP)
    for (const path of reworkPaths) {
      expect(indexOf(path.toStepId)).toBeLessThanOrEqual(
        indexOf(path.fromStepId)
      )
    }
    expect(steps.every((step) => step.pctCA < 100)).toBe(true)
    expect(validateVersion(version).valid).toBe(true)
  })

  it('metrics plus layout take under 200 ms (median of 20 runs)', () => {
    const version = bigVersion()

    // Everything LadderMap derives after an edit: the model, the fit, the
    // sized boxes and the label layout.
    const typicalMs = medianMs(() => {
      const { flags } = calculateMetrics(version)
      const model = ladderModel(version, flags)
      const availableWidth =
        SCROLLER_WIDTH - labelOverhangFor(model.steps, MIN_SCALED_BOX_WIDTH)
      const { steps } = sizeLadder(model, {
        mode: LADDER_MODE.SCALED,
        pixelsPerMinute: pixelsPerMinuteToFit(model, availableWidth),
      })
      layoutLabels(steps)
    })

    expect(typicalMs).toBeLessThan(BUDGET_MS)
  })

  it('an edit through the store refreshes the ladder and metrics under 200 ms (median of 20 runs)', () => {
    const { store } = openStream(streamOf(bigVersion()))
    const target = store.activeVersion.steps[STEP_COUNT - 1]
    let minutes = target.processTime.typ

    const typicalMs = medianMs(() => {
      minutes += 1
      store.updateStep(target.id, { processTime: { typ: minutes } })
      flushSync()
      void [store.metrics.flags, store.ladderModel.steps]
    })

    expect(store.ladderModel.steps[STEP_COUNT - 1].minutes.process).toBe(
      minutes
    )
    expect(typicalMs).toBeLessThan(BUDGET_MS)
  })
})
