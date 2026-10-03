/**
 * Where focus goes in a list after one of its items is deleted: the item now
 * in the deleted one's position, else the one before it.
 * @param {number} index - Where the deleted item was
 * @param {number} remaining - How many items are left
 * @returns {?number} The index to focus, or null when nothing is left
 */
export const indexAfterDelete = (index, remaining) =>
  remaining === 0 ? null : Math.min(index, remaining - 1)
