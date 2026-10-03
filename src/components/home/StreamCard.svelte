<script>
  // StreamCard props: summary (from streamSummary), onopen().
  let { summary, onopen } = $props()

  let detailsId = $derived(`stream-${summary.id}-details`)

  // The link stays a real link (so it can be opened in a new tab and is announced as
  // one), but a plain click opens the stream in this page.
  function handleClick(event) {
    event.preventDefault()
    onopen()
  }
</script>

<!-- The right padding leaves room for the card menu button (9.2), a sibling of the link. -->
<li
  class="relative bg-white rounded-lg shadow-md p-4 pr-14 hover:bg-gray-50"
  data-testid="stream-card"
>
  <h2 class="font-semibold">
    <a
      href="#{summary.id}"
      class="text-blue-700 underline after:absolute after:inset-0 focus:outline-none focus:after:ring-2 focus:after:ring-blue-500 focus:after:rounded-lg"
      aria-describedby={detailsId}
      data-testid="stream-card-link"
      onclick={handleClick}
    >
      {summary.name}
    </a>
  </h2>
  <p id={detailsId} class="mt-1 text-sm text-gray-600">
    <span data-testid="stream-card-steps">{summary.steps}</span>
    <span aria-hidden="true">&middot;</span>
    <span data-testid="stream-card-stage">
      Furthest stage: {summary.furthestStage}
    </span>
    {#if summary.updated}
      <span aria-hidden="true">&middot;</span>
      <span data-testid="stream-card-updated">{summary.updated}</span>
    {/if}
    {#if summary.created}
      <span aria-hidden="true">&middot;</span>
      <span data-testid="stream-card-created">{summary.created}</span>
    {/if}
  </p>
</li>
