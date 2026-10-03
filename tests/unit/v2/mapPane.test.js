import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, unmount, flushSync } from 'svelte'
import MapPane from '../../../src/components/map/MapPane.svelte'
import {
  VIEW_MODE,
  sessionUIStore,
} from '../../../src/stores/v2/sessionUIStore.svelte.js'
import { referenceSteps } from './fixtures.js'
import { ladderModelOf, stubResizeObserver } from './ladderRender.js'

let mounted = null

const render = () => {
  mounted = mount(MapPane, {
    target: document.body,
    props: { ladderModel: ladderModelOf(referenceSteps()) },
  })
  flushSync()
}

const mapTab = () => document.querySelector('[data-testid="view-tab-map"]')

beforeEach(() => {
  stubResizeObserver()
  sessionUIStore.setViewMode(VIEW_MODE.MAP)
})

afterEach(() => {
  if (mounted) unmount(mounted)
  mounted = null
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  sessionUIStore.setViewMode(VIEW_MODE.MAP)
})

describe('MapPane', () => {
  it('The Map tab is selected and the ladder is shown when the view is map', () => {
    render()

    expect(mapTab().getAttribute('aria-selected')).toBe('true')
    expect(
      document
        .querySelector('[role="tabpanel"]')
        .getAttribute('aria-labelledby')
    ).toBe(mapTab().id)
    expect(document.querySelector('[data-testid="ladder-map"]')).not.toBeNull()
  })

  it('A view the pane does not offer yet shows the Map', () => {
    sessionUIStore.setViewMode(VIEW_MODE.TABLE)

    render()

    expect(mapTab().getAttribute('aria-selected')).toBe('true')
    expect(document.querySelector('[data-testid="ladder-map"]')).not.toBeNull()
  })

  it("Choosing a view sets the session's view", () => {
    sessionUIStore.setViewMode(VIEW_MODE.TABLE)
    render()

    mapTab().click()
    flushSync()

    expect(sessionUIStore.viewMode).toBe(VIEW_MODE.MAP)
  })
})
