import { describe, it, expect } from 'vitest'
import { OUTLINE, ladderModel } from '../../../src/utils/ui/ladderModel.js'
import { calculateMetrics } from '../../../src/utils/calculations/v2/index.js'
import { reworkSteps, team, versionOf } from './fixtures.js'

const modelOf = (steps, flags) => {
  const version = versionOf(steps)
  return ladderModel(version, flags ?? calculateMetrics(version).flags)
}

const flaggedNames = (model, label) =>
  model.steps
    .filter((step) => step.flags.some((flag) => flag.label === label))
    .map((step) => step.name)

describe('ladderModel', () => {
  it('holds what does not depend on the view: minutes, encodings, flags', () => {
    const model = modelOf(reworkSteps())

    const codeReview = model.steps.find((s) => s.name === 'Code review')
    expect(codeReview).toMatchObject({
      minutes: { wait: 2880, process: 60 },
      outline: OUTLINE.SOLID,
      flags: [
        { kind: 'largest-wait', label: 'largest wait', tone: 'warn' },
        { kind: 'lowest-ca', label: 'lowest %C/A', tone: 'crit' },
      ],
    })
    expect(codeReview).not.toHaveProperty('x')
    expect(codeReview).not.toHaveProperty('boxWidth')
  })

  it('uses the flags it is given instead of working them out', () => {
    const version = versionOf(reworkSteps())
    const { flags } = calculateMetrics(version)

    const model = ladderModel(version, { ...flags, lowestCA: null })

    expect(
      model.steps
        .find((s) => s.name === 'Code review')
        .flags.map(({ label }) => label)
    ).toEqual(['largest wait'])
  })

  // Scenario: Each version's ladder model carries its own flags
  it("Each version's ladder model carries its own flags", () => {
    const current = versionOf([
      team('Intake', 10, 20),
      team('Code review', 10, 2880),
      team('Deploy', 10, 60),
    ])
    const draft = versionOf([
      team('Intake', 10, 20),
      team('Code review', 10, 60),
      team('Deploy', 10, 2880),
    ])
    const [currentModel, draftModel] = [current, draft].map((version) =>
      ladderModel(version, calculateMetrics(version).flags)
    )

    expect(flaggedNames(currentModel, 'largest wait')).toEqual(['Code review'])
    expect(flaggedNames(draftModel, 'largest wait')).toEqual(['Deploy'])
  })
})
