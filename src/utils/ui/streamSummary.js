import { stageName } from '../../models/v2/constants.js'
import {
  activeVersionOf,
  displayName,
  isUnnamed,
} from '../../models/v2/valueStream.js'
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
 * @returns {{id: string, name: string, rawName: string, unnamed: boolean,
 *   steps: string, furthestStage: string, updated: ?string,
 *   created: ?string}} `rawName` is the stored name, which is blank for an
 *   unnamed stream; `unnamed` says so, for a card that must not read the
 *   name itself. `updated` reads "Updated 2 days ago". `created` reads
 *   "Created 3 Mar" and is only given for a stream with no name, so several
 *   "Untitled value stream" cards can be told apart. A timestamp that cannot
 *   be read is left out (null) rather than failing.
 */
export const streamSummary = (stream, now) => {
  const version = activeVersionOf(stream)
  const stepCount = version?.steps.length ?? 0
  const unnamed = isUnnamed(stream)

  return {
    id: stream.id,
    name: displayName(stream),
    rawName: stream.name,
    unnamed,
    steps: `${stepCount} ${stepCount === 1 ? 'step' : 'steps'}`,
    furthestStage: stageName(stream.session.furthestStage),
    updated: withPrefix('Updated', formatRelativeTime(stream.updatedAt, now)),
    created: unnamed
      ? withPrefix('Created', formatDayMonth(stream.createdAt))
      : null,
  }
}
