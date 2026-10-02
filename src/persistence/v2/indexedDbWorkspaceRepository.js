import { NEWER_VERSION_MESSAGE } from './jsonText.js'
import {
  serializeWorkspace,
  WORKSPACE_FORMAT,
  WORKSPACE_SCHEMA_VERSION,
} from './workspaceCodec.js'

/**
 * The workspace working copy in IndexedDB. It is a cache of the workspace
 * file, kept so a crash or reload loses nothing. `load` and `loadBackup` give
 * raw file text (or null), so the caller can tell unreadable data from none.
 */

const STORE_NAME = 'workspace'
const WORKING_COPY_KEY = 'current'
const BACKUP_KEY = 'backup'
const DB_VERSION = 1

const promisify = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const openDatabase = (dbName, version) =>
  new Promise((resolve, reject) => {
    const request =
      version === undefined
        ? globalThis.indexedDB.open(dbName)
        : globalThis.indexedDB.open(dbName, version)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

// What `load` gives for a database a newer copy of the app made, when it holds
// no working copy this app can read. It is text the codec refuses as newer,
// which keeps the unreadable screen and the backup path working.
const NEWER_DATABASE_STUB = JSON.stringify({
  format: WORKSPACE_FORMAT,
  schemaVersion: WORKSPACE_SCHEMA_VERSION + 1,
})

const isNewerDatabase = (db) => db.version > DB_VERSION

// A copy of the app with a newer database version can't be lowered. Open
// without a version then; what it left behind is read as newer data and the
// codec refuses it.
const openCompatible = async (dbName) => {
  try {
    return await openDatabase(dbName, DB_VERSION)
  } catch (error) {
    if (error?.name !== 'VersionError') throw error
    return openDatabase(dbName)
  }
}

/**
 * Create the IndexedDB workspace repository.
 * @param {Object} options
 * @param {string} options.dbName - The database name
 * @returns {Object} The repository. `persisted` is false until the browser
 *   grants persistent storage, which it may never answer.
 */
export const createIndexedDbWorkspaceRepository = ({ dbName }) => {
  let connection = null
  let persisted = false
  let persistRequested = false

  // Not awaited: a browser may leave the request unanswered (it can prompt).
  const requestPersistentStorage = () => {
    if (persistRequested) return
    persistRequested = true
    try {
      Promise.resolve(globalThis.navigator.storage.persist()).then(
        (granted) => {
          persisted = granted === true
        },
        () => {}
      )
    } catch {
      // No persistent storage in this browser: stay not persisted.
    }
  }

  // Drops the connection when a newer copy upgrades the database, so that
  // upgrade isn't blocked. The next call opens again.
  const connect = () => {
    if (!connection) {
      connection = openCompatible(dbName).then(
        (db) => {
          db.onversionchange = () => {
            db.close()
            connection = null
          }
          requestPersistentStorage()
          return db
        },
        (error) => {
          connection = null
          throw error
        }
      )
    }
    return connection
  }

  const readStore = async (db, key) => {
    const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME)
    return (await promisify(store.get(key))) ?? null
  }

  // In a newer database the layout is unknown: use what is there if it is
  // text, otherwise give the stub for the working copy, never null or a throw.
  const readNewer = async (db, key) => {
    const found = await readStore(db, key).catch(() => null)
    if (typeof found === 'string') return found
    return key === WORKING_COPY_KEY ? NEWER_DATABASE_STUB : null
  }

  const read = async (key) => {
    const db = await connect()
    return isNewerDatabase(db) ? readNewer(db, key) : readStore(db, key)
  }

  const write = async (key, value) => {
    const db = await connect()
    if (isNewerDatabase(db)) throw new Error(NEWER_VERSION_MESSAGE)
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(value, key)
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  }

  return {
    load: () => read(WORKING_COPY_KEY),
    save: (workspace) => write(WORKING_COPY_KEY, serializeWorkspace(workspace)),
    saveBackup: (raw) => write(BACKUP_KEY, raw),
    loadBackup: () => read(BACKUP_KEY),
    isAvailable: async () => {
      try {
        await connect()
        return true
      } catch {
        return false
      }
    },
    get persisted() {
      return persisted
    },
  }
}
