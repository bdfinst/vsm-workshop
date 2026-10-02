import {
  test as base,
  expect,
  chromium,
  firefox,
  webkit,
} from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export { expect }

const ENGINES = { chromium, firefox, webkit }

/** The built standalone file, and its address. */
export const STANDALONE_FILE = fileURLToPath(
  new URL('../../../dist-standalone/vsm-workshop.html', import.meta.url)
)
export const STANDALONE_URL = pathToFileURL(STANDALONE_FILE).href

/** The engine a scenario runs in when it names none. */
const defaultEngine = () => process.env.STANDALONE_ENGINE || 'chromium'

/**
 * Open the standalone file from disk in a persistent profile, so closing the
 * browser and opening the file again reuses the same storage. Every request
 * for anything but the opened file is aborted and recorded.
 * @param {Object} [options]
 * @param {string} [options.engine] - chromium, firefox or webkit
 * @param {string} [options.userDataDir] - Reuse a profile to reopen it
 * @param {boolean} [options.offline] - Disable the network
 * @param {string} [options.search] - Query string for the address
 * @returns {Promise<{ page, context, requests: string[], userDataDir: string, close: Function }>}
 */
export const openStandalone = async ({
  engine = defaultEngine(),
  userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vsm-standalone-')),
  offline = false,
  search = '',
} = {}) => {
  const context = await ENGINES[engine].launchPersistentContext(userDataDir, {
    offline,
    viewport: { width: 1280, height: 720 },
  })
  const requests = []
  await context.route('**', (route) => {
    if (route.request().url().split('#')[0].split('?')[0] === STANDALONE_URL) {
      return route.continue()
    }
    requests.push(route.request().url())
    return route.abort()
  })
  const page = context.pages()[0] ?? (await context.newPage())
  // Leave-page dialogs are accepted so closing never hangs.
  page.on('dialog', (dialog) => dialog.accept())
  await page.goto(`${STANDALONE_URL}${search}`)
  return {
    page,
    context,
    requests,
    userDataDir,
    close: () => context.close(),
  }
}

/** The standalone file's text. */
export const standaloneHtml = () => fs.readFileSync(STANDALONE_FILE, 'utf8')

/** Its size in bytes. */
export const standaloneSize = () => fs.statSync(STANDALONE_FILE).size

/**
 * The fixture: `standalone(options)` opens the file and closes it after the
 * test, along with any profile it created.
 */
export const test = base.extend({
  // eslint-disable-next-line no-empty-pattern -- Playwright needs the destructuring form
  standalone: async ({}, use) => {
    const opened = []
    await use(async (options) => {
      const session = await openStandalone(options)
      opened.push(session)
      return session
    })
    for (const session of opened) {
      await session.close().catch(() => {})
      fs.rmSync(session.userDataDir, { recursive: true, force: true })
    }
  },
})
