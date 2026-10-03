import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mount, unmount, flushSync } from 'svelte'
import LadderMap from '../../../src/components/map/LadderMap.svelte'
import { LADDER_MODE } from '../../../src/utils/ui/ladderLayout.js'
import { insertAfter, outsideStep, referenceSteps } from './fixtures.js'
import {
  giveElementsClientWidth,
  ladderModelOf,
  stubResizeObserver,
} from './ladderRender.js'

// A ladder map in jsdom: it has no layout, so the scroller's width is given
// (or is 0, which fits the ladder at its smallest scale).
const PIXELS_PER_MINUTE = 0.1
const CODE_REVIEW_WAIT_MINUTES = 2880

let mounted = []
let restoreWidth = () => {}

const model = () =>
  ladderModelOf(
    insertAfter(
      referenceSteps(),
      'Code review',
      outsideStep('Security review', 1440)
    )
  )

// Mounts the map with exactly these props, so a getter and a setter for a
// bound prop reach the component as they are.
const renderWith = (props) => {
  const target = document.createElement('div')
  document.body.append(target)
  mounted.push(mount(LadderMap, { target, props }))
  flushSync()
  return target
}

const render = (props = {}) => renderWith({ ladderModel: model(), ...props })

const inMap = (target, testid) => [
  ...target.querySelectorAll(`[data-testid="${testid}"]`),
]
const stepNamed = (target, name) =>
  inMap(target, 'ladder-step').find(
    (step) => step.getAttribute('aria-label') === name
  )
const waitWidthOf = (target, name) =>
  Number(
    stepNamed(target, name)
      .querySelector('[data-testid="ladder-wait-block"]')
      .getAttribute('width')
  )
const boxWidths = (target) =>
  inMap(target, 'ladder-box').map((box) => Number(box.getAttribute('width')))
const radio = (target, mode) =>
  target.querySelector(`[data-testid="ladder-mode-${mode}"]`)

beforeEach(() => {
  stubResizeObserver()
})

afterEach(() => {
  mounted.forEach((component) => unmount(component))
  mounted = []
  restoreWidth()
  restoreWidth = () => {}
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('LadderMap pixelsPerMinute', () => {
  it('A ladder map pinned to a scale ignores the pane width', () => {
    const widthsAt = (scrollerWidth) => {
      restoreWidth = giveElementsClientWidth(scrollerWidth)
      const target = render({ pixelsPerMinute: PIXELS_PER_MINUTE })
      const width = waitWidthOf(target, 'Code review')
      mounted.forEach((component) => unmount(component))
      mounted = []
      document.body.innerHTML = ''
      restoreWidth()
      return width
    }

    expect(widthsAt(200)).toBe(CODE_REVIEW_WAIT_MINUTES * PIXELS_PER_MINUTE)
    expect(widthsAt(1600)).toBe(CODE_REVIEW_WAIT_MINUTES * PIXELS_PER_MINUTE)
  })

  it('A single map with no options draws as before: it fits the pane To scale and offers the mode choice', () => {
    restoreWidth = giveElementsClientWidth(600)

    const target = render()

    expect(radio(target, LADDER_MODE.SCALED).checked).toBe(true)
    expect(radio(target, LADDER_MODE.EQUAL).checked).toBe(false)
    const svgWidth = Number(
      inMap(target, 'ladder-map')[0].getAttribute('width')
    )
    expect(svgWidth).toBeLessThanOrEqual(600)
    expect(svgWidth).toBeGreaterThan(600 * 0.9)
  })
})

describe('LadderMap mode', () => {
  it('A ladder map given a mode starts in it', () => {
    restoreWidth = giveElementsClientWidth(900)

    const target = render({ ladderMode: LADDER_MODE.EQUAL })

    expect(radio(target, LADDER_MODE.EQUAL).checked).toBe(true)
    expect(new Set(boxWidths(target)).size).toBe(1)
  })

  it('A ladder map reports the mode chosen to the parent that binds it', () => {
    let chosen = LADDER_MODE.SCALED
    const target = renderWith({
      ladderModel: model(),
      get ladderMode() {
        return chosen
      },
      set ladderMode(value) {
        chosen = value
      },
    })

    radio(target, LADDER_MODE.EQUAL).click()
    flushSync()

    expect(chosen).toBe(LADDER_MODE.EQUAL)
  })

  it('A ladder map refuses a mode it does not know', () => {
    expect(() => render({ ladderMode: 'fit' })).toThrow(RangeError)
  })

  it('The mode choice can be hidden', () => {
    const target = render({ showLadderModeToggle: false })

    expect(target.querySelectorAll('input[type="radio"]')).toHaveLength(0)
    expect(inMap(target, 'ladder-mode')).toHaveLength(0)
    expect(inMap(target, 'ladder-map')).toHaveLength(1)
  })
})

describe('two ladder maps on one page', () => {
  const twoMaps = () => [render(), render()]

  it('Two ladder maps on one page share no ids', () => {
    twoMaps()

    const ids = [...document.querySelectorAll('[id]')].map((el) => el.id)
    expect(ids.length).toBeGreaterThan(2)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("each map's description and hatch fill point at its own", () => {
    const maps = twoMaps()

    for (const target of maps) {
      const svg = inMap(target, 'ladder-map')[0]
      const describedBy = svg.getAttribute('aria-describedby')
      expect(target.querySelector(`desc[id="${describedBy}"]`)).not.toBeNull()
      const fill = inMap(target, 'ladder-hatched')[0].getAttribute('fill')
      const patternId = fill.match(/^url\(#(.+)\)$/)[1]
      expect(target.querySelector(`pattern[id="${patternId}"]`)).not.toBeNull()
    }
  })

  it("each map's mode choice is its own radio group", () => {
    const maps = twoMaps()

    const groupOf = (target) => [
      ...new Set(
        [...target.querySelectorAll('input[type="radio"]')].map((r) => r.name)
      ),
    ]
    const [first, second] = maps.map(groupOf)
    expect(first).toHaveLength(1)
    expect(second).toHaveLength(1)
    expect(first[0]).not.toBe(second[0])
  })

  it('Choosing a mode on one map leaves the other alone', () => {
    const [first, second] = twoMaps()

    radio(first, LADDER_MODE.EQUAL).click()
    flushSync()

    expect(radio(first, LADDER_MODE.EQUAL).checked).toBe(true)
    expect(radio(second, LADDER_MODE.SCALED).checked).toBe(true)
    expect(radio(second, LADDER_MODE.EQUAL).checked).toBe(false)
  })
})
