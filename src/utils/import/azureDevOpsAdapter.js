/**
 * Azure DevOps event-source adapter (P3) — OPTIONAL live source.
 *
 * Two layers, both thin:
 *  1. azureDevOpsUpdatesToEvents — PURE. Maps the Work Item Updates API shape
 *     (System.State changes + timestamps) onto the WorkItemEvent contract that
 *     deriveVsmFromEvents consumes. Fully testable with no network.
 *  2. fetchAzureDevOpsEvents — thin HTTP wrapper (WIQL → per-item updates).
 *     `fetchImpl` is injectable so it is testable without real calls, and the
 *     whole live connection is opt-in: nothing here runs unless explicitly
 *     called with an organization, project, and PAT.
 *
 * Live adapters add NO derivation logic — they only shape source data into
 * WorkItemEvent[]. See docs/specs/real-tooling-import.md.
 */

/**
 * @typedef {Object} AzureDevOpsItem
 * @property {string|number} workItemId
 * @property {Array} updates - The `value` array from the Work Item Updates API
 */

const stateChangeTimestamp = (update) =>
  update.fields?.['System.ChangedDate']?.newValue || update.revisedDate || null

/**
 * Map Azure DevOps work-item update histories to WorkItemEvents.
 * Each `System.State` change becomes a stage entry; it exits when the next
 * state change occurs.
 * @param {AzureDevOpsItem[]} items
 * @returns {Array} WorkItemEvent[]
 */
export function azureDevOpsUpdatesToEvents(items = []) {
  const events = []
  for (const { workItemId, updates } of items) {
    const transitions = (updates || [])
      .filter((u) => u.fields?.['System.State']?.newValue)
      .map((u) => ({ state: u.fields['System.State'].newValue, at: stateChangeTimestamp(u) }))
      .filter((t) => t.at)
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))

    transitions.forEach((t, i) => {
      events.push({
        workItemId: String(workItemId),
        stage: t.state,
        enteredAt: t.at,
        exitedAt: transitions[i + 1]?.at,
      })
    })
  }
  return events
}

/** Base64-encode `:PAT` for Basic auth, in browser or Node. */
function basicAuth(pat) {
  const raw = `:${pat}`
  if (typeof btoa === 'function') return btoa(raw)
  return Buffer.from(raw, 'utf-8').toString('base64')
}

/**
 * Fetch state-transition events from Azure DevOps (OPTIONAL live connection).
 *
 * @param {Object} config
 * @param {string} config.organization
 * @param {string} config.project
 * @param {string} config.pat - Personal Access Token (Work Items: Read). Never persisted.
 * @param {string} config.wiql - WIQL query selecting the work items to map
 * @param {string} [config.apiVersion]
 * @param {Function} [config.fetchImpl] - Injectable fetch (defaults to global fetch)
 * @returns {Promise<Array>} WorkItemEvent[]
 */
export async function fetchAzureDevOpsEvents({
  organization,
  project,
  pat,
  wiql,
  apiVersion = '7.1',
  fetchImpl,
}) {
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null)
  if (!doFetch) throw new Error('No fetch implementation available')
  if (!organization || !project || !pat || !wiql) {
    throw new Error('Azure DevOps import requires organization, project, pat, and wiql')
  }

  const base = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(project)}/_apis/wit`
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Basic ${basicAuth(pat)}`,
  }

  // 1) Resolve work item ids via WIQL
  const wiqlRes = await doFetch(`${base}/wiql?api-version=${apiVersion}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: wiql }),
  })
  if (!wiqlRes.ok) throw new Error(`Azure DevOps WIQL query failed (${wiqlRes.status})`)
  const wiqlData = await wiqlRes.json()
  const ids = (wiqlData.workItems || []).map((w) => w.id)

  // 2) Fetch each work item's update history
  const items = []
  for (const id of ids) {
    const res = await doFetch(`${base}/workItems/${id}/updates?api-version=${apiVersion}`, { headers })
    if (!res.ok) throw new Error(`Azure DevOps updates fetch failed for #${id} (${res.status})`)
    const data = await res.json()
    items.push({ workItemId: id, updates: data.value || [] })
  }

  return azureDevOpsUpdatesToEvents(items)
}
