<script>
  import { vsmIOStore } from '../../stores/vsmIOStore.svelte.js'

  let format = $state('csv')
  let rawData = $state('')
  let message = $state(null)

  const placeholder = `workItemId,stage,enteredAt,exitedAt
1,Dev,2026-01-01T09:00:00Z,2026-01-01T11:00:00Z
1,Test,2026-01-01T11:00:00Z,2026-01-01T11:20:00Z`

  function handleImport() {
    const ok = vsmIOStore.importEventLog(rawData, format)
    message = ok
      ? { kind: 'ok', text: 'Imported current state from the event log.' }
      : { kind: 'error', text: 'No events could be parsed — check the format.' }
  }

  // --- Optional live connection: Azure DevOps ---
  let ado = $state({ organization: '', project: '', pat: '', wiql: '' })
  let adoBusy = $state(false)
  let adoMessage = $state(null)

  const defaultWiql =
    "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'User Story' ORDER BY [System.ChangedDate] DESC"

  async function handleAdoConnect() {
    adoBusy = true
    adoMessage = null
    const ok = await vsmIOStore.importFromAzureDevOps({ ...ado, wiql: ado.wiql || defaultWiql })
    adoBusy = false
    adoMessage = ok
      ? { kind: 'ok', text: 'Imported current state from Azure DevOps.' }
      : { kind: 'error', text: 'Import failed — check the org/project/PAT, query, and network access.' }
  }
</script>

<details class="bg-white border-t border-gray-200 px-6 py-4" data-testid="import-event-log" open>
  <summary class="cursor-pointer text-sm font-semibold text-gray-800">
    Import Current State (event log)
  </summary>

  <p class="mt-2 text-xs text-gray-500">
    Paste an exported event log (one row per work-item state transition) to derive a measured
    value stream instead of guessing.
  </p>

  <div class="mt-2 flex items-center gap-4 text-xs">
    <label class="flex items-center gap-1">
      <input type="radio" name="import-format" value="csv" bind:group={format} data-testid="import-format-csv" />
      CSV
    </label>
    <label class="flex items-center gap-1">
      <input type="radio" name="import-format" value="json" bind:group={format} data-testid="import-format-json" />
      JSON
    </label>
  </div>

  <textarea
    bind:value={rawData}
    {placeholder}
    rows="5"
    class="mt-2 w-full rounded-md border border-gray-300 p-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
    data-testid="import-event-input"
  ></textarea>

  <div class="mt-2 flex items-center gap-3">
    <button
      type="button"
      onclick={handleImport}
      disabled={rawData.trim() === ''}
      class="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      data-testid="import-event-button"
    >
      Import
    </button>
    {#if message}
      <span class="text-xs {message.kind === 'ok' ? 'text-green-700' : 'text-red-700'}" data-testid="import-event-message">
        {message.text}
      </span>
    {/if}
  </div>

  <details class="mt-4 border-t border-gray-100 pt-3" data-testid="import-azure-devops">
    <summary class="cursor-pointer text-xs font-semibold text-gray-700">
      Or connect to Azure DevOps (optional)
    </summary>
    <p class="mt-1 text-[11px] text-gray-500">
      Pulls work-item state history via the REST API. Your PAT (Work Items: Read) is used only for
      this request and is never stored. Requires network access to dev.azure.com.
    </p>
    <div class="mt-2 grid grid-cols-2 gap-2">
      <input
        bind:value={ado.organization}
        placeholder="organization"
        class="rounded-md border border-gray-300 px-2 py-1 text-xs"
        data-testid="ado-organization"
      />
      <input
        bind:value={ado.project}
        placeholder="project"
        class="rounded-md border border-gray-300 px-2 py-1 text-xs"
        data-testid="ado-project"
      />
      <input
        type="password"
        bind:value={ado.pat}
        placeholder="personal access token"
        autocomplete="off"
        class="col-span-2 rounded-md border border-gray-300 px-2 py-1 text-xs"
        data-testid="ado-pat"
      />
      <textarea
        bind:value={ado.wiql}
        placeholder={defaultWiql}
        rows="2"
        class="col-span-2 rounded-md border border-gray-300 p-2 font-mono text-[11px]"
        data-testid="ado-wiql"
      ></textarea>
    </div>
    <div class="mt-2 flex items-center gap-3">
      <button
        type="button"
        onclick={handleAdoConnect}
        disabled={adoBusy || !ado.organization || !ado.project || !ado.pat}
        class="rounded-md bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
        data-testid="ado-connect-button"
      >
        {adoBusy ? 'Importing…' : 'Import from Azure DevOps'}
      </button>
      {#if adoMessage}
        <span class="text-xs {adoMessage.kind === 'ok' ? 'text-green-700' : 'text-red-700'}" data-testid="ado-message">
          {adoMessage.text}
        </span>
      {/if}
    </div>
  </details>
</details>
