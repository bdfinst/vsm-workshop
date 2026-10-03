import {
  test,
  expect,
  standaloneHtml,
  standaloneSize,
} from './standalone.fixture.js'
import { streamName } from './fixtures.js'

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
    await streamName(page).fill('Checkout delivery')
    await streamName(page).press('Enter')
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

  test('The bundled fonts are used without the network', async ({
    standalone,
  }) => {
    const { page, requests } = await standalone({ offline: true })
    await expect(page.getByRole('heading', { name: 'Scope' })).toBeVisible()

    const loaded = await page.evaluate(async () => {
      await document.fonts.ready
      return {
        family: getComputedStyle(document.body).fontFamily,
        plex: document.fonts.check('16px "IBM Plex Sans"'),
        faces: [...document.fonts].filter((face) => face.status === 'loaded')
          .length,
      }
    })

    expect(loaded.family).toContain('IBM Plex Sans')
    expect(loaded.plex).toBe(true)
    expect(loaded.faces).toBeGreaterThan(0)
    expect(requests).toEqual([])
  })
})
