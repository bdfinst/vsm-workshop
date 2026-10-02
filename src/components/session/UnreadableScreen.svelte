<script>
  import { tick } from 'svelte'
  import { workspaceStore } from '../../stores/v2/workspaceStore.svelte.js'
  import { browserDownload } from '../../infrastructure/v2/browserDownload.js'
  import ConfirmPopover from '../ui/ConfirmPopover.svelte'

  // UnreadableScreen props: lifecycle (the guided lifecycle, for the ways out).
  let { lifecycle } = $props()

  const DOWNLOAD_NAME = 'unreadable-workspace.json'
  const buttonClass =
    'px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'

  let raw = $derived(workspaceStore.unreadable?.raw ?? null)
  let reason = $derived(workspaceStore.unreadable?.reason ?? '')

  let fileInput = $state()
  let importError = $state('')
  let confirming = $state(false)
  let startEmptyButton = $state()

  function handleDownload() {
    browserDownload(DOWNLOAD_NAME, raw)
  }

  async function handleFileChosen(event) {
    const file = event.currentTarget.files[0]
    event.currentTarget.value = ''
    if (!file) return
    const result = lifecycle.startFromImport(await file.text())
    importError = result.ok ? '' : result.error
  }

  function handleConfirm() {
    confirming = false
    lifecycle.startEmpty()
  }

  // The popover is gone, so focus goes back to what opened it.
  async function handleCancel() {
    confirming = false
    await tick()
    startEmptyButton?.focus()
  }
</script>

<main class="p-4 max-w-xl" data-testid="unreadable-screen">
  <h1 class="text-xl font-semibold">Unreadable workspace</h1>
  <p class="mt-2" data-testid="unreadable-message">
    We couldn't read your saved workspace. Your saved data is kept.
  </p>
  <p class="mt-1 text-gray-600" data-testid="unreadable-reason">{reason}</p>

  <div class="mt-4 flex flex-col items-start gap-4">
    <button
      type="button"
      class={buttonClass}
      data-testid="import-value-stream-button"
      onclick={() => fileInput.click()}
    >
      Import value stream
    </button>
    <input
      type="file"
      accept=".json,application/json"
      hidden
      bind:this={fileInput}
      onchange={handleFileChosen}
      data-testid="import-value-stream-input"
    />
    {#if raw !== null}
      <button
        type="button"
        class={buttonClass}
        data-testid="download-unreadable-button"
        onclick={handleDownload}
      >
        Download the unreadable data
      </button>
    {/if}
    <div class="relative">
      <button
        type="button"
        class={buttonClass}
        aria-haspopup="dialog"
        data-testid="start-empty-button"
        bind:this={startEmptyButton}
        onclick={() => (confirming = true)}
      >
        Start an empty workspace
      </button>
      {#if confirming}
        <ConfirmPopover
          message="Start an empty workspace? The unreadable copy stays kept, but it won't be shown again after this."
          confirmLabel="Start empty"
          placement="below"
          onconfirm={handleConfirm}
          oncancel={handleCancel}
        >
          {#if raw !== null}
            <button
              type="button"
              class="mb-3 px-3 py-1.5 text-sm text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="confirm-download-unreadable-button"
              onclick={handleDownload}
            >
              Download the unreadable data
            </button>
          {/if}
        </ConfirmPopover>
      {/if}
    </div>
  </div>

  {#if importError}
    <p class="mt-4 text-red-700" role="alert" data-testid="import-error">
      {importError}
    </p>
  {/if}
</main>
