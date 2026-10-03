<script>
  import { onMount, tick } from 'svelte'
  import { workspaceStore } from '../../stores/v2/workspaceStore.svelte.js'
  import { toastStore } from '../../stores/toastStore.svelte.js'
  import { createDeleteUndo } from '../../utils/session/deleteUndo.js'
  import { indexAfterDelete } from '../../utils/ui/focusAfterDelete.js'
  import { isTextEntry, shortcutFor } from '../../utils/ui/keymap.js'
  import { streamSummary } from '../../utils/ui/streamSummary.js'
  import StreamCard from './StreamCard.svelte'

  // One reading of the clock per visit, so "Updated 2 days ago" is the same for
  // every card and does not shift while the screen is open.
  const now = new Date()

  let summaries = $derived(
    workspaceStore.streams.map((stream) => streamSummary(stream, now))
  )
  let heading = $state()
  let listElement = $state()
  let newButton = $state()

  onMount(() => heading?.focus())

  // The home screen has no stream undo history: Undo restores the last delete.
  let lastDelete = null

  // The id makes a repeated message a new node, so screen readers say it again.
  let announcement = $state({ id: 0, text: '' })

  function announce(text) {
    announcement = { id: announcement.id + 1, text }
  }

  const focusCardLink = (id) =>
    listElement
      ?.querySelector(`[data-stream-id="${CSS.escape(id)}"]`)
      ?.querySelector('[data-testid="stream-card-link"]')
      ?.focus()

  function undoLastDelete() {
    if (!lastDelete) return { ok: false, error: 'Nothing to restore' }
    const { token, name } = lastDelete
    const result = workspaceStore.restore(token)
    if (!result.ok) return result
    lastDelete = null
    deleteUndo.close()
    tick().then(() => focusCardLink(result.streamId))
    return { ok: true, announcement: `${name} restored` }
  }

  const deleteUndo = createDeleteUndo({
    toastStore,
    undo: undoLastDelete,
    hint: 'Ctrl+Z to undo',
    onannounce: announce,
  })

  // On unmount (opening a stream) the effect's cleanup closes the toast.
  $effect(() => deleteUndo.close)

  function handleKeydown(event) {
    const action = shortcutFor(event, {
      inTextField: isTextEntry(event.target),
    })
    if (action !== 'undo' || !lastDelete) return
    event.preventDefault()
    const result = undoLastDelete()
    if (result.ok) announce(result.announcement)
  }

  function handleRename(id, name) {
    return workspaceStore.rename(id, name)
  }

  function handleDuplicate(summary) {
    const result = workspaceStore.duplicate(summary.id)
    if (!result.ok) return
    const copy = workspaceStore.streams.find((s) => s.id === result.streamId)
    announce(`${copy?.name ?? 'A copy'} added after ${summary.name}`)
  }

  // Focus goes to the card now in the deleted one's position, else the one
  // before it, else "New value stream".
  async function handleDelete(summary) {
    const index = summaries.findIndex((s) => s.id === summary.id)
    const result = workspaceStore.remove(summary.id)
    if (!result.ok) return
    lastDelete = { token: result.token, name: summary.name }
    deleteUndo.offer(summary.name)
    await tick()
    const next = summaries[indexAfterDelete(index, summaries.length)]
    if (next) focusCardLink(next.id)
    else newButton?.focus()
  }

  function handleNewValueStream() {
    const created = workspaceStore.create({})
    if (created.ok) workspaceStore.open(created.streamId)
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<main class="p-4 max-w-3xl mx-auto" data-testid="home-screen">
  <h1
    class="text-xl font-semibold"
    tabindex="-1"
    bind:this={heading}
    data-testid="home-heading"
  >
    All value streams
  </h1>
  <p class="mt-2 text-gray-600" data-testid="workspace-explainer">
    Your workspace keeps every value stream you map in one place, so you can
    switch between them without losing any.
  </p>

  <div class="mt-4">
    <button
      type="button"
      class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      data-testid="new-value-stream-button"
      bind:this={newButton}
      onclick={handleNewValueStream}
    >
      New value stream
    </button>
  </div>

  {#if summaries.length > 0}
    <ul
      class="mt-4 flex flex-col gap-4"
      data-testid="stream-list"
      bind:this={listElement}
    >
      {#each summaries as summary (summary.id)}
        <StreamCard
          {summary}
          onopen={() => workspaceStore.open(summary.id)}
          onrename={(name) => handleRename(summary.id, name)}
          onduplicate={() => handleDuplicate(summary)}
          ondelete={() => handleDelete(summary)}
        />
      {/each}
    </ul>
  {:else}
    <p class="mt-4 text-gray-600" data-testid="empty-state">
      No value streams yet
    </p>
  {/if}
  <div class="sr-only" role="status" data-testid="home-live-region">
    {#key announcement.id}
      <span>{announcement.text}</span>
    {/key}
  </div>
</main>
