<script>
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'
  import { vsmIOStore } from '../../stores/vsmIOStore.svelte.js'
  import { undoStore } from '../../stores/undoStore.svelte.js'
  import { performUndo, performRedo } from '../../utils/undoHelper.js'
  import { exportAsJson, exportAsPng, exportAsPdf } from '../../utils/export/index.js'

  let isEditingName = $state(false)
  let tempName = $state(vsmDataStore.name)
  let fileInputRef = $state(null)
  let isExportOpen = $state(false)
  let exportMenuRef = $state(null)

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

    if (file.size > 10000000) {
      alert('File is too large. Please select a file under 10 MB.')
      e.target.value = ''
      return
    }

    const isJson =
      file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')
    if (!isJson) {
      alert('Invalid file type. Please select a JSON file.')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = vsmIOStore.importFromJson(event.target.result)
      if (!result) {
        alert('Failed to import file. Please check the format.')
      }
    }
    reader.onerror = () => {
      alert('Failed to read file.')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleNewMap() {
    if (confirm('Create a new map? This will clear the current map.')) {
      vsmDataStore.clearMap()
    }
  }

  function toggleExportMenu() {
    isExportOpen = !isExportOpen
  }

  function closeExportMenu() {
    isExportOpen = false
  }

  function handleExportMenuKeyDown(e) {
    if (e.key === 'Escape') {
      isExportOpen = false
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const items = exportMenuRef?.querySelectorAll('[role="menuitem"]')
      if (items?.length) items[0].focus()
    }
  }

  function handleMenuItemKeyDown(e, items, index) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(index + 1) % items.length].focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(index - 1 + items.length) % items.length].focus()
    } else if (e.key === 'Escape') {
      isExportOpen = false
    }
  }

  function handleMenuContainerKeyDown(e) {
    const items = exportMenuRef?.querySelectorAll('[role="menuitem"]')
    if (!items?.length) return
    const index = Array.from(items).indexOf(document.activeElement)
    if (index !== -1) handleMenuItemKeyDown(e, items, index)
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
        aria-label="Edit map name"
        class="text-lg font-medium text-gray-800 hover:text-blue-600 transition-colors"
        data-testid="map-name"
      >
        {vsmDataStore.name}
      </button>
    {/if}
  </div>

  <div class="flex items-center gap-2">
    <button
      onclick={performUndo}
      disabled={!undoStore.canUndo}
      class="px-2 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Undo"
      title="Undo (Ctrl+Z)"
      data-testid="undo-button"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
      </svg>
    </button>
    <button
      onclick={performRedo}
      disabled={!undoStore.canRedo}
      class="px-2 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Redo"
      title="Redo (Ctrl+Shift+Z)"
      data-testid="redo-button"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4" />
      </svg>
    </button>
    <div class="h-6 w-px bg-gray-300"></div>
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
    <div class="relative">
      <button
        onclick={toggleExportMenu}
        onkeydown={handleExportMenuKeyDown}
        aria-haspopup="true"
        aria-expanded={isExportOpen}
        aria-label="Export options"
        class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        data-testid="export-button"
      >
        Export
        <svg class="inline-block w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
      {#if isExportOpen}
        <div
          bind:this={exportMenuRef}
          role="menu"
          onkeydown={handleMenuContainerKeyDown}
          class="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded shadow-lg z-50"
        >
          <button
            onclick={() => { handleExportJson(); closeExportMenu() }}
            role="menuitem"
            class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
            data-testid="export-json"
          >
            Export as JSON
          </button>
          <button
            onclick={() => { handleExportPng(); closeExportMenu() }}
            role="menuitem"
            class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
            data-testid="export-png"
          >
            Export as PNG
          </button>
          <button
            onclick={() => { handleExportPdf(); closeExportMenu() }}
            role="menuitem"
            class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
            data-testid="export-pdf"
          >
            Export as PDF
          </button>
        </div>
      {/if}
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
