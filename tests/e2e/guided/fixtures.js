import { test as base, expect } from '@playwright/test'
import { createConnection } from '../../../src/models/ConnectionFactory.js'
import { createStep as createV1Step } from '../../../src/models/StepFactory.js'
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

/** Where the v1 app keeps its one saved map (see VsmLocalStorageRepository.js). */
export const V1_STORAGE_KEY = 'vsm-data-storage'

/** The address the guided session opens at. */
export const GUIDED_URL = '/?ui=guided'

/**
 * The value stream name field in the header: the one place a stream's name is
 * edited (the home card's rename is the other). Scope has no name field.
 * @param {import('@playwright/test').Page} page
 * @returns {import('@playwright/test').Locator}
 */
export const streamName = (page) => page.getByTestId('stream-name-input')

/**
 * A workspace holding one value stream as the active stream, reached through
 * the given stage. Scope is filled in, as seeded maps are.
 * @param {number} stage - The stage the stream is on, and has reached (1-7)
 * @param {Object} [fields] - Value stream fields to override
 * @returns {Object} A workspace
 */
export const workspaceAtStage = (stage = 1, fields = {}) => {
  const stream = createValueStream({
    name: 'Checkout delivery',
    trigger: 'A customer asks for a change',
    endPoint: 'The change is live',
    unitOfWork: 'story',
    session: { activeStage: stage, furthestStage: stage },
    ...fields,
  })
  return createWorkspace({ streams: [stream], activeStreamId: stream.id })
}

/**
 * A saved v1 map with two steps and no Intake step, so upgrading it adds one.
 * @returns {Object} The map as the v1 app saved it
 */
export const v1MapWithoutIntake = () => {
  const dev = createV1Step('Dev', {
    leadTime: 240,
    processTime: 60,
    position: { x: 0, y: 0 },
  })
  const test = createV1Step('Test', {
    leadTime: 120,
    processTime: 30,
    position: { x: 200, y: 0 },
  })
  return {
    id: 'v1-map',
    name: 'Saved map',
    description: '',
    steps: [dev, test],
    connections: [createConnection(dev.id, test.id)],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-16T10:00:00.000Z',
  }
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

// Runs in the page: reads one entry of the app's IndexedDB store, or null.
const readEntry = async ({ key, location }) => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(location.dbName, location.dbVersion)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  const value = await new Promise((resolve, reject) => {
    const request = db
      .transaction(location.storeName, 'readonly')
      .objectStore(location.storeName)
      .get(key)
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return value
}

/**
 * The text the app has saved as its working copy, or null.
 * @param {import('@playwright/test').Page} page - Any page of the app's origin
 * @returns {Promise<?string>}
 */
export const savedWorkingCopy = (page) =>
  page.evaluate(readEntry, { key: WORKING_COPY.key, location: WORKING_COPY })

/**
 * The working copy parsed, or null while it is missing or not valid JSON.
 * @param {import('@playwright/test').Page} page - Any page of the app's origin
 * @returns {Promise<?Object>}
 */
export const savedWorkspace = async (page) => {
  try {
    return JSON.parse(await savedWorkingCopy(page))
  } catch {
    return null
  }
}

/**
 * The text the app has kept as the unreadable-data backup, or null.
 * @param {import('@playwright/test').Page} page - Any page of the app's origin
 * @returns {Promise<?string>}
 */
export const savedBackup = (page) =>
  page.evaluate(readEntry, { key: 'backup', location: WORKING_COPY })

// Runs `write` on a blank page of the app's origin, before the app loads.
const onSeedPage = async (page, write) => {
  await page.route('**/__seed', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>seed</title>',
    })
  )
  await page.goto('/__seed')
  await write()
  await page.unroute('**/__seed')
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
      await onSeedPage(page, () =>
        page.evaluate(writeWorkingCopy, { text, location: WORKING_COPY })
      )
      if (open) await page.goto(open)
    })
  },

  // seedV1(map) saves a v1 map where the v1 app kept it, with no v2 workspace,
  // then opens the guided session.
  seedV1: async ({ page }, use) => {
    await use(async (map, { open = GUIDED_URL } = {}) => {
      await onSeedPage(page, () =>
        page.evaluate(
          ([key, text]) => localStorage.setItem(key, text),
          [V1_STORAGE_KEY, JSON.stringify(map)]
        )
      )
      if (open) await page.goto(open)
    })
  },

  // axe() scans the current screen, or just `include`, and fails on violations.
  axe: async ({ page }, use) => {
    await use((options) => expectNoAxeViolations(page, options))
  },
})

export { expect }
