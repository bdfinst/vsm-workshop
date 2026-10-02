import { describe, it, expect } from 'vitest'
import { parseEventsFromJson, parseEventsFromCsv } from '../../../src/utils/import/eventAdapters'

describe('parseEventsFromJson', () => {
  it('parses a top-level array of events', () => {
    const json = JSON.stringify([
      { workItemId: '1', stage: 'Dev', enteredAt: '2026-01-01T00:00:00Z', exitedAt: '2026-01-01T01:00:00Z' },
    ])
    const events = parseEventsFromJson(json)
    expect(events).toHaveLength(1)
    expect(events[0].stage).toBe('Dev')
  })

  it('parses an object with an events array', () => {
    const json = JSON.stringify({ events: [{ workItemId: '1', stage: 'Dev', enteredAt: '2026-01-01T00:00:00Z' }] })
    expect(parseEventsFromJson(json)).toHaveLength(1)
  })

  it('returns an empty array for invalid JSON', () => {
    expect(parseEventsFromJson('not json')).toEqual([])
  })
})

describe('parseEventsFromCsv', () => {
  it('parses rows using the header for column mapping', () => {
    const csv = [
      'workItemId,stage,enteredAt,exitedAt',
      '1,Dev,2026-01-01T00:00:00Z,2026-01-01T01:00:00Z',
      '1,Test,2026-01-01T01:00:00Z,2026-01-01T01:30:00Z',
    ].join('\n')
    const events = parseEventsFromCsv(csv)
    expect(events).toHaveLength(2)
    expect(events[0]).toMatchObject({ workItemId: '1', stage: 'Dev' })
    expect(events[1].stage).toBe('Test')
  })

  it('tolerates a missing exitedAt column value', () => {
    const csv = ['workItemId,stage,enteredAt,exitedAt', '1,Dev,2026-01-01T00:00:00Z,'].join('\n')
    const events = parseEventsFromCsv(csv)
    expect(events[0].exitedAt).toBeUndefined()
  })

  it('ignores blank lines', () => {
    const csv = ['workItemId,stage,enteredAt', '', '1,Dev,2026-01-01T00:00:00Z', '   '].join('\n')
    expect(parseEventsFromCsv(csv)).toHaveLength(1)
  })
})
