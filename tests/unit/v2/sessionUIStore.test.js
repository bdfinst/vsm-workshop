import { describe, it, expect } from 'vitest'
import {
  VIEW_MODE,
  createSessionUIStore,
} from '../../../src/stores/v2/sessionUIStore.svelte.js'

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

  it('The session opens on the Map view, with an automatic ladder scale and no shading', () => {
    const store = createSessionUIStore({ search: '', defaultUi: undefined })

    expect(store.viewMode).toBe(VIEW_MODE.MAP)
    expect(VIEW_MODE.MAP).toBe('map')
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

  it("Choosing a view sets the session's view, the Map included", () => {
    const store = createSessionUIStore({ search: '', defaultUi: undefined })
    store.setViewMode(VIEW_MODE.TABLE)

    store.setViewMode(VIEW_MODE.MAP)

    expect(store.viewMode).toBe('map')
  })

  it('refuses a view mode it does not know', () => {
    const store = createSessionUIStore({ search: '', defaultUi: undefined })

    store.setViewMode('sideways')

    expect(store.viewMode).toBe(VIEW_MODE.MAP)
  })
})
