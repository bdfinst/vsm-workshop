<script>
  import { tick } from 'svelte'
  import { focusStageHeading } from '../../utils/session/focus.js'
  import {
    getPersistedValue,
    persistValue,
  } from '../../utils/persistedState.js'

  // UpgradeNotice props: changes (what migrating the v1 map changed).
  let { changes } = $props()

  // The upgraded map is not saved until its first edit, so it would be found
  // and announced again on every launch. The dismissal is kept on its own.
  const DISMISSED_KEY = 'vsm-v2-upgrade-notice-dismissed'

  let dismissed = $state(getPersistedValue(DISMISSED_KEY, false))

  // The button that had focus is removed, so focus goes to the stage heading.
  async function handleDismiss() {
    dismissed = true
    persistValue(DISMISSED_KEY, true)
    await tick()
    focusStageHeading()
  }
</script>

{#if !dismissed}
  <section
    class="m-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
    aria-labelledby="upgrade-notice-title"
    data-testid="upgrade-notice"
  >
    <div class="flex items-start justify-between gap-4">
      <h2
        id="upgrade-notice-title"
        class="font-semibold text-blue-900"
        tabindex="-1"
        data-testid="upgrade-notice-title"
      >
        Map upgraded to the new format
      </h2>
      <button
        type="button"
        class="px-3 py-1 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        data-testid="dismiss-upgrade-notice"
        onclick={handleDismiss}
      >
        Dismiss
      </button>
    </div>
    <p class="mt-2 text-blue-900">Your original map is kept.</p>
    <ul class="mt-2 list-disc pl-5 text-blue-900" data-testid="upgrade-changes">
      {#each changes as change (change)}
        <li>{change}</li>
      {/each}
    </ul>
  </section>
{/if}
