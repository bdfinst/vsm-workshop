<script>
  // PromptCard props: heading, question, explanation, example, nextReason
  // (why Next is disabled, or null when it is allowed), onnext, children (the
  // stage's fields).
  let {
    heading,
    question,
    explanation,
    example,
    nextReason = null,
    onnext,
    children,
  } = $props()
</script>

<section data-testid="prompt-card">
  <h2 class="text-lg font-semibold" tabindex="-1" data-testid="stage-heading">
    {heading}
  </h2>
  <p class="mt-2 font-medium">{question}</p>
  <p class="text-gray-600">{explanation}</p>
  <p class="text-gray-600">Example: {example}</p>

  <div class="mt-4">
    {@render children?.()}
  </div>

  <div class="mt-4 flex flex-wrap items-center gap-4">
    <button
      type="button"
      class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={nextReason !== null}
      aria-describedby={nextReason ? 'next-reason' : undefined}
      data-testid="next-button"
      onclick={onnext}
    >
      Next
    </button>
    {#if nextReason}
      <p id="next-reason" class="text-gray-700" data-testid="next-reason">
        {nextReason}
      </p>
    {/if}
  </div>
</section>
