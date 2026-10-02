import { decideLoad } from './decideLoad.js'

/**
 * The thin async shell around `decideLoad`: it reads both sources, asks
 * `decideLoad` what to do and keeps unreadable data as a backup. It never
 * writes the workspace and never writes the v1 key, so what is saved stays as
 * it was until the user's first edit.
 * @param {Object} workspaceRepo - A workspace repository (`load`, `saveBackup`)
 * @param {Object} v1Repo - The v1 localStorage repository; only `load` is used
 * @returns {Promise<{workspace: ?Object, changes: string[], unreadable: ?{reason: string}, backupFailed?: true}>}
 *   The decision from `decideLoad`. `backupFailed` is set only when unreadable
 *   data could not be saved as a backup; the decision is still returned.
 *   A workspace repository that cannot be read rejects.
 */
export const loadWorkspace = async (workspaceRepo, v1Repo) => {
  const rawWorkspace = await workspaceRepo.load()
  const rawV1 = v1Repo.load(null)

  const decision = decideLoad(rawWorkspace, rawV1)
  if (!decision.unreadable) return decision

  try {
    await workspaceRepo.saveBackup(rawWorkspace)
    return decision
  } catch {
    // The raw data is still where it was; the screen can say it isn't backed up.
    return { ...decision, backupFailed: true }
  }
}
