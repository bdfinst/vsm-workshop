/**
 * Session UI Store (v2) - Svelte 5 Runes
 * Memory-only display choices for the guided session. Nothing here is saved.
 * @file This file uses Svelte 5 runes ($state)
 */

import { resolveUiMode } from '../../utils/ui/resolveUiMode.js'

const VIEW_MODES = ['table', 'canvas']

/**
 * Create the session UI store.
 * @param {Object} options
 * @param {string} options.search - The address query string
 * @param {string} [options.defaultUi] - The build default experience
 * @returns {Object} Store with reactive getters and setters
 */
export const createSessionUIStore = ({ search, defaultUi }) => {
  const uiMode = resolveUiMode(search, defaultUi)
  let viewMode = $state('table')
  // null lets the ladder fit its width; a number is a fixed scale.
  let ladderScale = $state(null)
  let showLoopShading = $state(false)

  return {
    get uiMode() {
      return uiMode
    },
    get viewMode() {
      return viewMode
    },
    get ladderScale() {
      return ladderScale
    },
    get showLoopShading() {
      return showLoopShading
    },
    setViewMode(mode) {
      if (VIEW_MODES.includes(mode)) viewMode = mode
    },
    setLadderScale(scale) {
      ladderScale = scale
    },
    setShowLoopShading(show) {
      showLoopShading = show
    },
  }
}

export const sessionUIStore = createSessionUIStore({
  search: globalThis.location?.search ?? '',
  defaultUi: import.meta.env.VITE_DEFAULT_UI,
})
