<script>
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'
  import { withUndo } from '../../utils/undoHelper.js'
  import { validateConnection } from '../../utils/validation/connectionValidator.js'

  let { connectionId, onClose } = $props()

  // Get connection from store
  let connection = $derived(vsmDataStore.getConnectionById(connectionId))
  let sourceStep = $derived(connection ? vsmDataStore.getStepById(connection.source) : null)
  let targetStep = $derived(connection ? vsmDataStore.getStepById(connection.target) : null)

  // Form state
  let formData = $state({
    type: 'forward',
    reworkRate: 0,
  })

  // Validation errors
  let errors = $state({})

  // Sync form data when connection changes
  $effect(() => {
    if (connection) {
      formData = {
        type: connection.type || 'forward',
        reworkRate: connection.reworkRate || 0,
      }
    }
  })

  function handleChange(field, value) {
    formData = { ...formData, [field]: value }
    // Clear error for this field
    if (errors[field]) {
      errors = { ...errors, [field]: undefined }
    }
  }

  function validate() {
    const validationResult = validateConnection(formData)
    errors = validationResult.errors
    return validationResult.valid
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    withUndo(() => vsmDataStore.updateConnection(connectionId, {
      type: formData.type,
      reworkRate: formData.type === 'rework' ? Number(formData.reworkRate) : 0,
    }))
    onClose()
  }

  function handleDelete() {
    if (confirm('Delete this connection?')) {
      withUndo(() => vsmDataStore.deleteConnection(connectionId))
      onClose()
    }
  }
</script>

{#if connection}
  <div
    class="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto"
    data-testid="connection-editor"
  >
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">Edit Connection</h2>
      <button
        onclick={onClose}
        class="text-gray-400 hover:text-gray-600"
        data-testid="close-connection-editor"
      >
        ✕
      </button>
    </div>

    <div class="mb-4 p-3 bg-gray-50 rounded-md">
      <div class="text-sm text-gray-600">
        <span class="font-medium">{sourceStep?.name || 'Unknown'}</span>
        <span class="mx-2">→</span>
        <span class="font-medium">{targetStep?.name || 'Unknown'}</span>
      </div>
    </div>

    <form onsubmit={handleSubmit} class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Connection Type
        </label>
        <select
          value={formData.type}
          onchange={(e) => handleChange('type', e.target.value)}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="connection-type-select"
        >
          <option value="forward">Forward (Normal Flow)</option>
          <option value="rework">Rework (Return Loop)</option>
        </select>
        <p class="mt-1 text-xs text-gray-500">
          {formData.type === 'forward'
            ? 'Normal workflow progression'
            : 'Items returning for corrections'}
        </p>
      </div>

      {#if formData.type === 'rework'}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Rework Rate (%)
          </label>
          <input
            type="number"
            value={formData.reworkRate}
            oninput={(e) => handleChange('reworkRate', e.target.value)}
            min="0"
            max="100"
            class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 {errors.reworkRate ? 'border-red-500' : 'border-gray-300'}"
            data-testid="rework-rate-input"
          />
          {#if errors.reworkRate}
            <p class="mt-1 text-xs text-red-500">{errors.reworkRate}</p>
          {/if}
          <p class="mt-1 text-xs text-gray-500">
            Percentage of items that need to return for rework
          </p>
        </div>
      {/if}

      <div class="pt-4 flex gap-2">
        <button
          type="submit"
          class="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          data-testid="save-connection-button"
        >
          Save
        </button>
        <button
          type="button"
          onclick={handleDelete}
          class="py-2 px-4 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
          data-testid="delete-connection-button"
        >
          Delete
        </button>
      </div>
    </form>
  </div>
{/if}
