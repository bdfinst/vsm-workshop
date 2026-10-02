import { displayName } from './valueStream.js'

/**
 * Copying a value stream for "Duplicate", and the timestamp an edit leaves.
 */

// "A (copy)", then "A (copy 2)", "A (copy 3)"... the first name nobody has.
const copyName = (source, streams) => {
  const taken = new Set(streams.map((stream) => stream.name))
  const base = displayName(source)
  let name = `${base} (copy)`
  for (let n = 2; taken.has(name); n += 1) name = `${base} (copy ${n})`
  return name
}

/**
 * Copy a value stream under new ids, named "(copy)" after its source. Steps
 * keep their `originStepId` and versions their `basedOnVersionId`, pointed at
 * the copied ones, so the copy stands alone.
 * @param {Object} source - The stream to copy (not changed)
 * @param {Object[]} streams - The streams already in the workspace, whose names the copy avoids
 * @returns {Object} A new value stream
 */
export const copyValueStream = (source, streams) => {
  const ids = new Map()
  const idFor = (old) => {
    if (!ids.has(old)) ids.set(old, crypto.randomUUID())
    return ids.get(old)
  }
  const remap = (id) => (id == null ? null : idFor(id))
  const now = new Date().toISOString()
  const copy = structuredClone(source)

  return {
    ...copy,
    id: crypto.randomUUID(),
    name: copyName(source, streams),
    activeVersionId: idFor(copy.activeVersionId),
    createdAt: now,
    updatedAt: now,
    versions: copy.versions.map((version) => ({
      ...version,
      id: idFor(version.id),
      basedOnVersionId: remap(version.basedOnVersionId),
      steps: version.steps.map((step) => ({
        ...step,
        id: idFor(step.id),
        originStepId: remap(step.originStepId),
      })),
      reworkPaths: version.reworkPaths.map((path) => ({
        ...path,
        id: crypto.randomUUID(),
        fromStepId: idFor(path.fromStepId),
        toStepId: idFor(path.toStepId),
      })),
    })),
  }
}

/**
 * The stream with `updatedAt` set to now, and any other fields changed.
 * @param {Object} stream - A value stream (not changed)
 * @param {Object} [changes] - Fields to set as well
 * @returns {Object} A new value stream
 */
export const touchValueStream = (stream, changes = {}) => ({
  ...stream,
  ...changes,
  updatedAt: new Date().toISOString(),
})
