import { STAGE_NAMES } from '../../models/v2/constants.js'
import { displayName } from '../../models/v2/valueStream.js'
import {
  formatDayMonth,
  formatRelativeTime,
} from '../calculations/v2/format.js'

const withPrefix = (prefix, text) =>
  text === null ? null : `${prefix} ${text}`

/**
 * What a value stream's card on the home screen shows. Pure: the same stream
 * and `now` always give the same text, on any machine.
 * @param {Object} stream - A v2 value stream
 * @param {Date|number|string} now - The time "last updated" is measured to
 * @returns {{id: string, name: string, steps: string, furthestStage: string,
 *   updated: ?string, created: ?string}} `updated` reads "Updated 2 days ago".
 *   `created` reads "Created 3 Mar" and is only given for a stream with no
 *   name, so several "Untitled value stream" cards can be told apart. A
 *   timestamp that cannot be read is left out (null) rather than failing.
 */
export const streamSummary = (stream, now) => {
  const version = stream.versions.find((v) => v.id === stream.activeVersionId)
  const stepCount = version?.steps.length ?? 0
  const unnamed = stream.name.trim() === ''

  return {
    id: stream.id,
    name: displayName(stream),
    steps: `${stepCount} ${stepCount === 1 ? 'step' : 'steps'}`,
    furthestStage: STAGE_NAMES[stream.session.furthestStage - 1],
    updated: withPrefix('Updated', formatRelativeTime(stream.updatedAt, now)),
    created: unnamed
      ? withPrefix('Created', formatDayMonth(stream.createdAt))
      : null,
  }
}
