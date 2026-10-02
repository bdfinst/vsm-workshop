import { beforeEach, describe, it, expect } from 'vitest'
import { migrateV1ToV2 } from '../../../src/utils/migration/v1ToV2.js'
import { loadWorkspace } from '../../../src/utils/migration/loadWorkspace.js'
import { vsmLocalStorageRepo } from '../../../src/infrastructure/VsmLocalStorageRepository.js'
import { createMemoryWorkspaceRepository } from '../../../src/persistence/v2/memoryWorkspaceRepository.js'
import { serializeWorkspace } from '../../../src/persistence/v2/workspaceCodec.js'
import { createWorkspace } from '../../../src/models/v2/workspace.js'
import {
  exportValueStream,
  importValueStream,
} from '../../../src/persistence/v2/valueStreamJson.js'
import {
  anyReason,
  referenceStream,
  withForwardRework,
  withFutureState,
} from './fixtures.js'
import { createStep } from '../../../src/models/StepFactory.js'
import { createConnection } from '../../../src/models/ConnectionFactory.js'
import { validateVersion } from '../../../src/utils/validation/v2/versionValidator.js'
import { calculateTotals } from '../../../src/utils/calculations/v2/totals.js'

/**
 * Slice 3 (step 3.1): the pure v1 -> v2 migration. v1 data is built with the
 * real v1 factories so the tests read the shape the app actually saved.
 */

// A v1 step. Position x follows the order given unless the test overrides it.
const v1Step = (name, overrides = {}) =>
  createStep(name, { position: { x: 0, y: 0 }, ...overrides })

const forward = (from, to) => createConnection(from.id, to.id)

const reworkTo = (from, to, rate) =>
  createConnection(from.id, to.id, 'rework', rate)

const chain = (steps) =>
  steps.slice(1).map((step, i) => forward(steps[i], step))

// A v1 map. Connections default to a forward chain through the steps.
const v1Map = (steps, connections = chain(steps)) => ({
  id: 'v1-map',
  name: 'Saved map',
  description: '',
  steps,
  connections,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-16T10:00:00.000Z',
})

// The "Intake, Dev, Test" map the outlines start from.
const intakeDevTest = (devOverrides = {}, testOverrides = {}) => {
  const intake = v1Step('Intake', { processTime: 0, leadTime: 0 })
  const dev = v1Step('Dev', devOverrides)
  const test = v1Step('Test', testOverrides)
  return { intake, dev, test, steps: [intake, dev, test] }
}

const currentVersion = (stream) => stream.versions[0]
const namesOf = (stream) => currentVersion(stream).steps.map((s) => s.name)
const stepNamed = (stream, name) =>
  currentVersion(stream).steps.find((s) => s.name === name)
const shareOf = (stream, from, to) =>
  currentVersion(stream).reworkPaths.find(
    (p) =>
      p.fromStepId === stepNamed(stream, from).id &&
      p.toStepId === stepNamed(stream, to).id
  )?.shareOfRejects

const expectValid = (stream) =>
  expect(validateVersion(currentVersion(stream), stream.versions)).toEqual({
    valid: true,
    errors: {},
  })

