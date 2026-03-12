<script>
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'
  import { vsmUIStore } from '../../stores/vsmUIStore.svelte.js'
  import {
    getTemplatesByCategory,
    CATEGORY_LABELS,
  } from '../../data/stepTemplates.js'
  import { STEP_TYPE_CONFIG } from '../../data/stepTypes.js'
  import { formatDuration } from '../../utils/calculations/metrics.js'

  let expandedCategory = $state(null)

  const templatesByCategory = getTemplatesByCategory()

  function handleAddStep() {
    const step = vsmDataStore.addStep('New Step')
    vsmUIStore.selectStep(step.id)
    vsmUIStore.setEditing(true)
  }

  function handleAddFromTemplate(template) {
    const step = vsmDataStore.addStep(template.name, {
      type: template.type,
      description: template.description,
      processTime: template.processTime,
      leadTime: template.leadTime,
      percentCompleteAccurate: template.percentCompleteAccurate,
      queueSize: template.queueSize,
      batchSize: template.batchSize,
    })
    vsmUIStore.selectStep(step.id)
    vsmUIStore.setEditing(true)
  }

  function toggleCategory(category) {
    expandedCategory = expandedCategory === category ? null : category
  }
</script>

<aside class="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto" aria-label="Step templates and instructions">
  <button
    onclick={handleAddStep}
    class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
    data-testid="add-step-button"
  >
    <span class="text-xl">+</span>
    <span>Add Step</span>
  </button>

  <div class="mt-6">
    <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
      Step Templates
    </h2>
    <div class="space-y-1">
      {#each Object.entries(templatesByCategory) as [category, templates] (category)}
        <div class="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onclick={() => toggleCategory(category)}
            aria-expanded={expandedCategory === category}
            aria-controls="category-{category}"
            class="w-full px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between"
          >
            <span>{CATEGORY_LABELS[category]}</span>
            <span class="text-gray-400">
              {expandedCategory === category ? '−' : '+'}
            </span>
          </button>
          {#if expandedCategory === category}
            <div id="category-{category}" class="border-t border-gray-200 bg-gray-50">
              {#each templates as template (template.id)}
                {@const config = STEP_TYPE_CONFIG[template.type]}
                <button
                  onclick={() => handleAddFromTemplate(template)}
                  class="w-full px-3 py-2 text-left hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                  data-testid="template-{template.id}"
                >
                  <div class="flex items-center gap-2">
                    <span>{config?.icon || '⚙️'}</span>
                    <span class="text-sm font-medium text-gray-700">
                      {template.name}
                    </span>
                  </div>
                  <div class="text-xs text-gray-500 mt-0.5 ml-6">
                    PT: {formatDuration(template.processTime)} | LT: {formatDuration(template.leadTime)}
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <div class="mt-6">
    <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
      How to Use
    </h2>
    <div class="text-xs text-gray-600 space-y-3">
      <p>
        <strong>Add Step</strong> to create a new process step
      </p>
      <p>
        <strong>Click</strong> a step to select it
      </p>
      <p>
        <strong>Double-click</strong> a step to edit it
      </p>
      <p>
        <strong>Drag</strong> from handles to connect steps
      </p>
      <p>
        <strong>Delete</strong> key removes selected step
      </p>
    </div>
  </div>

  <div class="mt-8">
    <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
      Glossary
    </h2>
    <dl class="text-xs text-gray-600 space-y-2">
      <div>
        <dt class="font-semibold">PT (Process Time)</dt>
        <dd>Actual hands-on work time</dd>
      </div>
      <div>
        <dt class="font-semibold">LT (Lead Time)</dt>
        <dd>Total elapsed time including wait</dd>
      </div>
      <div>
        <dt class="font-semibold">%C&A</dt>
        <dd>Percent Complete & Accurate - quality passing to next step</dd>
      </div>
      <div>
        <dt class="font-semibold">Flow Efficiency</dt>
        <dd>PT ÷ LT - how much time is actual work vs waiting</dd>
      </div>
    </dl>
  </div>
</aside>
