/**
 * Event-source adapters (P3).
 *
 * Thin parsers that normalize an exported event log into the WorkItemEvent
 * shape consumed by deriveVsmFromEvents. The file-based CSV/JSON adapters are
 * the working stand-in for live Jira/GitHub/CI adapters, which conform to the
 * same shape but fetch over the network (see docs/specs/real-tooling-import.md).
 */

const FIELDS = ['workItemId', 'stage', 'enteredAt', 'exitedAt']

const normalize = (raw) => {
  const event = {
    workItemId: raw.workItemId != null ? String(raw.workItemId) : undefined,
    stage: raw.stage != null ? String(raw.stage) : undefined,
    enteredAt: raw.enteredAt || undefined,
  }
  if (raw.exitedAt) event.exitedAt = raw.exitedAt
  return event
}

/**
 * Parse events from a JSON string (a top-level array, or `{ events: [...] }`).
 * @param {string} jsonString
 * @returns {Array}
 */
export function parseEventsFromJson(jsonString) {
  try {
    const data = JSON.parse(jsonString)
    const list = Array.isArray(data) ? data : Array.isArray(data?.events) ? data.events : []
    return list.map(normalize)
  } catch {
    return []
  }
}

/**
 * Parse events from a CSV string. The first non-blank line is the header;
 * columns are mapped by name (workItemId, stage, enteredAt, exitedAt).
 * @param {string} csvString
 * @returns {Array}
 */
export function parseEventsFromCsv(csvString) {
  const lines = String(csvString)
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
  if (lines.length < 2) return []

  const header = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const cells = line.split(',')
    const row = {}
    header.forEach((key, i) => {
      const value = (cells[i] ?? '').trim()
      if (FIELDS.includes(key) && value !== '') row[key] = value
    })
    return normalize(row)
  })
}
