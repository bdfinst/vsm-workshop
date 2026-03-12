<script>
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'
  import { vsmIOStore } from '../../stores/vsmIOStore.svelte.js'
  import { MAP_TEMPLATES } from '../../data/stepTemplates.js'

  let mapName = $state('')
  let fileInputRef = $state(null)

  function handleCreate(e) {
    e.preventDefault()
    const name = mapName.trim() || 'My Value Stream'
    vsmDataStore.createNewMap(name)
  }

  function handleStartWithExample() {
    vsmIOStore.loadExample()
  }

  function handleLoadTemplate(template) {
    vsmIOStore.loadTemplate(template)
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
    reader.readAsText(file)
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
  <div class="max-w-lg w-full">
    <div class="text-center mb-8">
      <span class="text-6xl mb-4 block" aria-hidden="true">🗺️</span>
      <h1 class="text-3xl font-bold text-gray-800 mb-2">VSM Workshop</h1>
      <p class="text-gray-600">
        Create value stream maps to visualize and improve your delivery
        process
      </p>
    </div>

    <div class="bg-white rounded-xl shadow-lg p-8">
      <form onsubmit={handleCreate}>
        <label class="block mb-4">
          <span class="text-sm font-medium text-gray-700">Map Name</span>
          <input
            type="text"
            bind:value={mapName}
            placeholder="e.g., Feature Delivery Process"
            class="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="new-map-name-input"
          />
        </label>
        <button
          type="submit"
          class="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          data-testid="create-map-button"
        >
          Create Blank Map
        </button>
      </form>

      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-300"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-white text-gray-500">or</span>
        </div>
      </div>

      <div class="space-y-2">
        <p class="text-sm font-medium text-gray-700 mb-2">
          Start with a Template
        </p>
        <button
          onclick={handleStartWithExample}
          class="w-full py-3 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-left flex items-center gap-3"
          data-testid="start-with-example-button"
        >
          <span class="text-xl" aria-hidden="true">📊</span>
          <div>
            <div>Software Delivery Example</div>
            <div class="text-xs text-green-200">
              Full example with sample metrics
            </div>
          </div>
        </button>
        {#each MAP_TEMPLATES as template (template.id)}
          <button
            onclick={() => handleLoadTemplate(template)}
            class="w-full py-3 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-left flex items-center gap-3"
            data-testid="template-{template.id}-button"
          >
            <span class="text-xl" aria-hidden="true">
              {template.id === 'software-delivery' ? '🚀' : '🎫'}
            </span>
            <div>
              <div>{template.name}</div>
              <div class="text-xs text-emerald-200">
                {template.description}
              </div>
            </div>
          </button>
        {/each}
      </div>

      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-300"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-white text-gray-500">or</span>
        </div>
      </div>

      <button
        onclick={handleImport}
        class="w-full py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        data-testid="import-map-button"
      >
        Import Existing Map
      </button>
      <input
        bind:this={fileInputRef}
        type="file"
        accept=".json"
        onchange={handleFileChange}
        class="hidden"
      />
    </div>

    <div class="mt-8 text-center text-sm text-gray-500">
      <p>
        Value stream mapping helps teams visualize their workflow, identify
        bottlenecks, and improve flow efficiency.
      </p>
    </div>
  </div>
</div>
