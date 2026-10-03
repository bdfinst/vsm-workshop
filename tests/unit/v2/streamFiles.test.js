import { describe, expect, it, vi } from 'vitest'
import {
  exportStreamFile,
  FILE_TOO_LARGE_MESSAGE,
  importStreamFile,
  MAX_FILE_BYTES,
  READ_ERROR_MESSAGE,
} from '../../../src/utils/ui/streamFiles.js'

/**
 * The file adapters take the store and the file as plain objects, so the tests
 * hand them recording stand-ins for the workspace store, a file and a download.
 */

const fakeFile = (text, size = text.length) => ({
  size,
  text: vi.fn(async () => text),
})

const fakeStore = ({ streams = [], importResult, exportResult } = {}) => ({
  streams,
  importStream: vi.fn(() => importResult),
  exportStream: vi.fn(() => exportResult),
})

describe('importStreamFile', () => {
  it('hands the file text to the store and names the stream it added', async () => {
    // The imported stream is found by id, whatever is listed before or after it.
    const store = fakeStore({
      streams: [
        { id: 'before', name: 'Before' },
        { id: 'new-id', name: '  Checkout  ' },
        { id: 'after', name: 'After' },
      ],
      importResult: { ok: true, streamId: 'new-id', changes: [] },
    })

    const result = await importStreamFile(fakeFile('{"a":1}'), store)

    expect(store.importStream).toHaveBeenCalledWith('{"a":1}')
    expect(result).toEqual({
      ok: true,
      streamId: 'new-id',
      name: 'Checkout',
      changes: [],
    })
  })

  it('passes on what upgrading a v1 file changed, so the screen can say so', async () => {
    const store = fakeStore({
      streams: [{ id: 'new-id', name: 'Old map' }],
      importResult: {
        ok: true,
        streamId: 'new-id',
        changes: ['Wait time clamped for "Dev"'],
      },
    })

    const result = await importStreamFile(fakeFile('{}'), store)

    expect(result.changes).toEqual(['Wait time clamped for "Dev"'])
  })

  it('names an unnamed stream by its card name', async () => {
    const store = fakeStore({
      streams: [{ id: 'new-id', name: '' }],
      importResult: { ok: true, streamId: 'new-id', changes: [] },
    })

    const result = await importStreamFile(fakeFile('{}'), store)

    expect(result.name).toBe('Untitled value stream')
  })

  it('passes on the store refusal as it is', async () => {
    const refusal = { ok: false, error: "This file isn't valid JSON" }
    const store = fakeStore({ importResult: refusal })

    expect(await importStreamFile(fakeFile('nope'), store)).toEqual(refusal)
  })

  it('refuses a file that cannot be read, and does not touch the store', async () => {
    const store = fakeStore()
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
      const store = fakeStore()
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
      const store = fakeStore({
        streams: [{ id: 's', name: 'A' }],
        importResult: { ok: true, streamId: 's', changes: [] },
      })
      const file = fakeFile('{}', MAX_FILE_BYTES)

      const result = await importStreamFile(file, store)

      expect(result.ok).toBe(true)
      expect(file.text).toHaveBeenCalledOnce()
    })
  })
})

describe('exportStreamFile', () => {
  it('downloads the stream text under the file name of the stream with that id', () => {
    const store = fakeStore({
      streams: [
        { id: 's0', name: 'Other' },
        { id: 's1', name: 'Q3: plan' },
      ],
      exportResult: { ok: true, text: '{"a":1}' },
    })
    const download = vi.fn()

    const result = exportStreamFile(store, 's1', { download })

    expect(store.exportStream).toHaveBeenCalledWith('s1')
    expect(download).toHaveBeenCalledWith('Q3- plan.json', '{"a":1}')
    expect(result).toEqual({ ok: true, text: '{"a":1}' })
  })

  it.each(['', '   '])(
    'files an unnamed stream (%j) as "Untitled value stream"',
    (name) => {
      const store = fakeStore({
        streams: [{ id: 's1', name }],
        exportResult: { ok: true, text: '{}' },
      })
      const download = vi.fn()

      exportStreamFile(store, 's1', { download })

      expect(download).toHaveBeenCalledWith('Untitled value stream.json', '{}')
    }
  )

  it('downloads nothing when the store refuses', () => {
    const refusal = {
      ok: false,
      error: "That value stream isn't in the workspace",
    }
    const store = fakeStore({ exportResult: refusal })
    const download = vi.fn()

    const result = exportStreamFile(store, 'gone', { download })

    expect(result).toEqual(refusal)
    expect(download).not.toHaveBeenCalled()
  })
})
