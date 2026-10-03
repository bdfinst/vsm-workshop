import { vi } from 'vitest'
import { calculateMetrics } from '../../../src/utils/calculations/v2/index.js'
import { ladderModel } from '../../../src/utils/ui/ladderModel.js'
import { versionOf } from './fixtures.js'

/**
 * jsdom has no ResizeObserver, which `bind:clientWidth` needs. Call it before
 * mounting a component that draws the ladder, and `vi.unstubAllGlobals()`
 * after.
 */
export const stubResizeObserver = () =>
  vi.stubGlobal('ResizeObserver', function () {
    return { observe() {}, unobserve() {}, disconnect() {} }
  })

/**
 * jsdom does no layout, so every element is 0 px wide. Gives every element the
 * client width a scroller would have; undo it with the returned function.
 * @param {number} width - Pixels
 * @returns {function(): void} Puts the jsdom behaviour back
 */
export const giveElementsClientWidth = (width) => {
  const original = Object.getOwnPropertyDescriptor(
    Element.prototype,
    'clientWidth'
  )
  Object.defineProperty(Element.prototype, 'clientWidth', {
    configurable: true,
    get: () => width,
  })
  return () =>
    Object.defineProperty(Element.prototype, 'clientWidth', original)
}

/**
 * The ladder model of a map with these steps, as the store would derive it.
 * @param {Object[]} steps
 * @returns {{steps: Object[]}}
 */
export const ladderModelOf = (steps) => {
  const version = versionOf(steps)
  return ladderModel(version, calculateMetrics(version).flags)
}
