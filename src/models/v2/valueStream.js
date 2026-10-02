import { createMapVersion } from './mapVersion.js'

/**
 * Create a v2 value stream at stage 1 with one active current version.
 * @param {Object} [overrides] - Fields to override
 * @returns {Object} A new value stream
 */
export const createValueStream = (overrides = {}) => {
  const versions = overrides.versions ?? [createMapVersion()]
  const now = new Date().toISOString()

  return {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    name: '',
    description: '',
    trigger: '',
    endPoint: '',
    unitOfWork: null,
    workdayHours: 8,
    versions,
    activeVersionId: versions[0].id,
    session: { activeStage: 1, furthestStage: 1 },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

const UNTITLED_NAME = 'Untitled value stream'

/**
 * The name a value stream is listed by.
 * @param {{name: string}} stream - A value stream
 * @returns {string} The trimmed name, or "Untitled value stream" when blank
 */
export const displayName = (stream) => stream.name.trim() || UNTITLED_NAME
