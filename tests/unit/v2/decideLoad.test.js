import { describe, expect, it } from 'vitest'
import { createConnection } from '../../../src/models/ConnectionFactory.js'
import { createStep as createV1Step } from '../../../src/models/StepFactory.js'
import { createWorkspace } from '../../../src/models/v2/workspace.js'
import {
  parseWorkspace,
  serializeWorkspace,
} from '../../../src/persistence/v2/workspaceCodec.js'
import { decideLoad } from '../../../src/utils/migration/decideLoad.js'
import { anyReason, referenceStream } from './fixtures.js'

/**
 * decideLoad is pure: raw workspace text and a parsed v1 map in, a decision
 * out. Every branch is covered here with no storage.
 */

const v1Map = () => {
  const dev = createV1Step('Dev', {
    leadTime: 240,
    processTime: 60,
    position: { x: 0, y: 0 },
  })
  const test = createV1Step('Test', {
    leadTime: 120,
    processTime: 30,
    position: { x: 200, y: 0 },
  })
  return {
    id: 'v1-map',
    name: 'Saved map',
    description: '',
    steps: [dev, test],
    connections: [createConnection(dev.id, test.id)],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-16T10:00:00.000Z',
  }
}

const savedWorkspace = (name = 'Checkout delivery') =>
  serializeWorkspace(
    createWorkspace({
      streams: [referenceStream({ name })],
    })
  )

describe('decideLoad', () => {
  describe('with nothing saved', () => {
    it('gives an empty workspace and nothing to report', () => {
      const result = decideLoad(null, null)

      expect(result).toEqual({
        workspace: expect.objectContaining({
          format: 'vsm-workspace',
          streams: [],
          activeStreamId: null,
        }),
        changes: [],
        unreadable: null,
      })
    })

    it.each([
      ['a map with no steps', { ...v1Map(), steps: [] }],
      ['a map whose steps are not a list', { ...v1Map(), steps: 'Dev' }],
      ['something that is not a map', 'Dev'],
      ['a map whose steps are not objects', { steps: [null, 7] }],
    ])('treats %s as nothing saved', (_label, v1) => {
      const result = decideLoad(null, v1)

      expect(result.workspace.streams).toEqual([])
      expect(result.changes).toEqual([])
      expect(result.unreadable).toBeNull()
    })
  })

  describe('with a v1 map only', () => {
    it('migrates it into the first stream and makes that stream active', () => {
      const result = decideLoad(null, v1Map())

      const [stream] = result.workspace.streams
      expect(result.workspace.streams).toHaveLength(1)
      expect(result.workspace.activeStreamId).toBe(stream.id)
      expect(stream.versions[0].steps.map((step) => step.name)).toEqual([
        'Intake',
        'Dev',
        'Test',
      ])
      expect(result.changes).toEqual(['Intake step added'])
      expect(result.unreadable).toBeNull()
    })

    it('opens the migrated stream on Review with every stage reached', () => {
      const [stream] = decideLoad(null, v1Map()).workspace.streams

      expect(stream.session).toEqual({ activeStage: 6, furthestStage: 7 })
    })

    it('does not change the v1 map', () => {
      const v1 = v1Map()
      const before = structuredClone(v1)

      decideLoad(null, v1)

      expect(v1).toEqual(before)
    })
  })

  describe('with a v1 map that was saved damaged', () => {
    const migratedStream = (v1) => decideLoad(null, v1).workspace.streams[0]

    it('migrates steps that have no ids into a workspace the codec reads', () => {
      const { workspace } = decideLoad(null, {
        steps: [{ name: 'A' }, { name: 'B' }],
      })

      expect(workspace.streams[0].versions[0].steps).toHaveLength(3)
      expect(parseWorkspace(serializeWorkspace(workspace)).ok).toBe(true)
    })

    it('migrates a map whose connections are not a list', () => {
      const stream = migratedStream({
        steps: [{ id: 'a' }],
        connections: {},
      })

      expect(stream.versions[0].steps).toHaveLength(2)
    })

    it('treats a map that cannot be read as nothing saved', () => {
      const hostile = {
        steps: [
          {
            get name() {
              throw new Error('cannot read')
            },
          },
        ],
      }

      const result = decideLoad(null, hostile)

      expect(result).toEqual({
        workspace: expect.objectContaining({ streams: [] }),
        changes: [],
        unreadable: null,
      })
    })
  })

  describe('with a saved workspace', () => {
    it('reads it and reports no changes', () => {
      const result = decideLoad(savedWorkspace(), null)

      expect(result.workspace.streams.map((s) => s.name)).toEqual([
        'Checkout delivery',
      ])
      expect(result.changes).toEqual([])
      expect(result.unreadable).toBeNull()
    })

    it('wins over a v1 map', () => {
      const result = decideLoad(savedWorkspace(), v1Map())

      expect(result.workspace.streams.map((s) => s.name)).toEqual([
        'Checkout delivery',
      ])
      expect(result.changes).toEqual([])
    })

    it('keeps an empty saved workspace rather than migrating the v1 map', () => {
      const result = decideLoad(serializeWorkspace(createWorkspace()), v1Map())

      expect(result.workspace.streams).toEqual([])
      expect(result.unreadable).toBeNull()
    })
  })

  describe('with unreadable saved data', () => {
    const unreadable = {
      workspace: null,
      changes: [],
      unreadable: anyReason,
    }

    it('reports text that is not JSON', () => {
      expect(decideLoad('{not json', null)).toEqual(unreadable)
    })

    it('reports an empty string as not JSON', () => {
      expect(decideLoad('', null)).toEqual(unreadable)
    })

    it('reports JSON that is not a workspace', () => {
      expect(decideLoad('{"hello":"world"}', null)).toEqual(unreadable)
    })

    it('reports a workspace from a newer version', () => {
      const newer = JSON.stringify({
        ...JSON.parse(savedWorkspace()),
        schemaVersion: 9,
      })

      expect(decideLoad(newer, null)).toEqual({
        ...unreadable,
        unreadable: {
          reason: 'This file was made by a newer version of the app',
        },
      })
    })

    it('does not migrate the v1 map', () => {
      const result = decideLoad('{not json', v1Map())

      expect(result.workspace).toBeNull()
      expect(result.changes).toEqual([])
    })
  })
})
