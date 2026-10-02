import {
  test,
  expect,
  standaloneHtml,
  standaloneSize,
} from './standalone.fixture.js'

const MB = 1024 * 1024

test.describe('Standalone app in one file', () => {
  test('The file runs from disk with no network', async ({ standalone }) => {
    const { page, requests } = await standalone({ offline: true })

    await expect(page.getByRole('heading', { name: 'Scope' })).toBeVisible()
    await expect(
      page
        .getByRole('navigation', { name: 'Stages' })
        .getByRole('button', { name: /^Scope/ })
    ).toHaveAttribute('aria-current', 'step')

    const field = (label) => page.getByLabel(label, { exact: true })
    await field('Value stream name').fill('Checkout delivery')
    await field('Trigger').fill('A customer asks for a change')
    await field('End point').fill('The change is live')
    await field('Unit of work').selectOption('story')
    await page.getByRole('button', { name: 'Next' }).click()

    await expect(
      page
        .getByRole('navigation', { name: 'Stages' })
        .getByRole('button', { name: /^Steps/ })
    ).toHaveAttribute('aria-current', 'step')
    expect(requests).toEqual([])
  })

  test('The file is self-contained and small', async () => {
    expect(standaloneSize()).toBeLessThan(5 * MB)

    const html = standaloneHtml()
    const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    const markup = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')

    const external = /\b(src|href)\s*=\s*(?!["']?(data:|#))/i
    const tags = [
      ...markup.matchAll(/<(script|img|link|source|iframe)\b[^>]*>/gi),
    ]
    expect(
      tags.map(([tag]) => tag).filter((tag) => external.test(tag))
    ).toEqual([])

    const css = styles.map(([, body]) => body).join('\n')
    const urls = [
      ...css.matchAll(/url\(\s*(["']?)(?!data:|#)([^)]+?)\1\s*\)/gi),
    ]
    expect(urls.map((match) => match[2])).toEqual([])
    expect(css).not.toMatch(/@import/i)
  })
})
