import { describe, it, expect } from 'vitest'
import {
  insertAfter,
  outsideStep,
  referenceSteps,
  team,
  withStep,
  withWait,
  withoutWait,
} from './stepFixtures.js'

// A fixture that edits a step that is not there would change nothing and let a
// test pass for the wrong reason, so each refuses an unknown name.
describe('stepFixtures: unknown step names', () => {
  it.each([
    ['withStep', (steps) => withStep(steps, 'Nope', { pctCA: 50 })],
    ['withWait', (steps) => withWait(steps, 'Nope', { typ: 1 })],
    ['withoutWait', (steps) => withoutWait(steps, 'Deploy', 'Nope')],
    ['insertAfter', (steps) => insertAfter(steps, 'Nope', team('New', 1, 1))],
  ])('%s throws "No step named Nope"', (_, edit) => {
    expect(() => edit(referenceSteps())).toThrow('No step named Nope')
  })
})

describe('stepFixtures: known step names', () => {
  it('withStep patches only the named step and leaves the input alone', () => {
    const steps = referenceSteps()

    const patched = withStep(steps, 'Deploy', { pctCA: 50 })

    expect(patched.map((step) => step.pctCA)).toEqual([100, 100, 100, 100, 50])
    expect(steps.every((step) => step.pctCA === 100)).toBe(true)
  })

  it('withoutWait clears the wait of every name given', () => {
    const cleared = withoutWait(referenceSteps(), 'Intake', 'Deploy')

    expect(cleared.map((step) => step.waitTime.typ)).toEqual([
      null,
      480,
      960,
      2880,
      null,
    ])
  })

  it('insertAfter leaves the input alone', () => {
    const steps = referenceSteps()
    const before = [...steps]

    insertAfter(steps, 'Code review', outsideStep('Security review', 1440))

    expect(steps).toEqual(before)
    expect(steps).toHaveLength(5)
  })

  it('insertAfter puts the step right after the named one', () => {
    const inserted = insertAfter(
      referenceSteps(),
      'Code review',
      outsideStep('Security review', 1440)
    )

    expect(inserted.map((step) => step.name)).toEqual([
      'Intake',
      'Refinement',
      'Development',
      'Code review',
      'Security review',
      'Deploy',
    ])
  })
})

// Fixtures address a step by name, and positionOf finds the first one, so a
// repeated name means the first step called that.
describe('stepFixtures: a name used twice', () => {
  const twins = () => [team('Twin', 10, 20), team('Twin', 30, 40)]

  it('withStep patches only the first step with the name', () => {
    const patched = withStep(twins(), 'Twin', { pctCA: 50 })

    expect(patched.map((step) => step.pctCA)).toEqual([50, 100])
  })

  it('withWait changes only the first step with the name', () => {
    const changed = withWait(twins(), 'Twin', { typ: 99 })

    expect(changed.map((step) => step.waitTime.typ)).toEqual([99, 40])
  })

  it('withoutWait clears only the first step with the name', () => {
    const cleared = withoutWait(twins(), 'Twin')

    expect(cleared.map((step) => step.waitTime.typ)).toEqual([null, 40])
  })

  it('insertAfter puts the step after the first step with the name', () => {
    const inserted = insertAfter(twins(), 'Twin', team('New', 1, 1))

    expect(inserted.map((step) => step.name)).toEqual(['Twin', 'New', 'Twin'])
  })
})
