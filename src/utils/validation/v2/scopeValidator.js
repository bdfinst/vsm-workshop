import { UNIT_OF_WORK } from '../../../models/v2/constants.js'
import { createErrorCollector, toResult } from './result.js'

export const WORKDAY_HOURS_MESSAGE =
  'Working day must be between 1 and 24 hours'

const MIN_WORKDAY_HOURS = 1
const MAX_WORKDAY_HOURS = 24

const TEXT_FIELDS = {
  name: 'Name',
  trigger: 'Trigger',
  endPoint: 'End point',
}

const isWorkdayHours = (hours) =>
  Number.isFinite(hours) &&
  hours >= MIN_WORKDAY_HOURS &&
  hours <= MAX_WORKDAY_HOURS

/**
 * Validate a change to the Scope fields of a value stream. Only the fields
 * given are checked, so a draft of one field can be checked on its own.
 * Text may be empty: a new stream starts without any, and the Next gate says so.
 * Refusing an edit of the name to blank is the name rule `nameEdit`
 * (models/v2/valueStream.js), which the store applies.
 * @param {Object} patch - Any of name, trigger, endPoint, unitOfWork, workdayHours
 * @returns {{valid: boolean, errors: Object<string, string>}}
 */
export const validateScope = (patch) => {
  const { errors, set } = createErrorCollector()

  for (const [field, value] of Object.entries(patch)) {
    if (field in TEXT_FIELDS) {
      if (typeof value !== 'string') {
        set(field, `${TEXT_FIELDS[field]} must be text`)
      }
    } else if (field === 'unitOfWork') {
      if (!Object.values(UNIT_OF_WORK).includes(value)) {
        set(field, 'Unit of work must be story, feature or defect')
      }
    } else if (field === 'workdayHours') {
      if (!isWorkdayHours(value)) set(field, WORKDAY_HOURS_MESSAGE)
    } else {
      set(field, `${field} is not a scope field`)
    }
  }

  return toResult(errors)
}
