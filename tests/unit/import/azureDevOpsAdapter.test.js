import { describe, it, expect } from 'vitest'
import { azureDevOpsUpdatesToEvents } from '../../../src/utils/import/azureDevOpsAdapter'

// Minimal slice of the Work Item Updates API shape: each update records a
// System.State change with a System.ChangedDate timestamp.
const stateUpdate = (newValue, changedAt) => ({
  fields: {
    'System.State': { newValue },
    'System.ChangedDate': { newValue: changedAt },
  },
})

describe('azureDevOpsUpdatesToEvents', () => {
  it('returns no events for no items', () => {
    expect(azureDevOpsUpdatesToEvents([])).toEqual([])
  })

  it('turns each state change into a stage entry, exiting at the next change', () => {
    const items = [
      {
        workItemId: 42,
        updates: [
          stateUpdate('Active', '2026-01-01T09:00:00Z'),
          stateUpdate('Resolved', '2026-01-01T11:00:00Z'),
        ],
      },
    ]
    const events = azureDevOpsUpdatesToEvents(items)
    expect(events).toEqual([
      { workItemId: '42', stage: 'Active', enteredAt: '2026-01-01T09:00:00Z', exitedAt: '2026-01-01T11:00:00Z' },
      { workItemId: '42', stage: 'Resolved', enteredAt: '2026-01-01T11:00:00Z', exitedAt: undefined },
    ])
  })

  it('ignores updates that did not change the state', () => {
    const items = [
      {
        workItemId: 1,
        updates: [
          stateUpdate('Active', '2026-01-01T09:00:00Z'),
          { fields: { 'System.AssignedTo': { newValue: 'someone' } } }, // no state change
        ],
      },
    ]
    expect(azureDevOpsUpdatesToEvents(items)).toHaveLength(1)
  })

  it('falls back to revisedDate when ChangedDate is absent', () => {
    const items = [
      {
        workItemId: 7,
        updates: [{ revisedDate: '2026-01-01T08:00:00Z', fields: { 'System.State': { newValue: 'New' } } }],
      },
    ]
    expect(azureDevOpsUpdatesToEvents(items)[0].enteredAt).toBe('2026-01-01T08:00:00Z')
  })

  it('orders transitions chronologically regardless of update order', () => {
    const items = [
      {
        workItemId: 5,
        updates: [
          stateUpdate('Resolved', '2026-01-01T11:00:00Z'),
          stateUpdate('Active', '2026-01-01T09:00:00Z'),
        ],
      },
    ]
    expect(azureDevOpsUpdatesToEvents(items).map((e) => e.stage)).toEqual(['Active', 'Resolved'])
  })
})
