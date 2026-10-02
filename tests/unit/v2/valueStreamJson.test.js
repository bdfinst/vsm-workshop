import { describe, expect, it } from 'vitest'
import { createStep as createV1Step } from '../../../src/models/StepFactory.js'
import {
  exportValueStream,
  importValueStream,
} from '../../../src/persistence/v2/valueStreamJson.js'
import { serializeWorkspace } from '../../../src/persistence/v2/workspaceCodec.js'
import {
  referenceReworkStream,
  referenceSteps,
  referenceStream,
  refused,
  withFutureState,
  workspaceOf,
} from './fixtures.js'

/**
 * Unit-level edges of the value stream file. The Slice 3 import scenarios
 * (import v1, id collision, refused files, round trip) are in migration.test.js.
 */

const v1File = (overrides = {}) => {
  const dev = createV1Step('Dev', { leadTime: 240, processTime: 60 })
  return JSON.stringify({
    id: 'v1-map',
    name: 'Old map',
    description: '',
    steps: [dev],
    connections: [],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-16T10:00:00.000Z',
    ...overrides,
  })
}

describe('exportValueStream', () => {
  it('writes the stream as JSON text without changing it', () => {
    const stream = referenceStream()
    const before = structuredClone(stream)

    const text = exportValueStream(stream)

    expect(JSON.parse(text)).toEqual(stream)
    expect(stream).toEqual(before)
  })
})

describe('importValueStream', () => {
  describe('a v2 file', () => {
    it('reads a stream with a future state and rework as it was written', () => {
      const stream = withFutureState(referenceReworkStream())

      const result = importValueStream(exportValueStream(stream), [])

      expect(result).toEqual({ ok: true, stream, changes: [] })
    })

    it('keeps the id when it is not in the existing ids', () => {
      const stream = referenceStream()

      const result = importValueStream(exportValueStream(stream), ['other'])

      expect(result.stream.id).toBe(stream.id)
    })

    it.each([
      ['an array', (id) => [id]],
      ['a Set', (id) => new Set([id])],
    ])('takes existing ids as %s', (_kind, existingIds) => {
      const stream = referenceStream()

      const result = importValueStream(
        exportValueStream(stream),
        existingIds(stream.id)
      )

      expect(result.stream.id).not.toBe(stream.id)
    })

    it('refuses a stream that is structurally invalid', () => {
      const stream = referenceStream()
      const broken = {
        ...stream,
        versions: [{ ...stream.versions[0], steps: referenceSteps().slice(1) }],
      }

      expect(importValueStream(JSON.stringify(broken), [])).toEqual(refused)
    })

    it('refuses a stream whose versions are not a list without throwing', () => {
      const broken = { ...referenceStream(), versions: 'nope' }

      expect(importValueStream(JSON.stringify(broken), [])).toEqual(refused)
    })
  })

  describe('a v1 file', () => {
    it('migrates it and reports what changed', () => {
      const result = importValueStream(v1File(), [])

      expect(result.ok).toBe(true)
      expect(result.stream.versions[0].steps.map((s) => s.name)).toEqual([
        'Intake',
        'Dev',
      ])
      expect(result.changes).toEqual(['Intake step added'])
    })

    it('gives a new id when the v1 map id is already in the workspace', () => {
      const result = importValueStream(v1File(), ['v1-map'])

      expect(result.ok).toBe(true)
      expect(result.stream.id).not.toBe('v1-map')
    })

    it('reads a v1 file with damaged steps instead of throwing', () => {
      const result = importValueStream(
        v1File({ steps: [null, { name: 'Dev' }, { name: 'Test' }] }),
        []
      )

      expect(result.ok).toBe(true)
      expect(result.stream.versions[0].steps.map((s) => s.name)).toEqual([
        'Intake',
        'Dev',
        'Test',
      ])
    })
  })

  describe('a file that is refused', () => {
    it.each([
      ['not text', undefined],
      ['JSON null', 'null'],
      ['a JSON list', '[]'],
      ['an empty object', '{}'],
      [
        'a workspace file',
        serializeWorkspace(workspaceOf([referenceStream()])),
      ],
      [
        'a file from a newer version without the rest of a stream',
        '{"schemaVersion": 3}',
      ],
    ])('refuses %s', (_label, text) => {
      expect(importValueStream(text, [])).toEqual(refused)
    })
  })
})
