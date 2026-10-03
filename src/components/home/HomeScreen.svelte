<script>
  import { onMount } from 'svelte'
  import { workspaceStore } from '../../stores/v2/workspaceStore.svelte.js'
  import { streamSummary } from '../../utils/ui/streamSummary.js'
  import StreamCard from './StreamCard.svelte'

  // One reading of the clock per visit, so "Updated 2 days ago" is the same for
  // every card and does not shift while the screen is open.
  const now = new Date()

  let summaries = $derived(
    workspaceStore.streams.map((stream) => streamSummary(stream, now))
  )
  let heading = $state()

  onMount(() => heading?.focus())

  function handleNewValueStream() {
    const created = workspaceStore.create({})
    if (created.ok) workspaceStore.open(created.streamId)
  }
</script>

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
      onclick={handleNewValueStream}
    >
      New value stream
    </button>
  </div>

  {#if summaries.length > 0}
    <ul class="mt-4 flex flex-col gap-4" data-testid="stream-list">
      {#each summaries as summary (summary.id)}
        <StreamCard
          {summary}
          onopen={() => workspaceStore.open(summary.id)}
        />
      {/each}
    </ul>
  {/if}
</main>
