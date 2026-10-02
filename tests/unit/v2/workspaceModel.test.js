import { describe, expect, it } from 'vitest'
import { createWorkspace } from '../../../src/models/v2/workspace.js'
import {
  parseWorkspace,
  serializeWorkspace,
} from '../../../src/persistence/v2/workspaceCodec.js'
import { referenceStream } from './fixtures.js'

describe('createWorkspace', () => {
  it('creates an empty workspace with nothing active and no saves yet', () => {
    const workspace = createWorkspace()

    expect(workspace).toMatchObject({
      format: 'vsm-workspace',
      schemaVersion: 1,
      streams: [],
      activeStreamId: null,
      revision: 0,
    })
    expect(workspace).not.toHaveProperty('savedAt')
    expect(typeof workspace.id).toBe('string')
  })

  it('gives each workspace a distinct id', () => {
    expect(createWorkspace().id).not.toBe(createWorkspace().id)
  })

  it('takes overrides', () => {
    const stream = referenceStream()

    expect(
      createWorkspace({ streams: [stream], activeStreamId: stream.id })
    ).toMatchObject({ streams: [stream], activeStreamId: stream.id })
  })

  it('is a workspace the codec reads back', () => {
    const stream = referenceStream()
    const workspace = createWorkspace({
      streams: [stream],
      activeStreamId: stream.id,
    })

    const result = parseWorkspace(serializeWorkspace(workspace))

    expect(result.ok).toBe(true)
    expect(result.workspace.streams).toEqual([stream])
    expect(result.workspace.activeStreamId).toBe(stream.id)
    expect(result.workspace.id).toBe(workspace.id)
  })

  it('is an empty workspace the codec reads back', () => {
    const result = parseWorkspace(serializeWorkspace(createWorkspace()))

    expect(result.ok).toBe(true)
    expect(result.workspace.streams).toEqual([])
  })
})
