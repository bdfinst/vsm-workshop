import { describe, it, expect } from 'vitest'
import { createValueStream } from '../../../src/models/v2/valueStream.js'
import {
  STAGES,
  missingScopeFields,
  scopeReason,
  stageStatus,
  stepsReason,
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
    ['name', 'Add a name'],
    ['trigger', 'Add a trigger'],
    ['endPoint', 'Add an end point'],
    ['unitOfWork', 'Add a unit of work'],
  ])('names only the missing %s', (field, reason) => {
    expect(scopeReason([field])).toBe(reason)
  })

  it('lists several missing fields together in one reason', () => {
    expect(scopeReason(['name', 'trigger'])).toBe('Add a name and a trigger')
    expect(scopeReason(['endPoint', 'unitOfWork'])).toBe(
      'Add an end point and a unit of work'
    )
    expect(scopeReason(['name', 'endPoint', 'unitOfWork'])).toBe(
      'Add a name, an end point and a unit of work'
    )
  })

  it('names all four, without repeating the article, when everything is missing', () => {
    expect(scopeReason(missingScopeFields(createValueStream()))).toBe(
      'Add a name, trigger, end point and unit of work'
    )
  })

  it('treats a whitespace-only name as missing', () => {
    const stream = createValueStream({ ...filledScope, name: '   ' })

    expect(scopeReason(missingScopeFields(stream))).toBe('Add a name')
  })
})

describe('stageStatus', () => {
  const byName = (statuses) =>
    Object.fromEntries(statuses.map((status) => [status.name, status]))

  it('marks stages beyond the furthest reached as not selectable', () => {
    const statuses = byName(stageStatus(streamAt(2, 2)))

    expect(statuses.Scope.state).toBe('complete')
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

  it('has no completion verdict yet for reached stages without rules', () => {
    const steps = byName(stageStatus(streamAt(2, 2))).Steps

    expect(steps.state).toBe('reached')
    expect(steps.reason).toBeNull()
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
