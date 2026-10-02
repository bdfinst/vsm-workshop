import { describe, it, expect } from 'vitest'
import { createSessionUIStore } from '../../../src/stores/v2/sessionUIStore.svelte.js'

describe('sessionUIStore', () => {
  it('takes uiMode from the address and the build default', () => {
    expect(
      createSessionUIStore({ search: '?ui=guided', defaultUi: undefined })
        .uiMode
    ).toBe('guided')
    expect(
      createSessionUIStore({ search: '', defaultUi: 'guided' }).uiMode
    ).toBe('guided')
    expect(
      createSessionUIStore({ search: '', defaultUi: undefined }).uiMode
    ).toBe('v1')
  })

  it('starts on the table view with an automatic ladder scale and no shading', () => {
    const store = createSessionUIStore({ search: '', defaultUi: undefined })

    expect(store.viewMode).toBe('table')
    expect(store.ladderScale).toBeNull()
    expect(store.showLoopShading).toBe(false)
  })

  it('changes the view, ladder scale and shading', () => {
    const store = createSessionUIStore({ search: '', defaultUi: undefined })

    store.setViewMode('canvas')
    store.setLadderScale(0.5)
    store.setShowLoopShading(true)

    expect(store.viewMode).toBe('canvas')
    expect(store.ladderScale).toBe(0.5)
    expect(store.showLoopShading).toBe(true)
  })

  it('refuses a view mode it does not know', () => {
    const store = createSessionUIStore({ search: '', defaultUi: undefined })

    store.setViewMode('sideways')

    expect(store.viewMode).toBe('table')
  })
})