describe('Saved maps upgrade without losing the original', () => {
  it('v1 map migrates with the same lead and process time', () => {
    const dev = v1Step('Dev', { leadTime: 240, processTime: 60 })
    const test = v1Step('Test', { leadTime: 120, processTime: 30 })
    const v1 = v1Map([dev, test])
    const before = structuredClone(v1)

    const { stream, changes } = migrateV1ToV2(v1)

    expect(namesOf(stream)).toEqual(['Intake', 'Dev', 'Test'])
    expect(stepNamed(stream, 'Intake')).toMatchObject({
      processTime: { typ: 0 },
      waitTime: { typ: 0 },
      timeSource: 'estimate',
    })
    expect(stepNamed(stream, 'Dev')).toMatchObject({
      processTime: { typ: 60 },
      waitTime: { typ: 180 },
    })
    const totals = calculateTotals(currentVersion(stream).steps)
    expect(totals.leadTime.typ).toBe(360)
    expect(totals.processTime.typ).toBe(90)
    expect(changes).toEqual(['Intake step added'])
    expect(stream.versions).toHaveLength(1)
    expect(v1).toEqual(before)
    expectValid(stream)
  })

  it('v1 step named intake becomes the first step named Intake', () => {
    const dev = v1Step('Dev', { position: { x: 100, y: 0 } })
    const test = v1Step('Test', { position: { x: 200, y: 0 } })
    const intake = v1Step('intake', { position: { x: 300, y: 0 } })

    const { stream, changes } = migrateV1ToV2(v1Map([dev, test, intake]))

    expect(namesOf(stream)[0]).toBe('Intake')
    expect(namesOf(stream)).toEqual(['Intake', 'Dev', 'Test'])
    expect(changes).toEqual([])
    expectValid(stream)
  })

  it('v1 rework connections become rework paths', () => {
    const { intake, dev, test, steps } = intakeDevTest(
      {},
      { percentCompleteAccurate: 100 }
    )

    const { stream } = migrateV1ToV2(
      v1Map(steps, [
        ...chain(steps),
        reworkTo(test, dev, 20),
        reworkTo(test, intake, 10),
      ])
    )

    expect(stepNamed(stream, 'Test').pctCA).toBe(70)
    expect(shareOf(stream, 'Test', 'Dev')).toBe(67)
    expect(shareOf(stream, 'Test', 'Intake')).toBe(33)
    expectValid(stream)
  })

  describe('Migration edge cases report what changed', () => {
    it('"Dev" has a rework connection forward to "Test"', () => {
      const { dev, test, steps } = intakeDevTest()

      const { stream, changes } = migrateV1ToV2(
        v1Map(steps, [...chain(steps), reworkTo(dev, test, 15)])
      )

      expect(currentVersion(stream).reworkPaths).toEqual([])
      expect(changes).toEqual(['Forward rework path removed'])
      expectValid(stream)
    })

    it('"Dev" has lead 30 and process 60', () => {
      const { steps } = intakeDevTest({ leadTime: 30, processTime: 60 })

      const { stream, changes } = migrateV1ToV2(v1Map(steps))

      expect(stepNamed(stream, 'Dev').waitTime).toEqual({ typ: 0 })
      expect(changes).toEqual(['Wait time clamped for "Dev"'])
      expectValid(stream)
    })

    it('"Dev" and "Test" both follow "Intake" in parallel', () => {
      const { intake, dev, test, steps } = intakeDevTest()
      dev.position = { x: 200, y: 0 }
      test.position = { x: 100, y: 0 }

      const { stream, changes } = migrateV1ToV2(
        v1Map(steps, [forward(intake, dev), forward(intake, test)])
      )

      expect(namesOf(stream)).toEqual(['Intake', 'Test', 'Dev'])
      expect(changes).toEqual(['Parallel steps placed in order'])
      expectValid(stream)
    })

    it('"Dev" has queue size 5 and batch size 2', () => {
      const { steps } = intakeDevTest({ queueSize: 5, batchSize: 2 })

      const { stream, changes } = migrateV1ToV2(v1Map(steps))

      expect(stepNamed(stream, 'Dev')).not.toHaveProperty('queueSize')
      expect(stepNamed(stream, 'Dev')).not.toHaveProperty('batchSize')
      expect(changes).toEqual(['Fields dropped: queue size, batch size'])
      expectValid(stream)
    })

    it('forward connections form a cycle', () => {
      const { dev, test, steps } = intakeDevTest()
      steps[0].position = { x: 0, y: 0 }
      dev.position = { x: 100, y: 0 }
      test.position = { x: 200, y: 0 }

      const { stream, changes } = migrateV1ToV2(
        v1Map(steps, [
          forward(steps[0], dev),
          forward(dev, test),
          forward(test, dev),
        ])
      )

      expect(namesOf(stream)).toEqual(['Intake', 'Dev', 'Test'])
      expect(changes).toEqual(['Parallel steps placed in order'])
      expectValid(stream)
    })
  })

  describe('Migration edge cases with nothing to report', () => {
    it('"Dev" has no process time', () => {
      const { steps } = intakeDevTest({ processTime: undefined })

      const { stream, changes } = migrateV1ToV2(v1Map(steps))

      expect(stepNamed(stream, 'Dev').processTime).toEqual({ typ: 0 })
      expect(changes).toEqual([])
      expectValid(stream)
    })

    it('"Test" has %C/A 80 and no rework connections', () => {
      const { steps } = intakeDevTest({}, { percentCompleteAccurate: 80 })

      const { stream, changes } = migrateV1ToV2(v1Map(steps))

      expect(stepNamed(stream, 'Test').pctCA).toBe(80)
      expect(currentVersion(stream).reworkPaths).toEqual([])
      expect(changes).toEqual([])
      expectValid(stream)
    })

    it('"Test" has rework connections totalling 120%', () => {
      const { intake, dev, test, steps } = intakeDevTest()

      const { stream, changes } = migrateV1ToV2(
        v1Map(steps, [
          ...chain(steps),
          reworkTo(test, dev, 60),
          reworkTo(test, intake, 60),
        ])
      )

      expect(stepNamed(stream, 'Test').pctCA).toBe(1)
      expect(shareOf(stream, 'Test', 'Dev')).toBe(50)
      expect(changes).toEqual([])
      expectValid(stream)
    })

    it('A rework connection under half a percent of the total still gets a share', () => {
      const steps = ['Intake', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'Last'].map(
        (name) => v1Step(name)
      )
      const last = steps.at(-1)

      const { stream, changes } = migrateV1ToV2(
        v1Map(steps, [
          ...chain(steps),
          reworkTo(last, steps[0], 1),
          ...steps.slice(1, 7).map((step) => reworkTo(last, step, 100)),
        ])
      )

      expect(shareOf(stream, 'Last', 'Intake')).toBe(1)
      expect(currentVersion(stream).reworkPaths).toHaveLength(7)
      expect(changes).toEqual([])
      expectValid(stream)
    })
  })

  it('The map name, description and dates carry over', () => {
    const { steps } = intakeDevTest()
    const v1 = { ...v1Map(steps), name: 'Checkout', description: 'End to end' }

    const { stream } = migrateV1ToV2(v1)

    expect(stream).toMatchObject({
      schemaVersion: 2,
      id: 'v1-map',
      name: 'Checkout',
      description: 'End to end',
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-16T10:00:00.000Z',
    })
  })

  it('A v1 map that never got an id gets one', () => {
    const { steps } = intakeDevTest()

    const { stream } = migrateV1ToV2({ ...v1Map(steps), id: null })

    expect(typeof stream.id).toBe('string')
    expect(stream.id).not.toBe('')
  })

  describe('Rework direction follows the final order', () => {
    const intakeLast = () => {
      const dev = v1Step('Dev', { position: { x: 0, y: 0 } })
      const intake = v1Step('intake', { position: { x: 300, y: 0 } })
      return { dev, intake }
    }

    it('keeps rework from Dev back to a moved intake step out of the forward removal', () => {
      const { dev, intake } = intakeLast()

      const { stream, changes } = migrateV1ToV2(
        v1Map([dev, intake], [forward(dev, intake), reworkTo(dev, intake, 10)])
      )

      expect(namesOf(stream)).toEqual(['Intake', 'Dev'])
      expect(shareOf(stream, 'Dev', 'Intake')).toBe(100)
      expect(changes).toEqual([])
      expectValid(stream)
    })

    it('removes rework from a moved intake step forward to Dev', () => {
      const { dev, intake } = intakeLast()

      const { stream, changes } = migrateV1ToV2(
        v1Map([dev, intake], [forward(dev, intake), reworkTo(intake, dev, 10)])
      )

      expect(currentVersion(stream).reworkPaths).toEqual([])
      expect(changes).toEqual(['Forward rework path removed'])
      expectValid(stream)
    })
  })

  it('A v1 step with no name migrates with an empty name', () => {
    const { stream } = migrateV1ToV2({
      steps: [{ id: 'a', processTime: 5 }],
    })

    expect(namesOf(stream)).toEqual(['Intake', ''])
  })

  describe('A v1 map saved with damaged data', () => {
    const stepIds = (stream) => currentVersion(stream).steps.map((s) => s.id)

    it('gives steps with no id a unique id each', () => {
      const { stream } = migrateV1ToV2({
        steps: [{ name: 'A' }, { name: 'B' }],
      })

      expect(new Set(stepIds(stream)).size).toBe(3)
      expect(stepIds(stream).every((id) => typeof id === 'string')).toBe(true)
      expectValid(stream)
    })

    it('gives a repeated id to the first step only', () => {
      const { stream } = migrateV1ToV2({
        steps: [
          { id: 'x', name: 'A', position: { x: 0, y: 0 } },
          { id: 'x', name: 'B', position: { x: 100, y: 0 } },
        ],
        connections: [{ source: 'x', target: 'x', type: 'forward' }],
      })

      expect(namesOf(stream)).toEqual(['Intake', 'A', 'B'])
      expect(stepIds(stream)[1]).toBe('x')
      expect(new Set(stepIds(stream)).size).toBe(3)
      expectValid(stream)
    })

    it('replaces an id that is not text', () => {
      const { stream } = migrateV1ToV2({ steps: [{ id: 5, name: 'A' }] })

      expect(typeof stepIds(stream)[1]).toBe('string')
      expectValid(stream)
    })

    it('keeps rework mapped to a step whose id was repeated', () => {
      const first = { id: 'x', name: 'A', position: { x: 0, y: 0 } }
      const second = { id: 'x', name: 'B', position: { x: 100, y: 0 } }

      const { stream } = migrateV1ToV2({
        steps: [first, second],
        connections: [
          { source: 'x', target: 'x', type: 'rework', reworkRate: 10 },
        ],
      })

      expect(currentVersion(stream).reworkPaths).toHaveLength(1)
      expect(shareOf(stream, 'A', 'A')).toBe(100)
      expectValid(stream)
    })

    it('skips steps and connections that are not objects', () => {
      const { stream } = migrateV1ToV2({
        steps: [null, { id: 'a', name: 'Dev' }, 7],
        connections: [null, 'x'],
      })

      expect(namesOf(stream)).toEqual(['Intake', 'Dev'])
      expectValid(stream)
    })

    it('treats connections that are not a list as none', () => {
      const { stream } = migrateV1ToV2({
        steps: [{ id: 'a', name: 'Dev' }],
        connections: {},
      })

      expect(namesOf(stream)).toEqual(['Intake', 'Dev'])
      expectValid(stream)
    })

    it('does not change the damaged v1 map', () => {
      const v1 = { steps: [{ name: 'A' }, null], connections: {} }
      const before = structuredClone(v1)

      migrateV1ToV2(v1)

      expect(v1).toEqual(before)
    })
  })

  it('A v1 step with no position sits at the origin', () => {
    const { stream } = migrateV1ToV2({
      steps: [{ id: 'a', name: 'Dev' }],
    })

    expect(stepNamed(stream, 'Dev').position).toEqual({ x: 0, y: 0 })
  })

  it('A migrated step does not share its position object with v1', () => {
    const { steps } = intakeDevTest()

    const { stream } = migrateV1ToV2(v1Map(steps))

    expect(stepNamed(stream, 'Dev').position).not.toBe(steps[1].position)
  })

  it('A rework rate saved as text still counts', () => {
    const { intake, dev, test, steps } = intakeDevTest()

    const { stream } = migrateV1ToV2(
      v1Map(steps, [
        ...chain(steps),
        reworkTo(test, dev, '20'),
        reworkTo(test, intake, '10'),
      ])
    )

    expect(stepNamed(stream, 'Test').pctCA).toBe(70)
    expect(shareOf(stream, 'Test', 'Dev')).toBe(67)
    expect(shareOf(stream, 'Test', 'Intake')).toBe(33)
  })

  it('A rework rate that is not a number is ignored', () => {
    const { dev, test, steps } = intakeDevTest()

    const { stream, changes } = migrateV1ToV2(
      v1Map(steps, [...chain(steps), reworkTo(test, dev, 'lots')])
    )

    expect(currentVersion(stream).reworkPaths).toEqual([])
    expect(changes).toEqual([])
  })

  it('A v1 map with nothing to change', () => {
    const { steps } = intakeDevTest()
    const { stream, changes } = migrateV1ToV2(v1Map(steps.slice(0, 2)))

    expect(namesOf(stream)).toEqual(['Intake', 'Dev'])
    expect(changes).toEqual([])
    expectValid(stream)
  })

  it('A v1 map with only an Intake step', () => {
    const { stream, changes } = migrateV1ToV2(
      v1Map([v1Step('Intake', { processTime: 0, leadTime: 0 })])
    )

    expect(namesOf(stream)).toEqual(['Intake'])
    expect(changes).toEqual([])
    expectValid(stream)
  })

  it('Migration is idempotent', () => {
    const { steps } = intakeDevTest({ queueSize: 5 })
    const migrated = migrateV1ToV2(v1Map(steps)).stream
    const before = structuredClone(migrated)

    const again = migrateV1ToV2(migrated)

    expect(again.stream).toEqual(before)
    expect(again.changes).toEqual([])
  })
})

