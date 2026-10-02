import AxeBuilder from '@axe-core/playwright'
import { expect } from '@playwright/test'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

const describeViolation = ({ id, help, nodes }) =>
  `${id}: ${help} (${nodes.map((node) => node.target.join(' ')).join(', ')})`

/**
 * Fail when axe finds an accessibility violation on the current screen.
 * @param {import('@playwright/test').Page} page - The page to scan
 * @param {Object} [options]
 * @param {string} [options.include] - A selector to limit the scan to
 */
export const expectNoAxeViolations = async (page, { include } = {}) => {
  const builder = new AxeBuilder({ page }).withTags(WCAG_TAGS)
  if (include) builder.include(include)
  const { violations } = await builder.analyze()
  expect(violations.map(describeViolation)).toEqual([])
}
