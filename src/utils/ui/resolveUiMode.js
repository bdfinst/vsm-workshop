const UI_MODES = ['guided', 'v1']
const DEFAULT_UI_MODE = 'v1'

/**
 * Choose the experience to show. `?ui=guided` or `?ui=v1` in the address wins;
 * otherwise the build default applies, and with neither it is v1.
 * @param {string} search - The address query string, e.g. `location.search`
 * @param {string} [defaultUi] - The build default (`VITE_DEFAULT_UI`)
 * @returns {'guided' | 'v1'}
 */
export const resolveUiMode = (search, defaultUi) => {
  const requested = new URLSearchParams(search).get('ui')
  if (UI_MODES.includes(requested)) return requested
  return UI_MODES.includes(defaultUi) ? defaultUi : DEFAULT_UI_MODE
}
