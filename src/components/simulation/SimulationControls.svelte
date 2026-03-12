<script>
  import { Play, Pause, RotateCcw, Plus } from 'lucide-svelte'
  import { simControlStore } from '../../stores/simulationControlStore.svelte.js'
  import { simDataStore } from '../../stores/simulationDataStore.svelte.js'
  import { getSimulationService } from '../../services/SimulationService.svelte.js'

  const SPEED_OPTIONS = [
    { value: 0.5, label: '0.5x' },
    { value: 1, label: '1x' },
    { value: 2, label: '2x' },
    { value: 4, label: '4x' },
  ]

  const AVAILABLE_WORK_ITEM_COUNTS = [5, 10, 20, 50, 100]

  const service = getSimulationService()

  // Reactive derived values
  let isRunning = $derived(simControlStore.isRunning)
  let isPaused = $derived(simControlStore.isPaused)
  let speed = $derived(simControlStore.speed)
  let workItemCount = $derived(simDataStore.workItemCount)
  let completedCount = $derived(simDataStore.completedCount)
  let results = $derived(simDataStore.results)

  let canStart = $derived(!isRunning && !isPaused)
  let canPause = $derived(isRunning && !isPaused)
  let canResume = $derived(isPaused)
  let canReset = $derived(isRunning || isPaused || results)

  function handleSpeedChange(newSpeed) {
    simControlStore.setSpeed(newSpeed)
  }

  function handleWorkItemsChange(e) {
    simDataStore.setWorkItemCount(parseInt(e.target.value, 10))
  }

  function handleStart() {
    service.startSimulation()
  }

  function handlePause() {
    service.pauseSimulation()
  }

  function handleResume() {
    service.resumeSimulation()
  }

  function handleReset() {
    service.resetSimulation()
  }

  function handleCreateScenario() {
    service.createScenario()
  }
</script>

<div class="bg-white border-b border-slate-200 px-4 py-2">
  <div class="flex items-center justify-between gap-4">
    <!-- Play/Pause/Reset Controls -->
    <div class="flex items-center gap-2">
      {#if canStart}
        <button
          onclick={handleStart}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          <Play class="w-4 h-4" />
          Run
        </button>
      {/if}

      {#if canPause}
        <button
          onclick={handlePause}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors text-sm font-medium"
        >
          <Pause class="w-4 h-4" />
          Pause
        </button>
      {/if}

      {#if canResume}
        <button
          onclick={handleResume}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          <Play class="w-4 h-4" />
          Resume
        </button>
      {/if}

      {#if canReset}
        <button
          onclick={handleReset}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors text-sm font-medium"
        >
          <RotateCcw class="w-4 h-4" />
          Reset
        </button>
      {/if}
    </div>

    <!-- Speed Control -->
    <div class="flex items-center gap-2">
      <span class="text-sm text-slate-600">Speed:</span>
      <div class="flex rounded-md overflow-hidden border border-slate-300">
        {#each SPEED_OPTIONS as option (option.value)}
          <button
            onclick={() => handleSpeedChange(option.value)}
            class="px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset {speed === option.value
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-700 hover:bg-slate-100'}"
          >
            {option.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Work Items -->
    <div class="flex items-center gap-2">
      <label for="workItems" class="text-sm text-slate-600">
        Work Items:
      </label>
      <select
        id="workItems"
        value={workItemCount}
        onchange={handleWorkItemsChange}
        disabled={isRunning || isPaused}
        class="px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {#each AVAILABLE_WORK_ITEM_COUNTS as count (count)}
          <option value={count}>
            {count}
          </option>
        {/each}
      </select>
    </div>

    <!-- Progress -->
    {#if isRunning || isPaused || results}
      <div class="flex items-center gap-2">
        <span class="text-sm text-slate-600">Completed:</span>
        <span class="text-sm font-semibold text-slate-900">
          {completedCount} / {workItemCount}
        </span>
        <div
          class="w-24 h-2 bg-slate-200 rounded-full overflow-hidden"
          role="progressbar"
          aria-label="Simulation progress"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={workItemCount}
        >
          <div
            class="h-full bg-emerald-500 transition-all duration-200"
            style="width: {(completedCount / workItemCount) * 100}%"
          ></div>
        </div>
      </div>
    {/if}

    <!-- Create Scenario -->
    <button
      onclick={handleCreateScenario}
      disabled={isRunning}
      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50"
    >
      <Plus class="w-4 h-4" />
      New Scenario
    </button>
  </div>
</div>