// --- Loading (step 3.3) -----------------------------------------------------
// The v1 map is stored through the real v1 localStorage repository, so the
// tests prove the v1 key is read and left exactly as it was.

const V1_KEY = 'vsm-data-storage'

const saveV1 = (v1) => localStorage.setItem(V1_KEY, JSON.stringify(v1))
const rawV1 = () => localStorage.getItem(V1_KEY)

const devAndTest = () =>
  v1Map([
    v1Step('Dev', { leadTime: 240, processTime: 60 }),
    v1Step('Test', { leadTime: 120, processTime: 30 }),
  ])

const workspaceText = (...names) =>
  serializeWorkspace(
    createWorkspace({ streams: names.map((name) => referenceStream({ name })) })
  )

const streamNames = (workspace) => workspace.streams.map((s) => s.name)

beforeEach(() => {
  localStorage.clear()
})

describe('Loading the saved map', () => {
  it('First launch opens an empty workspace', async () => {
    const repo = createMemoryWorkspaceRepository()

    const result = await loadWorkspace(repo, vsmLocalStorageRepo)

    expect(result.workspace.streams).toEqual([])
    expect(result.changes).toEqual([])
    expect(result.unreadable).toBeNull()
    expect(await repo.loadBackup()).toBeNull()
  })

  it('v1 map migrates with the same lead and process time', async () => {
    saveV1(devAndTest())
    const before = rawV1()

    const result = await loadWorkspace(
      createMemoryWorkspaceRepository(),
      vsmLocalStorageRepo
    )

    const [stream] = result.workspace.streams
    expect(result.workspace.streams).toHaveLength(1)
    expect(namesOf(stream)).toEqual(['Intake', 'Dev', 'Test'])
    const totals = calculateTotals(currentVersion(stream).steps)
    expect(totals.leadTime.typ).toBe(360)
    expect(totals.processTime.typ).toBe(90)
    expect(result.changes).toEqual(['Intake step added'])
    expect(rawV1()).toBe(before)
  })

  it('An existing workspace wins over a v1 map', async () => {
    saveV1(devAndTest())
    const before = rawV1()
    const repo = createMemoryWorkspaceRepository({
      raw: workspaceText('Checkout delivery'),
    })

    const result = await loadWorkspace(repo, vsmLocalStorageRepo)

    expect(streamNames(result.workspace)).toEqual(['Checkout delivery'])
    expect(result.changes).toEqual([])
    expect(rawV1()).toBe(before)
  })

  it('Migration is idempotent', async () => {
    saveV1(devAndTest())
    const repo = createMemoryWorkspaceRepository()
    const first = await loadWorkspace(repo, vsmLocalStorageRepo)
    await repo.save(first.workspace)

    const again = await loadWorkspace(repo, vsmLocalStorageRepo)

    expect(again.workspace.streams).toEqual(first.workspace.streams)
    expect(again.changes).toEqual([])
  })

  it('Corrupted saved data is kept and reported', async () => {
    const raw = '{"format": "vsm-workspace", oops'
    const repo = createMemoryWorkspaceRepository({ raw })

    const result = await loadWorkspace(repo, vsmLocalStorageRepo)

    expect(result.unreadable).toEqual(anyReason)
    expect(result.workspace).toBeNull()
    expect(await repo.loadBackup()).toBe(raw)
    expect(await repo.load()).toBe(raw)
  })

  it("A corrupt workspace doesn't migrate the v1 map", async () => {
    saveV1(devAndTest())
    const before = rawV1()
    const repo = createMemoryWorkspaceRepository({ raw: 'not json' })

    const result = await loadWorkspace(repo, vsmLocalStorageRepo)

    expect(result.unreadable).toEqual(anyReason)
    expect(result.workspace).toBeNull()
    expect(rawV1()).toBe(before)
  })

  it('Saved data from a newer version is refused', async () => {
    const raw = JSON.stringify({
      ...JSON.parse(workspaceText('Checkout delivery')),
      schemaVersion: 9,
    })
    const repo = createMemoryWorkspaceRepository({ raw })

    const result = await loadWorkspace(repo, vsmLocalStorageRepo)

    expect(result.unreadable).toEqual(anyReason)
    expect(await repo.load()).toBe(raw)
    expect(await repo.loadBackup()).toBe(raw)
  })

  it('Saved data that is not a workspace is kept as a backup', async () => {
    const raw = '{"hello":"world"}'
    const repo = createMemoryWorkspaceRepository({ raw })

    const result = await loadWorkspace(repo, vsmLocalStorageRepo)

    expect(result.unreadable).toEqual(anyReason)
    expect(await repo.loadBackup()).toBe(raw)
  })

  it('still reports unreadable data when the backup cannot be kept', async () => {
    const raw = 'not json'
    const repo = {
      ...createMemoryWorkspaceRepository({ raw }),
      saveBackup: async () => {
        throw new Error('quota exceeded')
      },
    }

    const result = await loadWorkspace(repo, vsmLocalStorageRepo)

    expect(result.unreadable).toEqual(anyReason)
    expect(result.workspace).toBeNull()
    expect(result.backupFailed).toBe(true)
    expect(await repo.load()).toBe(raw)
  })

  it('does not flag a backup failure when the backup was kept', async () => {
    const repo = createMemoryWorkspaceRepository({ raw: 'not json' })

    const result = await loadWorkspace(repo, vsmLocalStorageRepo)

    expect(result).not.toHaveProperty('backupFailed')
  })

  it('fails when the workspace cannot be read, leaving the v1 map alone', async () => {
    saveV1(devAndTest())
    const before = rawV1()
    const repo = {
      ...createMemoryWorkspaceRepository(),
      load: async () => {
        throw new Error('database closed')
      },
    }

    await expect(loadWorkspace(repo, vsmLocalStorageRepo)).rejects.toThrow(
      'database closed'
    )
    expect(rawV1()).toBe(before)
  })

  it('treats a v1 key that is not JSON as nothing saved', async () => {
    localStorage.setItem(V1_KEY, '{oops')

    const result = await loadWorkspace(
      createMemoryWorkspaceRepository(),
      vsmLocalStorageRepo
    )

    expect(result.workspace.streams).toEqual([])
    expect(result.unreadable).toBeNull()
    expect(rawV1()).toBe('{oops')
  })

  it('does not back up data that loaded fine', async () => {
    const repo = createMemoryWorkspaceRepository({
      raw: workspaceText('Checkout delivery'),
    })

    await loadWorkspace(repo, vsmLocalStorageRepo)

    expect(await repo.loadBackup()).toBeNull()
  })
})

