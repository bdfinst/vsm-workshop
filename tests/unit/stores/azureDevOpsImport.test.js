import { describe, it, expect, beforeEach, vi } from 'vitest'
import { vsmDataStore } from '../../../src/stores/vsmDataStore.svelte.js'
import { vsmIOStore } from '../../../src/stores/vsmIOStore.svelte.js'

const jsonResponse = (body) => ({ ok: true, status: 200, json: async () => body })

const update = (state, at) => ({
  fields: { 'System.State': { newValue: state }, 'System.ChangedDate': { newValue: at } },
})

describe('vsmIOStore.importFromAzureDevOps', () => {
  beforeEach(() => {
    vsmDataStore.createNewMap('scratch')
  })

  it('builds the working map from Azure DevOps history (mock fetch, no network)', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ workItems: [{ id: 1 }] }))
      .mockResolvedValueOnce(
        jsonResponse({
          value: [
            update('Development', '2026-01-01T09:00:00Z'),
            update('Testing', '2026-01-01T10:00:00Z'),
          ],
        })
      )

    const ok = await vsmIOStore.importFromAzureDevOps({
      organization: 'acme',
      project: 'web',
      pat: 'secret',
      wiql: 'SELECT [System.Id] FROM WorkItems',
      stageOrder: ['Development', 'Testing'],
      fetchImpl,
    })

    expect(ok).toBe(true)
    expect(vsmDataStore.steps.map((s) => s.name)).toEqual(['Development', 'Testing'])
    expect(vsmDataStore.name).toContain('Azure DevOps')
  })

  it('returns false (and leaves the map untouched) when the query matches nothing', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ workItems: [] }))
    const ok = await vsmIOStore.importFromAzureDevOps({
      organization: 'a',
      project: 'b',
      pat: 'x',
      wiql: 'q',
      fetchImpl,
    })
    expect(ok).toBe(false)
    expect(vsmDataStore.steps).toHaveLength(0)
  })

  it('returns false on a fetch/auth error rather than throwing', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
    const ok = await vsmIOStore.importFromAzureDevOps({
      organization: 'a',
      project: 'b',
      pat: 'bad',
      wiql: 'q',
      fetchImpl,
    })
    expect(ok).toBe(false)
  })
})
