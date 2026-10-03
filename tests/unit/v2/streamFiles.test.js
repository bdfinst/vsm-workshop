import { describe, expect, it, vi } from 'vitest'
import { createStep as createV1Step } from '../../../src/models/StepFactory.js'
import {
  exportStreamFile,
  FILE_TOO_LARGE_MESSAGE,
  importStreamFile,
  MAX_FILE_BYTES,
  READ_ERROR_MESSAGE,
} from '../../../src/utils/ui/streamFiles.js'
import { makeStore, referenceStream, refused } from './fixtures.js'

/**
 * The success paths run over a real workspace store, so the adapters are tested
 * against the answers the store really gives. The file and the download are
 * plain stand-ins.
 */

const fakeFile = (text, size = text.length) => ({
  size,
  text: vi.fn(async () => text),
})

const v1Text = () =>
  JSON.stringify({
    id: 'v1-map',
    name: 'Old map',
    description: '',
    steps: [createV1Step('Dev', { leadTime: 240, processTime: 60 })],
    connections: [],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-16T10:00:00.000Z',
  })

// double-waiver: B1 - these refusals happen before the store is reached, so the
// stand-in's only job is to record that it was never called.
const untouchedStore = () => ({ importStream: vi.fn() })

describe('importStreamFile', () => {
  it('hands the file text to the store and names the stream it added', async () => {
    const store = await makeStore({ streams: [referenceStream()] })
    const text = JSON.stringify(referenceStream({ name: '  Checkout  ' }))

    const result = await importStreamFile(fakeFile(text), store)

    expect(result).toEqual({
      ok: true,
      streamId: store.streams[1].id,
      name: 'Checkout',
      changes: [],
    })
    expect(store.streams).toHaveLength(2)
  })

  it('names an unnamed stream as the store lists it', async () => {
    const store = await makeStore()
    const text = JSON.stringify(referenceStream({ name: '' }))

    const result = await importStreamFile(fakeFile(text), store)

    expect(result).toMatchObject({ ok: true, name: 'Untitled value stream' })
  })

  it('passes on what upgrading a v1 file changed, so the screen can say so', async () => {
    const store = await makeStore()

    const result = await importStreamFile(fakeFile(v1Text()), store)

    expect(result).toMatchObject({ ok: true, name: 'Old map' })
    expect(result.changes).toEqual(['Intake step added'])
  })

  it('passes on the store refusal as it is, and adds nothing', async () => {
    const store = await makeStore()

    const result = await importStreamFile(fakeFile('nope'), store)

    expect(result).toEqual(refused)
    expect(store.streams).toEqual([])
  })

  it('refuses a file that cannot be read, and does not touch the store', async () => {
    const store = untouchedStore()
    const file = {
      size: 10,
      text: vi.fn(async () => {
        throw new Error('disk gone')
      }),
    }

    const result = await importStreamFile(file, store)

    expect(result).toEqual({ ok: false, error: READ_ERROR_MESSAGE })
    expect(store.importStream).not.toHaveBeenCalled()
  })

  describe('the size limit', () => {
    it('is 10 MB, as for the other file imports', () => {
      expect(MAX_FILE_BYTES).toBe(10000000)
    })

    it('refuses a file over the limit before reading it', async () => {
      const store = untouchedStore()
      const file = fakeFile('x', MAX_FILE_BYTES + 1)

      const result = await importStreamFile(file, store)

      expect(result).toEqual({ ok: false, error: FILE_TOO_LARGE_MESSAGE })
      expect(FILE_TOO_LARGE_MESSAGE).toBe(
        'File is too large. Please select a file under 10 MB.'
      )
      expect(file.text).not.toHaveBeenCalled()
      expect(store.importStream).not.toHaveBeenCalled()
    })

    it('reads a file exactly at the limit', async () => {
      const store = await makeStore()
      const text = JSON.stringify(referenceStream())
      const file = fakeFile(text, MAX_FILE_BYTES)

      const result = await importStreamFile(file, store)

      expect(result.ok).toBe(true)
      expect(file.text).toHaveBeenCalledOnce()
    })
  })
})

describe('exportStreamFile', () => {
  it('downloads the stream text under the file name of the name the store gave', async () => {
    const stream = referenceStream({ name: 'Q3: plan' })
    const store = await makeStore({ streams: [referenceStream(), stream] })
    const download = vi.fn()

    const result = exportStreamFile(store, stream.id, { download })

    expect(result).toEqual({
      ok: true,
      streamId: stream.id,
      name: 'Q3: plan',
      text: expect.any(String),
    })
    expect(download).toHaveBeenCalledWith('Q3- plan.json', result.text)
    expect(JSON.parse(result.text)).toEqual(stream)
  })

  it('files an unnamed stream as "Untitled value stream"', async () => {
    const stream = referenceStream({ name: '' })
    const store = await makeStore({ streams: [stream] })
    const download = vi.fn()

    exportStreamFile(store, stream.id, { download })

    expect(download).toHaveBeenCalledWith(
      'Untitled value stream.json',
      expect.any(String)
    )
  })

  it('downloads nothing when the store refuses', async () => {
    const store = await makeStore({ streams: [referenceStream()] })
    const download = vi.fn()

    const result = exportStreamFile(store, 'gone', { download })

    expect(result).toEqual(refused)
    expect(download).not.toHaveBeenCalled()
  })
})