// --- Importing a value stream file (step 3.3) --------------------------------

// The workspace the import scenarios start from: one stream, "Checkout".
const checkout = () => referenceStream({ name: 'Checkout' })

describe('Importing a value stream file', () => {
  it('Import a v1 JSON file', () => {
    const existing = checkout()
    const before = structuredClone(existing)
    const dev = v1Step('Dev', { leadTime: 240, processTime: 60 })

    const result = importValueStream(JSON.stringify(v1Map([dev])), [
      existing.id,
    ])

    expect(result.ok).toBe(true)
    expect(namesOf(result.stream)).toEqual(['Intake', 'Dev'])
    expect(
      calculateTotals(currentVersion(result.stream).steps).leadTime.typ
    ).toBe(240)
    expect(result.stream.id).not.toBe(existing.id)
    expect(existing).toEqual(before)
  })

  it('An imported id that already exists gets a new id', () => {
    const existing = checkout()
    const before = structuredClone(existing)

    const result = importValueStream(exportValueStream(existing), [existing.id])

    expect(result.ok).toBe(true)
    expect(result.stream.id).not.toBe(existing.id)
    expect({ ...result.stream, id: existing.id }).toEqual(existing)
    expect(existing).toEqual(before)
  })

  it.each([
    ['is not valid JSON', () => 'not json', "This file isn't valid JSON"],
    [
      'has schemaVersion 9',
      () => JSON.stringify({ ...checkout(), schemaVersion: 9 }),
      'This file was made by a newer version of the app',
    ],
    [
      'has a rework path pointing forward',
      () => exportValueStream(withForwardRework(checkout())),
      'Rework can only go back to an earlier step',
    ],
  ])(
    'Malformed or unsupported import is rejected: a file that %s',
    (_problem, fileText, message) => {
      const existing = checkout()
      const before = structuredClone(existing)

      const result = importValueStream(fileText(), [existing.id])

      expect(result).toEqual({ ok: false, error: message })
      expect(existing).toEqual(before)
    }
  )

  it('JSON v2 export round-trips', () => {
    const exported = withFutureState(checkout())

    const result = importValueStream(exportValueStream(exported), [exported.id])

    expect(result.ok).toBe(true)
    expect(result.stream.versions).toHaveLength(2)
    expect({ ...result.stream, id: exported.id }).toEqual(exported)
  })
})
