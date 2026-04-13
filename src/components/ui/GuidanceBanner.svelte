<script>
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'
  import { vsmUIStore } from '../../stores/vsmUIStore.svelte.js'

  let visible = $derived(
    vsmUIStore.guidanceForceShow ||
      (vsmDataStore.steps.length === 0 && !vsmUIStore.guidanceDismissed)
  )

  function handleDismiss() {
    vsmUIStore.dismissGuidance()
  }
</script>

{#if visible}
  <div
    class="absolute top-4 left-1/2 -translate-x-1/2 z-10 max-w-lg w-full"
    data-testid="guidance-banner"
  >
    <div class="bg-blue-50 border border-blue-200 rounded-lg shadow-md p-4 flex items-start gap-3">
      <div class="text-blue-600 text-xl flex-shrink-0" aria-hidden="true">
        &#x2190;
      </div>
      <div class="flex-1">
        <p class="text-sm font-medium text-blue-800">
          Start from the end: map backwards
        </p>
        <p class="text-sm text-blue-600 mt-1">
          Add your final delivery step first (e.g., "Deploy to Production"), then
          work backwards. Each new step will be placed to the left, tracing your
          value stream from customer back to source.
        </p>
      </div>
      <button
        onclick={handleDismiss}
        class="text-blue-400 hover:text-blue-600 flex-shrink-0 p-1"
        aria-label="Dismiss guidance"
        data-testid="dismiss-guidance-button"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
{/if}
