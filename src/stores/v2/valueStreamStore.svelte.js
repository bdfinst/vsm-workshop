/**
 * Value Stream Store (v2) - Svelte 5 Runes
 * One value stream, edited through guarded actions. Every action builds the
 * edited version on a copy, has the validators check it, and only then applies
 * it and calls `persist` once. A refused action returns `{ ok: false, error }`
 * and changes nothing. The store never writes storage itself.
 * @file This file uses Svelte 5 runes ($state, $derived)
 */

import { createUndoStore } from '../undoStore.svelte.js'
import { calculateMetrics } from '../../utils/calculations/v2/index.js'
import { validateVersion } from '../../utils/validation/v2/versionValidator.js'
import {
  PATH_MISSING_MESSAGE,
  STEP_MISSING_MESSAGE,
  VERSION_MISSING_MESSAGE,
  checkDeleteStep,
  checkDeleteVersion,
  checkMove,
  checkStageChange,
  checkReworkDirection,
} from '../../utils/validation/v2/editRules.js'
import { copyMapVersion } from '../../models/v2/mapVersion.js'
import {
  STAGE_NAMES,
  STEP_KIND,
  VERSION_KIND,
} from '../../models/v2/constants.js'
import { createStep } from '../../models/v2/step.js'
import { createReworkPath } from '../../models/v2/reworkPath.js'
import { refuse } from '../../models/v2/result.js'

const TIME_FIELDS = ['processTime', 'waitTime', 'elapsedTime']

const firstMessage = ({ errors }) => Object.values(errors)[0]

const indexOfStep = (version, stepId) =>
  version.steps.findIndex((step) => step.id === stepId)

// Drop the rework paths the test matches; returns how many went.
const removePathsWhere = (version, matches) => {
  const before = version.reworkPaths.length
  version.reworkPaths = version.reworkPaths.filter((path) => !matches(path))
  return before - version.reworkPaths.length
}

// A snapshot is the whole stream minus `session`, plus the stage the user was
// on when the edit was made. Undo restores data, never the stage.
const dataOf = (stream) => {
  const data = { ...stream }
  delete data.session
  return data
}

const announce = (verb, stage, currentStage) =>
  stage === currentStage
    ? verb
    : `${verb}: change on the ${STAGE_NAMES[stage - 1]} stage`

/**
 * Create the store for one value stream.
 * @param {Object} options
 * @param {Object} options.stream - The v2 value stream to edit (copied, never changed)
 * @param {function(Object, {navigation?: boolean, positionOnly?: boolean}=): void} options.persist - Called with a plain copy of the stream after each accepted action; the options say it was navigation or a drag, not an edit
 * @returns {Object} Store with reactive getters and guarded actions
 */
