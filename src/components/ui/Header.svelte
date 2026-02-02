<script>
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'
  import { vsmIOStore } from '../../stores/vsmIOStore.svelte.js'
  import { exportAsJson, exportAsPng, exportAsPdf } from '../../utils/export/index.js'

  let isEditingName = $state(false)
  let tempName = $state(vsmDataStore.name)
  let fileInputRef = $state(null)

  function handleNameClick() {
    tempName = vsmDataStore.name
    isEditingName = true
  }

  function handleNameSubmit() {
    if (tempName.trim()) {
      vsmDataStore.updateMapName(tempName.trim())
    }
    isEditingName = false
  }

  function handleNameKeyDown(e) {
    if (e.key === 'Enter') {
      handleNameSubmit()
    } else if (e.key === 'Escape') {
      isEditingName = false
    }
  }

  function handleExportJson() {
    const json = vsmIOStore.exportToJson()
    exportAsJson(json, `${vsmDataStore.name || 'vsm'}.json`)
  }

  async function handleExportPng() {
    const canvas = document.querySelector('.svelte-flow')
    if (!canvas) return

    try {
      await exportAsPng(canvas, `${vsmDataStore.name || 'vsm'}.png`)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to export PNG:', err)
      }
    }
  }

  async function handleExportPdf() {
    const canvas = document.querySelector('.svelte-flow')
    if (!canvas) return

    try {
      await exportAsPdf(canvas, `${vsmDataStore.name || 'vsm'}.pdf`)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to export PDF:', err)
      }
    }
  }

  function handleImport() {
    fileInputRef?.click()
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = vsmIOStore.importFromJson(event.target.result)
      if (!result) {
        alert('Failed to import file. Please check the format.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleNewMap() {
    if (confirm('Create a new map? This will clear the current map.')) {
      vsmDataStore.clearMap()
    }
  }
</script>

<header class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
  <div class="flex items-center gap-4">
    <div class="flex items-center gap-2">
      <span class="text-xl">🗺️</span>
      <span class="font-semibold text-gray-700">VSM Workshop</span>
    </div>
    <div class="h-6 w-px bg-gray-300"></div>
    {#if isEditingName}
      <input
        type="text"
        bind:value={tempName}
        onblur={handleNameSubmit}
        onkeydown={handleNameKeyDown}
        class="px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        data-testid="map-name-input"
      />
    {:else}
      <button
        onclick={handleNameClick}
        class="text-lg font-medium text-gray-800 hover:text-blue-600 transition-colors"
        data-testid="map-name"
      >
        {vsmDataStore.name}
      </button>
    {/if}
  </div>

  <div class="flex items-center gap-2">
    <button
      onclick={handleNewMap}
      class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
      data-testid="new-map-button"
    >
      New Map
    </button>
    <button
      onclick={handleImport}
      class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
      data-testid="import-button"
    >
      Import
    </button>
    <div class="relative group">
      <button
        class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        data-testid="export-button"
      >
        Export ▾
      </button>
      <div class="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <button
          onclick={handleExportJson}
          class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
          data-testid="export-json"
        >
          Export as JSON
        </button>
        <button
          onclick={handleExportPng}
          class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
          data-testid="export-png"
        >
          Export as PNG
        </button>
        <button
          onclick={handleExportPdf}
          class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
          data-testid="export-pdf"
        >
          Export as PDF
        </button>
      </div>
    </div>
    <input
      bind:this={fileInputRef}
      type="file"
      accept=".json"
      onchange={handleFileChange}
      class="hidden"
    />
  </div>
</header>
