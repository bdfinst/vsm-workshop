<script>
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'
  import { STEP_TYPES } from '../../data/stepTypes.js'
  import { STEP_TYPE_CONFIG } from '../../data/stepTypeConfig.js'
  import { validateStep } from '../../utils/validation/stepValidator.js'

  let { stepId, onClose } = $props()

  // Get step from store
  let step = $derived(vsmDataStore.getStepById(stepId))

  // Form state
  let formData = $state({
    name: '',
    type: STEP_TYPES.CUSTOM,
    description: '',
    processTime: 0,
    leadTime: 0,
    percentCompleteAccurate: 100,
    queueSize: 0,
    batchSize: 1,
    peopleCount: 1,
  })

  // Validation errors
  let errors = $state({})

  // Sync form data when step changes
  $effect(() => {
    if (step) {
      formData = {
        name: step.name,
        type: step.type,
        description: step.description || '',
        processTime: step.processTime,
        leadTime: step.leadTime,
        percentCompleteAccurate: step.percentCompleteAccurate,
        queueSize: step.queueSize,
        batchSize: step.batchSize,
        peopleCount: step.peopleCount || 1,
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
    const validationResult = validateStep(formData)
    errors = validationResult.errors
    return validationResult.valid
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    vsmDataStore.updateStep(stepId, {
      ...formData,
      processTime: Number(formData.processTime),
      leadTime: Number(formData.leadTime),
      percentCompleteAccurate: Number(formData.percentCompleteAccurate),
      queueSize: Number(formData.queueSize),
      batchSize: Number(formData.batchSize),
      peopleCount: Number(formData.peopleCount),
    })
    onClose()
  }

  function handleDelete() {
    if (confirm('Delete this step?')) {
      vsmDataStore.deleteStep(stepId)
      onClose()
    }
  }
</script>

{#if step}
  <div
    class="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto"
    data-testid="step-editor"
  >
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">Edit Step</h2>
      <button
        onclick={onClose}
        class="text-gray-400 hover:text-gray-600"
        data-testid="close-editor"
      >
        ✕
      </button>
    </div>

    <form onsubmit={handleSubmit} class="space-y-4">
      <div>
        <label for="step-name-input" class="block text-sm font-medium text-gray-700 mb-1">
          Step Name
        </label>
        <input
          id="step-name-input"
          type="text"
          value={formData.name}
          oninput={(e) => handleChange('name', e.target.value)}
          class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 {errors.name ? 'border-red-500' : 'border-gray-300'}"
          data-testid="step-name-input"
        />
        {#if errors.name}
          <p class="mt-1 text-xs text-red-500">{errors.name}</p>
        {/if}
      </div>

      <div>
        <label for="step-type-select" class="block text-sm font-medium text-gray-700 mb-1">
          Step Type
        </label>
        <select
          id="step-type-select"
          value={formData.type}
          onchange={(e) => handleChange('type', e.target.value)}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="step-type-select"
        >
          {#each Object.entries(STEP_TYPE_CONFIG) as [type, cfg] (type)}
            <option value={type}>
              {cfg.icon} {cfg.label}
            </option>
          {/each}
        </select>
      </div>

      <div>
        <label for="step-description-input" class="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="step-description-input"
          value={formData.description}
          oninput={(e) => handleChange('description', e.target.value)}
          rows="2"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="step-description-input"
        ></textarea>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="process-time-input" class="block text-sm font-medium text-gray-700 mb-1">
            Process Time (min)
          </label>
          <input
            id="process-time-input"
            type="number"
            value={formData.processTime}
            oninput={(e) => handleChange('processTime', e.target.value)}
            min="0"
            class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 {errors.processTime ? 'border-red-500' : 'border-gray-300'}"
            data-testid="process-time-input"
          />
          {#if errors.processTime}
            <p class="mt-1 text-xs text-red-500">{errors.processTime}</p>
          {/if}
        </div>

        <div>
          <label for="lead-time-input" class="block text-sm font-medium text-gray-700 mb-1">
            Lead Time (min)
          </label>
          <input
            id="lead-time-input"
            type="number"
            value={formData.leadTime}
            oninput={(e) => handleChange('leadTime', e.target.value)}
            min="0"
            class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 {errors.leadTime ? 'border-red-500' : 'border-gray-300'}"
            data-testid="lead-time-input"
          />
          {#if errors.leadTime}
            <p class="mt-1 text-xs text-red-500">{errors.leadTime}</p>
          {/if}
        </div>
      </div>

      <div>
        <label for="percent-ca-input" class="block text-sm font-medium text-gray-700 mb-1">
          % Complete & Accurate
        </label>
        <input
          id="percent-ca-input"
          type="number"
          value={formData.percentCompleteAccurate}
          oninput={(e) => handleChange('percentCompleteAccurate', e.target.value)}
          min="0"
          max="100"
          class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 {errors.percentCompleteAccurate ? 'border-red-500' : 'border-gray-300'}"
          data-testid="percent-ca-input"
        />
        {#if errors.percentCompleteAccurate}
          <p class="mt-1 text-xs text-red-500">{errors.percentCompleteAccurate}</p>
        {/if}
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="queue-size-input" class="block text-sm font-medium text-gray-700 mb-1">
            Queue Size
          </label>
          <input
            id="queue-size-input"
            type="number"
            value={formData.queueSize}
            oninput={(e) => handleChange('queueSize', e.target.value)}
            min="0"
            class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 {errors.queueSize ? 'border-red-500' : 'border-gray-300'}"
            data-testid="queue-size-input"
          />
        </div>

        <div>
          <label for="batch-size-input" class="block text-sm font-medium text-gray-700 mb-1">
            Batch Size
          </label>
          <input
            id="batch-size-input"
            type="number"
            value={formData.batchSize}
            oninput={(e) => handleChange('batchSize', e.target.value)}
            min="1"
            class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 {errors.batchSize ? 'border-red-500' : 'border-gray-300'}"
            data-testid="batch-size-input"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          People Count
        </label>
        <input
          type="number"
          value={formData.peopleCount}
          oninput={(e) => handleChange('peopleCount', e.target.value)}
          min="1"
          class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 {errors.peopleCount ? 'border-red-500' : 'border-gray-300'}"
          data-testid="people-count-input"
        />
        {#if errors.peopleCount}
          <p class="mt-1 text-xs text-red-500">{errors.peopleCount}</p>
        {/if}
      </div>

      <div class="pt-4 flex gap-2">
        <button
          type="submit"
          class="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          data-testid="save-step-button"
        >
          Save
        </button>
        <button
          type="button"
          onclick={handleDelete}
          class="py-2 px-4 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
          data-testid="delete-step-button"
        >
          Delete
        </button>
      </div>
    </form>
  </div>
{/if}
