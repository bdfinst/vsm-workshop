import { describe, it, expect } from 'vitest'
import {
  STAGE_NUMBER,
  clampStage,
  stageName,
} from '../../../src/models/v2/constants.js'
import { createValueStream } from '../../../src/models/v2/valueStream.js'
import {
  STAGES,
  missingScopeFields,
  missingTimeFields,
  scopeReason,
  stageStatus,
  stepsReason,
  timeReason,
} from '../../../src/utils/session/stages.js'

const filledScope = {
  name: 'Checkout delivery',
  trigger: 'A customer asks for a change',
  endPoint: 'The change is live',
  unitOfWork: 'story',
}

const streamAt = (activeStage, furthestStage, fields = {}) =>
  createValueStream({
    ...filledScope,
    session: { activeStage, furthestStage },
    ...fields,
  })

describe('stageName', () => {
  it.each([
    [1, 'Scope'],
    [2, 'Steps'],
    [3, 'Time'],
    [4, 'Quality'],
    [5, 'Rework'],
    [6, 'Review'],
    [7, 'Future'],
  ])('names stage %i %s', (stage, name) => {
    expect(stageName(stage)).toBe(name)
  })

  // A stage number from a file can hold anything; a name is always given.
  it.each([
    [8, 'Future'],
    [99, 'Future'],
    [0, 'Scope'],
    [-2, 'Scope'],
    [2.5, 'Scope'],
    ['3', 'Scope'],
    [undefined, 'Scope'],
    [null, 'Scope'],
  ])('names stage %j as %s, the nearest stage', (stage, name) => {
    expect(stageName(stage)).toBe(name)
  })
})

describe('clampStage', () => {
  it.each([
    [1, 1],
    [4, 4],
    [7, 7],
    [8, 7],
    [0, 1],
    [-3, 1],
    [2.5, 1],
    ['3', 1],
    [undefined, 1],
  ])('turns %j into stage %i', (stage, expected) => {
    expect(clampStage(stage)).toBe(expected)
  })
})

