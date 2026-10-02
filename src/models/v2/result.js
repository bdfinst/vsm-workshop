/**
 * A refused action's result, shared by the stores and the file readers.
 * @param {string} error - The message to show
 * @returns {{ok: false, error: string}}
 */
export const refuse = (error) => ({ ok: false, error })
