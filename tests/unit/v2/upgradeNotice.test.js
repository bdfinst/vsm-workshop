import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  UPGRADE_NOTICE_DISMISSED_KEY,
  showUpgradeNotice,
} from '../../../src/utils/session/upgradeNotice.js'
import { getPersistedValue } from '../../../src/utils/persistedState.js'

describe('showUpgradeNotice', () => {
  beforeEach(() => localStorage.clear())

  it('shows the changes, and shows them again to someone who dismissed the notice before', () => {
    localStorage.setItem(UPGRADE_NOTICE_DISMISSED_KEY, 'true')
    const store = { showChanges: vi.fn() }

    showUpgradeNotice(store, ['Wait time clamped for "Dev"'])

    expect(store.showChanges).toHaveBeenCalledWith([
      'Wait time clamped for "Dev"',
    ])
    expect(getPersistedValue(UPGRADE_NOTICE_DISMISSED_KEY, true)).toBe(false)
  })

  it('does nothing when nothing changed', () => {
    localStorage.setItem(UPGRADE_NOTICE_DISMISSED_KEY, 'true')
    const store = { showChanges: vi.fn() }

    showUpgradeNotice(store, [])

    expect(store.showChanges).not.toHaveBeenCalled()
    expect(getPersistedValue(UPGRADE_NOTICE_DISMISSED_KEY, false)).toBe(true)
  })
})