describe('STAGES', () => {
  it('lists the seven stages in order, numbered from 1', () => {
    expect(STAGES.map((stage) => stage.name)).toEqual([
      'Scope',
      'Steps',
      'Time',
      'Quality',
      'Rework',
      'Review',
      'Future',
    ])
    expect(STAGES.map((stage) => stage.number)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('numbers each stage as STAGE_NUMBER names it', () => {
    const numberOf = (name) =>
      STAGES.find((stage) => stage.name === name).number

    expect(STAGE_NUMBER).toEqual({
      SCOPE: numberOf('Scope'),
      STEPS: numberOf('Steps'),
      TIME: numberOf('Time'),
      QUALITY: numberOf('Quality'),
      REWORK: numberOf('Rework'),
      REVIEW: numberOf('Review'),
      FUTURE: numberOf('Future'),
    })
  })
})

describe('STAGES prompts', () => {
  const filled = expect.stringMatching(/\S/)
  const fullCard = { question: filled, explanation: filled, example: filled }
  const promptOf = (name) => STAGES.find((stage) => stage.name === name).prompt

  it.each(['Scope', 'Steps', 'Time'])('gives %s a prompt card', (name) => {
    expect(promptOf(name)).toEqual(fullCard)
  })

  it('gives every stage that has a prompt a full card', () => {
    const prompts = STAGES.filter((stage) => stage.prompt).map(
      (stage) => stage.prompt
    )

    expect(prompts).toEqual(prompts.map(() => fullCard))
  })

  it('gives every other stage no prompt at all', () => {
    const prompts = STAGES.filter((stage) => !stage.prompt).map(
      (stage) => stage.prompt
    )

    expect(prompts).toEqual(prompts.map(() => null))
  })
})

describe('missingScopeFields', () => {
  it('names nothing when every field is filled', () => {
    expect(missingScopeFields(filledScope)).toEqual([])
  })

  it('names every field of a new stream, in form order', () => {
    expect(missingScopeFields(createValueStream())).toEqual([
      'name',
      'trigger',
      'endPoint',
      'unitOfWork',
    ])
  })

  it.each(['name', 'trigger', 'endPoint'])(
    'counts a whitespace-only %s as empty',
    (field) => {
      expect(missingScopeFields({ ...filledScope, [field]: '  \t ' })).toEqual([
        field,
      ])
    }
  )

  it('counts a missing unit of work, or one that is not offered, as empty', () => {
    expect(missingScopeFields({ ...filledScope, unitOfWork: null })).toEqual([
      'unitOfWork',
    ])
    expect(missingScopeFields({ ...filledScope, unitOfWork: 'epic' })).toEqual([
      'unitOfWork',
    ])
  })
})

describe('scopeReason', () => {
  it('is null when nothing is missing', () => {
    expect(scopeReason([])).toBeNull()
  })

  it.each([
    ['name', 'Add a name in the header'],
    ['trigger', 'Add a trigger'],
    ['endPoint', 'Add an end point'],
    ['unitOfWork', 'Add a unit of work'],
  ])('names only the missing %s', (field, reason) => {
    expect(scopeReason([field])).toBe(reason)
  })

  it('lists several missing fields together in one reason', () => {
    expect(scopeReason(['name', 'trigger'])).toBe(
      'Add a name in the header and a trigger'
    )
    expect(scopeReason(['endPoint', 'unitOfWork'])).toBe(
      'Add an end point and a unit of work'
    )
    expect(scopeReason(['name', 'endPoint', 'unitOfWork'])).toBe(
      'Add a name in the header, an end point and a unit of work'
    )
  })

  it('names all four, without repeating the article, when everything is missing', () => {
    expect(scopeReason(missingScopeFields(createValueStream()))).toBe(
      'Add a name in the header, trigger, end point and unit of work'
    )
  })

  it('treats a whitespace-only name as missing', () => {
    const stream = createValueStream({ ...filledScope, name: '   ' })

    expect(scopeReason(missingScopeFields(stream))).toBe(
      'Add a name in the header'
    )
  })
})

describe('stageStatus', () => {
  const byName = (statuses) =>
    Object.fromEntries(statuses.map((status) => [status.name, status]))

  it('marks stages beyond the furthest reached as not selectable', () => {
    const statuses = byName(stageStatus(streamAt(2, 2)))

    expect(statuses.Steps.state).toBe('reached')
    expect(statuses.Time.state).toBe('not-selectable')
    expect(statuses.Future.state).toBe('not-selectable')
  })

  it('marks Scope complete when its fields are filled', () => {
    expect(byName(stageStatus(streamAt(2, 2))).Scope.state).toBe('complete')
  })

  it('marks a reached Scope that has lost a field as needing attention, with the reason', () => {
    const statuses = byName(stageStatus(streamAt(2, 2, { trigger: ' ' })))

    expect(statuses.Scope.state).toBe('needs-attention')
    expect(statuses.Scope.reason).toBe('Add a trigger')
  })

  it('derives completion from the data, so fixing the field clears it', () => {
    const broken = streamAt(2, 2, { name: '' })
    const fixed = { ...broken, name: 'Checkout delivery' }

    expect(byName(stageStatus(broken)).Scope.state).toBe('needs-attention')
    expect(byName(stageStatus(fixed)).Scope.state).toBe('complete')
  })

  it('has no completion verdict for a reached stage that has no rule', () => {
    const noRules = {}

    const statuses = stageStatus(streamAt(7, 7), noRules)

    expect(statuses.map(({ state, reason }) => ({ state, reason }))).toEqual(
      statuses.map(() => ({ state: 'reached', reason: null }))
    )
  })
})

describe('stepsReason', () => {
  const intake = { name: 'Intake', performedBy: 'Product owner' }
  const refinement = { name: 'Refinement', performedBy: 'Dev team' }

  it('is null when there are two steps, all named and with a performer', () => {
    expect(stepsReason([intake, refinement])).toBeNull()
  })

  it.each([[[]], [[intake]]])('asks for a step after Intake: %j', (steps) => {
    expect(stepsReason(steps)).toBe('Add at least one step after Intake')
  })

  it('asks for a step after Intake before anything else is missing', () => {
    expect(stepsReason([{ name: 'Intake', performedBy: '' }])).toBe(
      'Add at least one step after Intake'
    )
  })

  it.each(['', '   '])('asks for a name when one is %j', (name) => {
    expect(stepsReason([intake, { ...refinement, name }])).toBe(
      'Name every step'
    )
  })

  it('asks for a name before a performer', () => {
    const steps = [
      { ...intake, performedBy: '' },
      { ...refinement, name: '' },
    ]

    expect(stepsReason(steps)).toBe('Name every step')
  })

  it.each(['', '  '])('names the step missing a performer: %j', (blank) => {
    expect(stepsReason([intake, { ...refinement, performedBy: blank }])).toBe(
      'Add who does "Refinement"'
    )
  })

  it('names the first step missing a performer, Intake included', () => {
    const steps = [
      { ...intake, performedBy: '' },
      { ...refinement, performedBy: '' },
    ]

    expect(stepsReason(steps)).toBe('Add who does "Intake"')
  })

  it('trims the name it quotes', () => {
    const steps = [intake, { name: ' Refinement ', performedBy: '' }]

    expect(stepsReason(steps)).toBe('Add who does "Refinement"')
  })
})

describe('missingTimeFields', () => {
  const team = (name, processTypical, wait) => ({
    name,
    kind: 'team',
    processTime: { typ: processTypical },
    waitTime: { typ: wait },
  })
  const outside = (name, elapsed) => ({
    name,
    kind: 'outside',
    elapsedTime: { typ: elapsed },
  })

  it('is empty when every typical time is entered, zero included', () => {
    const steps = [team('Intake', 0, 0), outside('Security review', 60)]

    expect(missingTimeFields(steps)).toEqual([])
  })

  it('names the step and noun of each missing typical time, in step order', () => {
    const steps = [team('Intake', null, 5), team('Deploy', 10, null)]

    expect(missingTimeFields(steps)).toEqual([
      { stepLabel: 'Intake', noun: 'process time' },
      { stepLabel: 'Deploy', noun: 'wait time' },
    ])
  })

  it('asks a team step for process time then wait time', () => {
    expect(missingTimeFields([team('Build', null, null)])).toEqual([
      { stepLabel: 'Build', noun: 'process time' },
      { stepLabel: 'Build', noun: 'wait time' },
    ])
  })

  it('asks an outside step for its elapsed time only', () => {
    expect(missingTimeFields([outside('Security review', null)])).toEqual([
      { stepLabel: 'Security review', noun: 'elapsed time' },
    ])
  })

  it('treats a time range that is not entered at all as missing', () => {
    const step = {
      name: 'Build',
      kind: 'team',
      processTime: null,
      waitTime: { typ: 1 },
    }

    expect(missingTimeFields([step])).toEqual([
      { stepLabel: 'Build', noun: 'process time' },
    ])
  })

  it('calls a step with no name by its position', () => {
    expect(
      missingTimeFields([team('Intake', 1, 1), team(' ', null, 1)])
    ).toEqual([{ stepLabel: 'step 2', noun: 'process time' }])
  })

  it.each([
    ['null', null],
    ['not set', undefined],
  ])(
    'treats an outside step whose elapsed time is %s as missing',
    (_, elapsed) => {
      const step = {
        name: 'Security review',
        kind: 'outside',
        elapsedTime: elapsed,
      }

      expect(missingTimeFields([step])).toEqual([
        { stepLabel: 'Security review', noun: 'elapsed time' },
      ])
    }
  )

  it('treats a range with no typical time set as missing', () => {
    const step = {
      name: 'Build',
      kind: 'team',
      processTime: { min: 5 },
      waitTime: { typ: undefined },
    }

    expect(missingTimeFields([step])).toEqual([
      { stepLabel: 'Build', noun: 'process time' },
      { stepLabel: 'Build', noun: 'wait time' },
    ])
  })

  it('is empty when there are no steps', () => {
    expect(missingTimeFields([])).toEqual([])
  })
})

describe('timeReason', () => {
  const complete = {
    name: 'Deploy',
    kind: 'team',
    processTime: { typ: 0 },
    waitTime: { typ: 0 },
  }

  it('is null when every typical time is entered and nothing is invalid', () => {
    expect(timeReason([complete], false)).toBeNull()
  })

  it('names the one missing field', () => {
    const steps = [{ ...complete, waitTime: { typ: null } }]

    expect(timeReason(steps, false)).toBe('Add the wait time for "Deploy"')
  })

  it('joins two missing fields with "and"', () => {
    const steps = [
      { ...complete, name: 'Intake', processTime: { typ: null } },
      { ...complete, name: 'Deploy', waitTime: { typ: null } },
    ]

    expect(timeReason(steps, false)).toBe(
      'Add the process time for "Intake" and the wait time for "Deploy"'
    )
  })

  it('names every missing field, joined like the Scope gate', () => {
    const steps = [
      { ...complete, name: 'Intake', processTime: { typ: null } },
      { ...complete, name: 'Deploy', waitTime: { typ: null } },
      { name: 'Security review', kind: 'outside', elapsedTime: { typ: null } },
    ]

    expect(timeReason(steps, false)).toBe(
      'Add the process time for "Intake", the wait time for "Deploy" and the elapsed time for "Security review"'
    )
  })

  it('is null when there are no steps and nothing is invalid', () => {
    expect(timeReason([], false)).toBeNull()
  })

  it('says to fix an invalid entry even when nothing is missing', () => {
    expect(timeReason([complete], true)).toBe(
      'Fix the times that show an error'
    )
  })

  it('says to fix an invalid entry before it names what is missing', () => {
    const steps = [{ ...complete, waitTime: { typ: null } }]

    expect(timeReason(steps, true)).toBe('Fix the times that show an error')
  })
})
