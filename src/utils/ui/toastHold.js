/**
 * Whether a toast is still being read or reached for: the pointer is on it, or
 * focus is on something inside it.
 * @param {HTMLElement} toast
 * @param {Element|null} focused - Where focus is, or is going. On focusout the
 *   active element is already the body, so pass the event's relatedTarget.
 * @returns {boolean}
 */
export const isToastHeld = (toast, focused) =>
  toast.matches(':hover') || toast.contains(focused)
