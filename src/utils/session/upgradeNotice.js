import { persistValue } from '../persistedState.js'

// The upgraded map is not saved until its first edit, so it would be found
// and announced again on every launch. The dismissal is kept on its own.
export const UPGRADE_NOTICE_DISMISSED_KEY = 'vsm-v2-upgrade-notice-dismissed'

/**
 * Show the upgrade notice for what importing a v1 file changed. An earlier
 * dismissal was of another upgrade, so it is cleared. Nothing changed, no notice.
 * @param {{showChanges: function(string[]): void}} store - The workspace store
 * @param {string[]} changes - What upgrading the imported file applied
 */
export const showUpgradeNotice = (store, changes) => {
  if (changes.length === 0) return
  persistValue(UPGRADE_NOTICE_DISMISSED_KEY, false)
  store.showChanges(changes)
}
