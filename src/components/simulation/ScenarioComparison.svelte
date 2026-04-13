<script>
  import { ArrowUp, ArrowDown, Minus, Play, Trash2 } from 'lucide-svelte'
  import { scenarioStore } from '../../stores/scenarioStore.svelte.js'
  import { getSimulationService } from '../../services/SimulationService.svelte.js'
  import { formatDuration } from '../../utils/calculations/metrics.js'

  const service = getSimulationService()

  let scenarios = $derived(scenarioStore.scenarios)
  let activeScenarioId = $derived(scenarioStore.activeScenarioId)
  let comparisonResults = $derived(scenarioStore.comparisonResults)

  // Inline rename state
  let editingScenarioId = $state(null)
  let editingName = $state('')
  let scenarioNameRefs = $state({})

  function handleStartRename(scenario) {
    editingScenarioId = scenario.id
    editingName = scenario.name
  }

  function handleSaveRename() {
    const id = editingScenarioId
    if (id) {
      scenarioStore.renameScenario(id, editingName)
    }
    editingScenarioId = null
    editingName = ''
    // Restore focus to the scenario name element
    if (id && scenarioNameRefs[id]) {
      scenarioNameRefs[id].focus()
    }
  }

  function handleCancelRename() {
    const id = editingScenarioId
    editingScenarioId = null
    editingName = ''
    if (id && scenarioNameRefs[id]) {
      scenarioNameRefs[id].focus()
    }
  }

  function handleRenameKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelRename()
    }
  }

  function handleCompare(scenarioId) {
    scenarioStore.setActiveScenario(scenarioId)
    service.runComparison(scenarioId)
  }

  function handleRemoveScenario(scenarioId) {
    scenarioStore.removeScenario(scenarioId)
  }
</script>

{#snippet improvementBadge(value, higherIsBetter = true)}
  {#if value === 0 || !value}
    <span class="inline-flex items-center gap-1 text-slate-500">
      <Minus class="w-3 h-3" />
      0%
    </span>
  {:else}
    {@const isPositive = higherIsBetter ? value > 0 : value < 0}
    {@const displayValue = Math.abs(value).toFixed(1)}
    <span
      class="inline-flex items-center gap-1 font-medium {isPositive ? 'text-emerald-600' : 'text-red-600'}"
    >
      {#if isPositive}
        <ArrowUp class="w-3 h-3" />
      {:else}
        <ArrowDown class="w-3 h-3" />
      {/if}
      {displayValue}%
    </span>
  {/if}
{/snippet}

{#if scenarios.length > 0 || comparisonResults}
  <div class="bg-white border-t border-slate-200 p-4">
    <h3 class="text-sm font-semibold text-slate-900 mb-3">
      What-If Scenarios
    </h3>

    <!-- Scenario List -->
    {#if scenarios.length > 0}
      <div class="space-y-2 mb-4">
        {#each scenarios as scenario (scenario.id)}
          <div
            class="flex items-center justify-between p-3 rounded-lg border transition-colors {activeScenarioId === scenario.id
              ? 'bg-blue-50 border-blue-300'
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}"
          >
            <div>
              {#if editingScenarioId === scenario.id}
                <input
                  type="text"
                  bind:value={editingName}
                  onkeydown={handleRenameKeydown}
                  onblur={handleSaveRename}
                  class="text-sm font-medium text-slate-900 bg-white border border-blue-400 rounded px-1 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                  data-testid="scenario-rename-input"
                  autofocus
                />
              {:else}
                <div class="flex items-center gap-1">
                  <h4
                    bind:this={scenarioNameRefs[scenario.id]}
                    class="text-sm font-medium text-slate-900 cursor-pointer"
                    ondblclick={() => handleStartRename(scenario)}
                    data-testid="scenario-name-{scenario.id}"
                    title="Double-click to rename"
                  >
                    {scenario.name}
                  </h4>
                  <button
                    onclick={() => handleStartRename(scenario)}
                    class="p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Rename {scenario.name}"
                    data-testid="rename-scenario-{scenario.id}"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              {/if}
              <p class="text-xs text-slate-600">
                {scenario.steps.length} steps
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button
                onclick={() => handleCompare(scenario.id)}
                class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded hover:bg-emerald-200 transition-colors"
              >
                <Play class="w-3 h-3" />
                Compare
              </button>
              <button
                onclick={() => handleRemoveScenario(scenario.id)}
                class="p-1 text-slate-400 hover:text-red-600 transition-colors"
                aria-label="Remove {scenario.name}"
                data-testid="remove-scenario-{scenario.id}"
              >
                <Trash2 class="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Comparison Results -->
    {#if comparisonResults}
      <div class="border border-slate-200 rounded-lg overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-slate-100">
            <tr>
              <th scope="col" class="px-4 py-2 text-left font-medium text-slate-700">
                Metric
              </th>
              <th scope="col" class="px-4 py-2 text-right font-medium text-slate-700">
                Baseline
              </th>
              <th scope="col" class="px-4 py-2 text-right font-medium text-slate-700">
                Scenario
              </th>
              <th scope="col" class="px-4 py-2 text-right font-medium text-slate-700">
                Change
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr>
              <td class="px-4 py-2 text-slate-900">Avg Lead Time</td>
              <td class="px-4 py-2 text-right text-slate-700">
                {formatDuration(comparisonResults.baseline.avgLeadTime)}
              </td>
              <td class="px-4 py-2 text-right text-slate-700">
                {formatDuration(comparisonResults.scenario.avgLeadTime)}
              </td>
              <td class="px-4 py-2 text-right">
                {@render improvementBadge(comparisonResults.improvements.leadTime, true)}
              </td>
            </tr>
            <tr>
              <td class="px-4 py-2 text-slate-900">Throughput</td>
              <td class="px-4 py-2 text-right text-slate-700">
                {comparisonResults.baseline.throughput.toFixed(2)}/min
              </td>
              <td class="px-4 py-2 text-right text-slate-700">
                {comparisonResults.scenario.throughput.toFixed(2)}/min
              </td>
              <td class="px-4 py-2 text-right">
                {@render improvementBadge(comparisonResults.improvements.throughput, true)}
              </td>
            </tr>
            <tr>
              <td class="px-4 py-2 text-slate-900">Bottlenecks</td>
              <td class="px-4 py-2 text-right text-slate-700">
                {comparisonResults.baseline.bottlenecks.length}
              </td>
              <td class="px-4 py-2 text-right text-slate-700">
                {comparisonResults.scenario.bottlenecks.length}
              </td>
              <td class="px-4 py-2 text-right">
                {#if comparisonResults.scenario.bottlenecks.length < comparisonResults.baseline.bottlenecks.length}
                  <span class="text-emerald-600 font-medium">Improved</span>
                {:else if comparisonResults.scenario.bottlenecks.length > comparisonResults.baseline.bottlenecks.length}
                  <span class="text-red-600 font-medium">Worse</span>
                {:else}
                  <span class="text-slate-500">Same</span>
                {/if}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    {/if}
  </div>
{/if}