export const createValueStreamStore = ({ stream, persist }) => {
  let current = $state($state.snapshot(stream))

  // Departs from v1 D1 (snapshots pushed at component call sites): the v2 store
  // pushes inside `commit`, so a caller cannot forget. Callers commit on blur or
  // Enter, never per keystroke. Position-only drags go through
  // `updateStepPosition`, which skips `commit` and so the history (v1 D2).
  const history = createUndoStore((x) => structuredClone($state.snapshot(x)))

  const activeVersion = $derived(
    current.versions.find((version) => version.id === current.activeVersionId)
  )
  const metrics = $derived(calculateMetrics(activeVersion))

  const save = (options) => persist($state.snapshot(current), options)

  const commit = (draft, options) => {
    if (!options?.navigation) {
      history.pushSnapshot({
        data: dataOf(current),
        stage: current.session.activeStage,
      })
    }
    current = draft
    save(options)
  }

  // Run `change` on a copy of the active version. It may return `{ error }` to
  // refuse, or extra fields for the result. The copy must then pass validation.
  const editVersion = (change) => {
    const draft = $state.snapshot(current)
    const version = draft.versions.find((v) => v.id === draft.activeVersionId)
    const outcome = change(version, draft)
    if (outcome?.error) return refuse(outcome.error)

    const check = validateVersion(version, draft.versions)
    if (!check.valid) return refuse(firstMessage(check))

    commit(draft)
    return { ok: true, ...outcome }
  }

  const updateStep = (stepId, patch) =>
    editVersion((version) => {
      const index = indexOfStep(version, stepId)
      if (index === -1) return { error: STEP_MISSING_MESSAGE }
      version.steps[index] = { ...version.steps[index], ...patch, id: stepId }
    })

  const addStep = (fields) =>
    editVersion((version) => {
      version.steps.push(createStep(fields))
    })

  const insertStep = (afterStepId, fields) =>
    editVersion((version) => {
      const index = indexOfStep(version, afterStepId)
      if (index === -1) return { error: STEP_MISSING_MESSAGE }
      version.steps.splice(index + 1, 0, createStep(fields))
    })

  const moveStep = (stepId, toIndex) =>
    editVersion((version) => {
      const error = checkMove(
        version.steps,
        version.reworkPaths,
        stepId,
        toIndex
      )
      if (error) return { error }
      const from = indexOfStep(version, stepId)
      version.steps.splice(toIndex, 0, ...version.steps.splice(from, 1))
    })

  const deleteStep = (stepId) =>
    editVersion((version) => {
      const error = checkDeleteStep(version.steps, stepId)
      if (error) return { error }
      version.steps = version.steps.filter((step) => step.id !== stepId)
      const touches = (path) =>
        path.fromStepId === stepId || path.toStepId === stepId
      return { removedPaths: removePathsWhere(version, touches) }
    })

  const addReworkPath = (fields) =>
    editVersion((version) => {
      const path = createReworkPath(fields)
      const error = checkReworkDirection(version.steps, path)
      if (error) return { error }
      version.reworkPaths.push(path)
    })

  const updateReworkPath = (pathId, patch) =>
    editVersion((version) => {
      const index = version.reworkPaths.findIndex((path) => path.id === pathId)
      if (index === -1) return { error: PATH_MISSING_MESSAGE }
      const path = { ...version.reworkPaths[index], ...patch, id: pathId }
      const error = checkReworkDirection(version.steps, path)
      if (error) return { error }
      version.reworkPaths[index] = path
    })

  const deleteReworkPath = (pathId) =>
    editVersion((version) => {
      if (!version.reworkPaths.some((path) => path.id === pathId)) {
        return { error: PATH_MISSING_MESSAGE }
      }
      version.reworkPaths = version.reworkPaths.filter(
        (path) => path.id !== pathId
      )
    })

  // A step at 100% has no rework, so its paths go with the value.
  const setPctCA = (stepId, pctCA) =>
    editVersion((version) => {
      const index = indexOfStep(version, stepId)
      if (index === -1) return { error: STEP_MISSING_MESSAGE }
      version.steps[index] = { ...version.steps[index], pctCA }
      if (pctCA !== 100) return { removedPaths: 0 }
      const startsHere = (path) => path.fromStepId === stepId
      return { removedPaths: removePathsWhere(version, startsHere) }
    })

  // Rebuild the step on the other kind's time fields; the old ones are dropped.
  const switchStepKind = (stepId, kind) =>
    editVersion((version) => {
      const index = indexOfStep(version, stepId)
      if (index === -1) return { error: STEP_MISSING_MESSAGE }
      const step = version.steps[index]
      if (!Object.values(STEP_KIND).includes(kind)) {
        return { error: 'Kind must be team or outside' }
      }
      if (step.kind === kind) {
        return { error: `${step.name} is already a ${kind} step` }
      }
      const blank = createStep({ kind })
      const kept = Object.fromEntries(
        Object.entries(step).filter(([field]) => !TIME_FIELDS.includes(field))
      )
      version.steps[index] = {
        ...kept,
        kind,
        isHandoff: blank.isHandoff || step.isHandoff,
        ...Object.fromEntries(
          TIME_FIELDS.filter((f) => f in blank).map((f) => [f, blank[f]])
        ),
      }
    })

  // A copy of the current state becomes the active version.
  const createFutureVersion = (label) => {
    const draft = $state.snapshot(current)
    const source = draft.versions.find((v) => v.kind === VERSION_KIND.CURRENT)
    const future = copyMapVersion(source, {
      kind: VERSION_KIND.FUTURE,
      label: typeof label === 'string' ? label.trim() : label,
    })

    const check = validateVersion(future, draft.versions)
    if (!check.valid) return refuse(firstMessage(check))

    draft.versions.push(future)
    draft.activeVersionId = future.id
    commit(draft)
    return { ok: true, versionId: future.id }
  }

  const setActiveVersion = (versionId) => {
    if (!current.versions.some((version) => version.id === versionId)) {
      return refuse(VERSION_MISSING_MESSAGE)
    }
    const draft = $state.snapshot(current)
    draft.activeVersionId = versionId
    commit(draft)
    return { ok: true }
  }

  // Deleting the active version goes back to the current state.
  const deleteVersion = (versionId) => {
    const error = checkDeleteVersion(current.versions, versionId)
    if (error) return refuse(error)

    const draft = $state.snapshot(current)
    draft.versions = draft.versions.filter((v) => v.id !== versionId)
    if (draft.activeVersionId === versionId) {
      draft.activeVersionId = draft.versions.find(
        (v) => v.kind === VERSION_KIND.CURRENT
      ).id
    }
    commit(draft)
    return { ok: true }
  }

  const setFocusItems = (items) =>
    editVersion((version) => {
      version.focusItems = items
    })

  // A canvas drag: saved, but not an undo step and not an edit that counts.
  const updateStepPosition = (stepId, position) => {
    const draft = $state.snapshot(current)
    const version = draft.versions.find((v) => v.id === draft.activeVersionId)
    const index = indexOfStep(version, stepId)
    if (index === -1) return refuse(STEP_MISSING_MESSAGE)
    version.steps[index] = { ...version.steps[index], position }
    current = draft
    save({ positionOnly: true })
    return { ok: true }
  }

  // Navigation is saved without counting as an edit.
  const goToStage = (stage) => {
    const error = checkStageChange(current.session, stage)
    if (error) return refuse(error)

    const draft = $state.snapshot(current)
    draft.session = {
      ...draft.session,
      activeStage: stage,
      furthestStage: Math.max(draft.session.furthestStage, stage),
    }
    commit(draft, { navigation: true })
    return { ok: true }
  }

  // The snapshot keeps the stage of its edit through undo and redo, so the
  // announcement names where the change happened.
  const travel = (verb, peek, move) => {
    const entry = peek()
    if (!entry) return refuse(`Nothing to ${verb.toLowerCase()}`)
    const restored = move({ data: dataOf(current), stage: entry.stage })
    current = { ...restored.data, session: current.session }
    save()
    return {
      ok: true,
      announcement: announce(verb, entry.stage, current.session.activeStage),
    }
  }

  const undo = () => travel('Undo', history.peekUndo, history.undo)
  const redo = () => travel('Redo', history.peekRedo, history.redo)

  return {
    get canUndo() {
      return history.canUndo
    },
    get canRedo() {
      return history.canRedo
    },
    undo,
    redo,
    get stream() {
      return current
    },
    get activeVersion() {
      return activeVersion
    },
    get metrics() {
      return metrics
    },
    updateStep,
    updateStepPosition,
    addStep,
    insertStep,
    moveStep,
    addReworkPath,
    updateReworkPath,
    deleteReworkPath,
    deleteStep,
    setPctCA,
    switchStepKind,
    createFutureVersion,
    setActiveVersion,
    deleteVersion,
    setFocusItems,
    goToStage,
  }
}
