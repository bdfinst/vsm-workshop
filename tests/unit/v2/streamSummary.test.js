import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { streamSummary } from '../../../src/utils/ui/streamSummary.js'
import { createMapVersion } from '../../../src/models/v2/mapVersion.js'
import { createStep } from '../../../src/models/v2/step.js'
import { withFutureState, referenceStream, streamOf } from './fixtures.js'

const NOW = new Date('2026-03-12T09:00:00.000Z')
const TWO_DAYS_BEFORE = '2026-03-10T09:00:00.000Z'

const reviewStream = (overrides) =>
  referenceStream({
    session: { activeStage: 4, furthestStage: 6 },
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: TWO_DAYS_BEFORE,
    ...overrides,
  })

describe('streamSummary', () => {
  // `created` is the day in UTC; a machine zone far from UTC must not move it.
  const originalZone = process.env.TZ
  beforeAll(() => {
    process.env.TZ = 'Pacific/Kiritimati'
  })
  afterAll(() => {
    if (originalZone === undefined) delete process.env.TZ
    else process.env.TZ = originalZone
  })

  it('summarises a named stream by name, steps, furthest stage and last update', () => {
    expect(streamSummary(reviewStream(), NOW)).toEqual({
      id: expect.any(String),
      name: 'Checkout delivery',
      rawName: 'Checkout delivery',
      steps: '5 steps',
      furthestStage: 'Review',
      updated: 'Updated 2 days ago',
      created: null,
    })
  })

  it('names the stream it summarises', () => {
    const stream = reviewStream()
    expect(streamSummary(stream, NOW).id).toBe(stream.id)
  })

  it('uses the furthest stage reached, not the one the stream is on', () => {
    const stream = reviewStream({
      session: { activeStage: 1, furthestStage: 3 },
    })
    expect(streamSummary(stream, NOW).furthestStage).toBe('Time')
  })

  it('says "1 step" for a single step', () => {
    const stream = streamOf(
      createMapVersion({ steps: [createStep({ name: 'Intake' })] })
    )
    expect(streamSummary(stream, NOW).steps).toBe('1 step')
  })

  it('counts the steps of the version being edited', () => {
    const stream = withFutureState(reviewStream())
    const [current, future] = stream.versions
    const longer = {
      ...future,
      steps: [...future.steps, createStep({ name: 'Extra' })],
    }
    const withFutureActive = {
      ...stream,
      versions: [current, longer],
      activeVersionId: longer.id,
    }
    expect(streamSummary(withFutureActive, NOW).steps).toBe('6 steps')
    expect(
      streamSummary({ ...withFutureActive, activeVersionId: current.id }, NOW)
        .steps
    ).toBe('5 steps')
  })

  it.each([
    ['blank', ''],
    ['spaces only', '   '],
  ])('shows an untitled stream (%s name) with its created date', (_, name) => {
    const summary = streamSummary(
      reviewStream({ name, createdAt: '2026-03-03T23:30:00.000Z' }),
      NOW
    )
    expect(summary.name).toBe('Untitled value stream')
    expect(summary.created).toBe('Created 3 Mar')
  })

  it('tells two untitled streams apart by created date', () => {
    const [first, second] = [
      '2026-03-03T08:00:00.000Z',
      '2026-03-05T08:00:00.000Z',
    ].map((createdAt) =>
      streamSummary(reviewStream({ name: '', createdAt }), NOW)
    )
    expect([first.created, second.created]).toEqual([
      'Created 3 Mar',
      'Created 5 Mar',
    ])
  })

  it('keeps the stored name as it is, apart from the name shown', () => {
    expect(streamSummary(reviewStream({ name: '' }), NOW)).toMatchObject({
      name: 'Untitled value stream',
      rawName: '',
    })
    expect(streamSummary(reviewStream({ name: '  Plan ' }), NOW)).toMatchObject(
      { name: 'Plan', rawName: '  Plan ' }
    )
  })

  it.each([
    { furthestStage: 7, expected: 'Future' },
    { furthestStage: 8, expected: 'Future' },
    { furthestStage: 99, expected: 'Future' },
    { furthestStage: 0, expected: 'Scope' },
    { furthestStage: -2, expected: 'Scope' },
    { furthestStage: 2.5, expected: 'Scope' },
    { furthestStage: '3', expected: 'Scope' },
    { furthestStage: undefined, expected: 'Scope' },
    { furthestStage: null, expected: 'Scope' },
  ])(
    'names a stage for a furthest stage of $furthestStage: $expected',
    ({ furthestStage, expected }) => {
      const stream = reviewStream({
        session: { activeStage: 1, furthestStage },
      })
      expect(streamSummary(stream, NOW).furthestStage).toBe(expected)
    }
  )

  it('leaves out a timestamp it cannot read instead of failing', () => {
    const summary = streamSummary(
      reviewStream({ name: '', createdAt: 'x', updatedAt: undefined }),
      NOW
    )
    expect(summary.created).toBeNull()
    expect(summary.updated).toBeNull()
  })

  it('accepts now as a number of milliseconds or an ISO string', () => {
    const stream = reviewStream()
    const expected = streamSummary(stream, NOW).updated
    expect(streamSummary(stream, NOW.getTime()).updated).toBe(expected)
    expect(streamSummary(stream, NOW.toISOString()).updated).toBe(expected)
  })
})
