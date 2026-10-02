import { describe, it, expect, vi } from 'vitest'
import { fetchAzureDevOpsEvents } from '../../../src/utils/import/azureDevOpsAdapter'

const jsonResponse = (body) => ({ ok: true, status: 200, json: async () => body })

describe('fetchAzureDevOpsEvents', () => {
  it('runs WIQL then fetches each work item\'s updates and maps to events', async () => {
    const fetchImpl = vi
      .fn()
      // 1) WIQL query → ids
      .mockResolvedValueOnce(jsonResponse({ workItems: [{ id: 10 }] }))
      // 2) updates for item 10
      .mockResolvedValueOnce(
        jsonResponse({
          value: [
            { fields: { 'System.State': { newValue: 'Active' }, 'System.ChangedDate': { newValue: '2026-01-01T09:00:00Z' } } },
            { fields: { 'System.State': { newValue: 'Closed' }, 'System.ChangedDate': { newValue: '2026-01-01T10:00:00Z' } } },
          ],
        })
      )

    const events = await fetchAzureDevOpsEvents({
      organization: 'acme',
      project: 'web',
      pat: 'secret',
      wiql: 'SELECT [System.Id] FROM WorkItems',
      fetchImpl,
    })

    expect(events).toHaveLength(2)
    expect(events[0]).toMatchObject({ workItemId: '10', stage: 'Active' })

    // First call is the WIQL endpoint with Basic auth derived from the PAT.
    const [wiqlUrl, wiqlInit] = fetchImpl.mock.calls[0]
    expect(wiqlUrl).toContain('/acme/web/_apis/wit/wiql')
    expect(wiqlInit.method).toBe('POST')
    expect(wiqlInit.headers.Authorization).toMatch(/^Basic /)
  })

  it('throws a clear error when the WIQL query fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
    await expect(
      fetchAzureDevOpsEvents({ organization: 'a', project: 'b', pat: 'x', wiql: 'q', fetchImpl })
    ).rejects.toThrow(/401/)
  })

  it('returns no events when the query matches nothing', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ workItems: [] }))
    const events = await fetchAzureDevOpsEvents({ organization: 'a', project: 'b', pat: 'x', wiql: 'q', fetchImpl })
    expect(events).toEqual([])
    expect(fetchImpl).toHaveBeenCalledTimes(1) // no per-item calls
  })
})
