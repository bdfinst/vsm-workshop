import { describe, expect, it, vi } from 'vitest'
import { browserDownload } from '../../../src/infrastructure/v2/browserDownload.js'

/**
 * browserDownload talks to the browser (document, URL). The tests hand it
 * recording stand-ins for those two boundaries and a real Blob.
 */

// jsdom's Blob has no text().
const readBlob = (blob) =>
  new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsText(blob)
  })

const fakeBrowser = () => {
  const calls = []
  const link = {
    click: vi.fn(() => calls.push('click')),
    remove: vi.fn(() => calls.push('remove')),
  }
  const document = {
    createElement: vi.fn(() => link),
    body: { appendChild: vi.fn(() => calls.push('append')) },
  }
  const url = {
    createObjectURL: vi.fn(() => 'blob:abc'),
    revokeObjectURL: vi.fn(() => calls.push('revoke')),
  }
  return { link, document, url, calls }
}

describe('browserDownload', () => {
  it('clicks a link that downloads under the given name', () => {
    const { link, document, url } = fakeBrowser()

    browserDownload('Checkout.json', '{"a":1}', { document, url })

    expect(document.createElement).toHaveBeenCalledWith('a')
    expect(link.download).toBe('Checkout.json')
    expect(link.href).toBe('blob:abc')
    expect(link.click).toHaveBeenCalledOnce()
  })

  it('downloads the text as a JSON file', async () => {
    const { document, url } = fakeBrowser()

    browserDownload('a.json', '{"a":1}', { document, url })

    const blob = url.createObjectURL.mock.calls[0][0]
    expect(blob.type).toBe('application/json')
    expect(await readBlob(blob)).toBe('{"a":1}')
  })

  it('puts the link in the page for the click, then removes it and frees the url', () => {
    const { document, url, calls } = fakeBrowser()

    browserDownload('a.json', '{}', { document, url })

    expect(calls).toEqual(['append', 'click', 'remove', 'revoke'])
    expect(url.revokeObjectURL).toHaveBeenCalledWith('blob:abc')
  })

  it('uses the browser globals when none are given', () => {
    const createObjectURL = vi.fn(() => 'blob:global')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    try {
      browserDownload('g.json', '{}')

      expect(click).toHaveBeenCalledOnce()
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:global')
    } finally {
      click.mockRestore()
      vi.unstubAllGlobals()
    }
  })
})
