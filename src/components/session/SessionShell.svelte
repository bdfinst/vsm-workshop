<script>
  import { workspaceStore } from '../../stores/v2/workspaceStore.svelte.js'
  import { STAGE_NAMES } from '../../models/v2/constants.js'
  import PlaceholderStage from './stages/PlaceholderStage.svelte'

  let stream = $derived(workspaceStore.activeStore?.stream)
  let stage = $derived(stream?.session.activeStage ?? 1)
  let stageName = $derived(STAGE_NAMES[stage - 1])

  // Later slices replace the placeholder with the stage's own component.
  function handleNext() {
    workspaceStore.activeStore.goToStage(stage + 1)
  }
</script>

<div class="min-h-screen flex flex-col bg-gray-100" data-testid="session-shell">
  <header
    class="bg-white border-b border-gray-200 p-4"
    data-testid="session-header"
  ></header>
  <div class="flex-1 flex flex-col lg:flex-row gap-4 p-4">
    <nav
      class="lg:w-48"
      aria-label="Stages"
      data-testid="stage-rail"
    ></nav>
    <main class="flex-1 flex flex-col gap-4">
      <div data-testid="prompt-region"></div>
      <div class="bg-white rounded-lg shadow-md p-4" data-testid="work-region">
        <PlaceholderStage
          name={stageName}
          onnext={stage < STAGE_NAMES.length ? handleNext : null}
        />
      </div>
    </main>
    <aside class="lg:w-80" aria-label="Map" data-testid="map-pane"></aside>
  </div>
  <div data-testid="strip-region"></div>
</div>
