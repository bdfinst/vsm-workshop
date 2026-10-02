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

  test('The file is self-contained and small', async ({ standalone }) => {
    expect(standaloneSize()).toBeLessThan(5 * MB)

    const html = standaloneHtml()
    // The parsed page is the authority: bundled JS holds markup-like strings.
    const { page } = await standalone({ offline: true })
    const external = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          'script[src], link[href], img[src], source[src], iframe[src], video[src], audio[src]'
        ),
      ]
        .map((element) => element.outerHTML)
        .filter((tag) => !/\b(src|href)=["'](data:|#)/i.test(tag))
    )
    expect(external).toEqual([])

    const css = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
      .map(([, body]) => body)
      .join('\n')
    const urls = [
      ...css.matchAll(/url\(\s*(?!["']?(?:data:|#))["']?([^)"']+)["']?\s*\)/gi),
    ]
    expect(urls.map((match) => match[1])).toEqual([])
    expect(css).not.toMatch(/@import/i)
  })

  test('The no-network check records a request the page makes', async ({
    standalone,
  }) => {
    const { page, requests } = await standalone()

    await page.evaluate(() =>
      fetch('http://example.invalid/ping').catch(() => {})
    )

    expect(requests).toEqual(['http://example.invalid/ping'])
  })
})
