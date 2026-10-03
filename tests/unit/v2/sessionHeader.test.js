import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, unmount, flushSync } from 'svelte'
import { createValueStream } from '../../../src/models/v2/valueStream.js'
import { createValueStreamStore } from '../../../src/stores/v2/valueStreamStore.svelte.js'
import SessionHeader from '../../../src/components/session/SessionHeader.svelte'

const workspaceStore = vi.hoisted(() => ({
  startNew: vi.fn(),
}))
vi.mock('../../../src/stores/v2/workspaceStore.svelte.js', () => ({
  workspaceStore,
}))

let mounted = null

const render = () => {
  const store = createValueStreamStore({
    stream: createValueStream({ name: 'Checkout delivery' }),
    persist: () => {},
  })
  mounted = mount(SessionHeader, {
    target: document.body,
    props: { store, onundo: () => {}, onredo: () => {} },
  })
  flushSync()
  return {
    file: document.querySelector('[data-testid="file-menu-button"]'),
    item: () => document.querySelector('[data-testid="new-value-stream-item"]'),
  }
}

afterEach(() => {
  if (mounted) unmount(mounted)
  mounted = null
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('SessionHeader File menu', () => {
  it('returns focus to File when New value stream fails', async () => {
    workspaceStore.startNew.mockReturnValue({ ok: false, error: 'Not ready' })
    const { file, item } = render()
    file.click()
    await vi.waitFor(() => expect(item()).toHaveFocus())

    item().click()

    await vi.waitFor(() => expect(file).toHaveFocus())
    expect(workspaceStore.startNew).toHaveBeenCalledOnce()
  })
})
