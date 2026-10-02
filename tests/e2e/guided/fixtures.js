import { test as base, expect } from '@playwright/test'
import { createValueStream } from '../../../src/models/v2/valueStream.js'
import { createWorkspace } from '../../../src/models/v2/workspace.js'
import { serializeWorkspace } from '../../../src/persistence/v2/workspaceCodec.js'
import { expectNoAxeViolations } from '../helpers/axe.js'

/** Where the app keeps its working copy (see indexedDbWorkspaceRepository.js). */
const WORKING_COPY = {
  dbName: 'vsm-workshop-v2',
  dbVersion: 1,
  storeName: 'workspace',
  key: 'current',
}

/** The address the guided session opens at. */
export const GUIDED_URL = '/?ui=guided'

/**
 * A workspace holding one value stream as the active stream, reached through
 * the given stage.
 * @param {number} stage - The stage the stream is on, and has reached (1-7)
 * @param {Object} [fields] - Value stream fields to override
 * @returns {Object} A workspace
 */
export const workspaceAtStage = (stage = 1, fields = {}) => {
  const stream = createValueStream({
    name: 'Checkout delivery',
    session: { activeStage: stage, furthestStage: stage },
    ...fields,
  })
  return createWorkspace({ streams: [stream], activeStreamId: stream.id })
}

// Runs in the page: puts the text in the app's IndexedDB working copy.
const writeWorkingCopy = async ({ text, location }) => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(location.dbName, location.dbVersion)
    request.onupgradeneeded = () =>
      request.result.createObjectStore(location.storeName)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(location.storeName, 'readwrite')
    transaction.objectStore(location.storeName).put(text, location.key)
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error)
  })
  db.close()
}

/**
 * The shared guided fixture. Each test runs in a fresh browser context, so
 * IndexedDB and localStorage start empty.
 */
export const test = base.extend({
  // Leave-page (beforeunload) dialogs are accepted so a reload never hangs.
  page: async ({ page }, use) => {
    page.on('dialog', (dialog) => dialog.accept())
    await use(page)
  },

  // seed(workspace) writes the workspace, or raw saved text, to IndexedDB on a
  // blank page of the app's origin, then opens the guided session.
  // Pass { open: null } to stay on the blank page.
  seed: async ({ page }, use) => {
    await use(async (workspace, { open = GUIDED_URL } = {}) => {
      const text =
        typeof workspace === 'string'
          ? workspace
          : serializeWorkspace(workspace)
      await page.route('**/__seed', (route) =>
        route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><title>seed</title>',
        })
      )
      await page.goto('/__seed')
      await page.evaluate(writeWorkingCopy, { text, location: WORKING_COPY })
      await page.unroute('**/__seed')
      if (open) await page.goto(open)
    })
  },

  // axe() scans the current screen, or just `include`, and fails on violations.
  axe: async ({ page }, use) => {
    await use((options) => expectNoAxeViolations(page, options))
  },
})

export { expect }
