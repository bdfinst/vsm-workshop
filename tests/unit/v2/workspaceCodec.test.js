import { describe, expect, it } from 'vitest'
import {
  createValueStream,
  displayName,
} from '../../../src/models/v2/valueStream.js'
import {
  parseWorkspace,
  serializeWorkspace,
} from '../../../src/persistence/v2/workspaceCodec.js'
import {
  pathBetween,
  referenceReworkStream,
  referenceSteps,
  referenceStream,
  streamOf,
  versionOf,
  withFutureState,
  workspaceOf,
} from './fixtures.js'

const withoutSavedAt = ({ savedAt: _savedAt, ...rest }) => rest

// The words the plan's "Workspace file is refused" scenarios quote.
const INVALID_JSON = "This file isn't valid JSON"
const NOT_A_WORKSPACE = "This isn't a VSM workspace file"
const NEWER_VERSION = 'This file was made by a newer version of the app'
const refusedWith = (error) => ({ ok: false, error })

describe('Workspace file round-trips', () => {
  it('Workspace file round-trips', () => {
    const checkout = referenceStream({ name: 'Checkout delivery' })
    const onboarding = withFutureState(
      referenceReworkStream({ name: 'Onboarding' })
    )
    const workspace = workspaceOf([checkout, onboarding])

    const result = parseWorkspace(serializeWorkspace(workspace))

    expect(result.ok).toBe(true)
    expect(withoutSavedAt(result.workspace)).toEqual(withoutSavedAt(workspace))
  })

  it('stamps savedAt with the time of writing', () => {
    const workspace = workspaceOf([referenceStream()])
    const now = new Date('2026-10-01T12:30:00.000Z')

    const result = parseWorkspace(serializeWorkspace(workspace, now))

    expect(result.workspace.savedAt).toBe('2026-10-01T12:30:00.000Z')
    expect(workspace.savedAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('An unnamed value stream round-trips', () => {
    const unnamed = referenceStream({ name: '' })

    const result = parseWorkspace(serializeWorkspace(workspaceOf([unnamed])))

    const [read] = result.workspace.streams
    expect(read.name).toBe('')
    expect(displayName(read)).toBe('Untitled value stream')
  })

  it('reads an empty workspace', () => {
    const result = parseWorkspace(serializeWorkspace(workspaceOf([])))

    expect(result.ok).toBe(true)
    expect(result.workspace.streams).toEqual([])
    expect(result.workspace.activeStreamId).toBeNull()
  })
})

describe('Workspace file is refused', () => {
  it.each([
    ['is not valid JSON', 'not json {', INVALID_JSON],
    ['is empty', '', INVALID_JSON],
    [
      'is valid JSON but not a workspace',
      JSON.stringify({ hello: 'world' }),
      NOT_A_WORKSPACE,
    ],
    ['is a JSON list', '[]', NOT_A_WORKSPACE],
    ['is JSON null', 'null', NOT_A_WORKSPACE],
    [
      'has workspace schemaVersion 9',
      JSON.stringify({ ...workspaceOf([]), schemaVersion: 9 }),
      NEWER_VERSION,
    ],
    [
      'has workspace schemaVersion 0',
      JSON.stringify({ ...workspaceOf([]), schemaVersion: 0 }),
      NOT_A_WORKSPACE,
    ],
    [
      'has another format',
      JSON.stringify({ ...workspaceOf([]), format: 'something-else' }),
      NOT_A_WORKSPACE,
    ],
    [
      'has no stream list',
      JSON.stringify({ ...workspaceOf([]), streams: undefined }),
      NOT_A_WORKSPACE,
    ],
    [
      'has a non-numeric revision',
      JSON.stringify({ ...workspaceOf([]), revision: 'three' }),
      NOT_A_WORKSPACE,
    ],
    [
      'has an active stream id that is not text',
      JSON.stringify({ ...workspaceOf([]), activeStreamId: 7 }),
      NOT_A_WORKSPACE,
    ],
    [
      'has an active stream id that matches no stream',
      JSON.stringify({
        ...workspaceOf([referenceStream()]),
        activeStreamId: 'missing',
      }),
      NOT_A_WORKSPACE,
    ],
    [
      'has an active stream id but no streams',
      JSON.stringify({ ...workspaceOf([]), activeStreamId: 'a' }),
      NOT_A_WORKSPACE,
    ],
  ])('%s', (_problem, text, message) => {
    expect(parseWorkspace(text)).toEqual(refusedWith(message))
  })

  it('reports a newer workspace version before judging anything else about it', () => {
    const text = JSON.stringify({
      ...workspaceOf([]),
      schemaVersion: 9,
      streams: 'unreadable by this version',
      revision: 'three',
    })

    expect(parseWorkspace(text)).toEqual(refusedWith(NEWER_VERSION))
  })

  it('A workspace with one invalid value stream is refused whole', () => {
    const alpha = referenceStream({ name: 'Alpha' })
    const steps = referenceSteps()
    const beta = streamOf(
      versionOf(steps, [pathBetween(steps, 'Intake', 'Deploy')]),
      { name: 'Beta' }
    )

    const result = parseWorkspace(
      serializeWorkspace(workspaceOf([alpha, beta]))
    )

    expect(result).toEqual(refusedWith(NOT_A_WORKSPACE))
    expect(result.workspace).toBeUndefined()
  })

  it.each([
    [
      'the first step is not Intake',
      (stream) => {
        const [version] = stream.versions
        return {
          ...stream,
          versions: [{ ...version, steps: [...version.steps].reverse() }],
        }
      },
    ],
    [
      'a version has a step that is not an object',
      (stream) => {
        const [version] = stream.versions
        return {
          ...stream,
          versions: [{ ...version, steps: [null] }],
        }
      },
    ],
    ['the stream has no versions', (stream) => ({ ...stream, versions: [] })],
    [
      'the stream has a version that is not an object',
      (stream) => ({ ...stream, versions: [...stream.versions, null] }),
    ],
    [
      'the stream has two current versions',
      (stream) => ({
        ...stream,
        versions: [
          ...stream.versions,
          { ...stream.versions[0], id: 'other', label: 'Second current' },
        ],
      }),
    ],
    [
      'the active version does not exist',
      (stream) => ({ ...stream, activeVersionId: 'missing' }),
    ],
    ['the stream name is not text', (stream) => ({ ...stream, name: 4 })],
    [
      'the stream has no session',
      (stream) => ({ ...stream, session: undefined }),
    ],
    [
      'the stream is an older schema',
      (stream) => ({ ...stream, schemaVersion: 1 }),
    ],
  ])('is refused whole when %s', (_problem, break_) => {
    const broken = break_(referenceStream())

    const result = parseWorkspace(
      JSON.stringify(workspaceOf([referenceStream({ name: 'Ok' }), broken]))
    )

    expect(result).toEqual(refusedWith(NOT_A_WORKSPACE))
  })

  it.each([
    ['is missing', undefined],
    ['is 0', 0],
    ['is negative', -8],
    ['is not finite', null], // JSON writes Infinity and NaN as null
    ['is text', '8'],
  ])('is refused whole when a stream workdayHours %s', (_problem, hours) => {
    const broken = { ...referenceStream(), workdayHours: hours }

    const result = parseWorkspace(
      JSON.stringify(workspaceOf([referenceStream({ name: 'Ok' }), broken]))
    )

    expect(result).toEqual(refusedWith(NOT_A_WORKSPACE))
  })

  it('is refused when two streams share an id', () => {
    const stream = referenceStream()

    const result = parseWorkspace(
      JSON.stringify(workspaceOf([stream, { ...stream, name: 'Copy' }]))
    )

    expect(result.ok).toBe(false)
  })

  it('accepts a stream whose steps are still being filled in', () => {
    const stream = createValueStream({ name: '' })

    expect(parseWorkspace(JSON.stringify(workspaceOf([stream]))).ok).toBe(true)
  })
})
