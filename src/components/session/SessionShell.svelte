<script>
  import { workspaceStore } from '../../stores/v2/workspaceStore.svelte.js'
  import { STAGE_NAMES, STAGE_NUMBER } from '../../models/v2/constants.js'
  import { isTextEntry, shortcutFor } from '../../utils/ui/keymap.js'
  import PlaceholderStage from './stages/PlaceholderStage.svelte'
  import { stageStatus } from '../../utils/session/stages.js'
  import {
    focusOpeningTarget,
    focusStageHeading,
  } from '../../utils/session/focus.js'
  import ScopeStage from './stages/ScopeStage.svelte'
  import StepsStage from './stages/StepsStage.svelte'
  import TimeStage from './stages/TimeStage.svelte'
  import SessionHeader from './SessionHeader.svelte'
  import StageRail from './StageRail.svelte'
  import LadderMap from '../map/LadderMap.svelte'
  import ViewSwitch from '../map/ViewSwitch.svelte'
  import SummaryStrip from '../map/SummaryStrip.svelte'

  // Each stage's own component, by stage number; the rest are still placeholders.
  // Every stage is given the same props and uses the ones it needs: store,
  // name, onnext and onannounce(text) to say something to screen readers.
  const STAGE_COMPONENTS = {
    [STAGE_NUMBER.SCOPE]: ScopeStage,
    [STAGE_NUMBER.STEPS]: StepsStage,
    [STAGE_NUMBER.TIME]: TimeStage,
  }

  let store = $derived(workspaceStore.activeStore)
  let stream = $derived(store?.stream)
  let streamId = $derived(stream?.id)
  let stage = $derived(stream?.session.activeStage ?? STAGE_NUMBER.SCOPE)
  let stageName = $derived(STAGE_NAMES[stage - 1])
  let statuses = $derived(stream ? stageStatus(stream) : [])
  let showMap = $derived(Boolean(store) && stage >= STAGE_NUMBER.STEPS)
  let StageComponent = $derived(
    (store && STAGE_COMPONENTS[stage]) || PlaceholderStage
  )

  // On a stage change, and on opening a stream, focus moves to the heading.
  // It depends on the id, not the stream: an edit makes a new stream object
  // and must not pull focus off the field being edited. The first time, an
  // upgrade notice above the shell is announced before the stage.
  let workRegion = $state()
  let opened = false
  $effect(() => {
    void [streamId, stage]
    if (opened) focusStageHeading(workRegion)
    else focusOpeningTarget()
    opened = true
  })

  // The id makes a repeated message a new node, so screen readers say it again.
  let announcement = $state({ id: 0, text: '' })

  function announce(text) {
    announcement = { id: announcement.id + 1, text }
  }

  function travel(direction) {
    const result = store[direction]()
    if (result.ok) announce(result.announcement)
  }

  const shortcutActions = {
    undo: () => travel('undo'),
    redo: () => travel('redo'),
  }

  function handleKeydown(event) {
    const action = shortcutFor(event, {
      inTextField: isTextEntry(event.target),
    })
    if (!action) return
    event.preventDefault()
    shortcutActions[action]()
  }

  function handleNext() {
    store.goToStage(stage + 1)
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-screen flex flex-col bg-gray-100" data-testid="session-shell">
  <header
    class="bg-white border-b border-gray-200 p-4"
    data-testid="session-header"
  >
    {#if store}
      <SessionHeader
        {store}
        onundo={shortcutActions.undo}
        onredo={shortcutActions.redo}
      />
    {/if}
  </header>
  <div class="flex-1 flex flex-col lg:flex-row gap-4 p-4">
    <StageRail
      {statuses}
      current={stage}
      onselect={(number) => store.goToStage(number)}
    />
    <main class="flex-1 flex flex-col gap-4">
      <div data-testid="prompt-region"></div>
      <div
        class="bg-white rounded-lg shadow-md p-4"
        data-testid="work-region"
        bind:this={workRegion}
      >
        {#key streamId}
          <StageComponent
            {store}
            name={stageName}
            onnext={stage < STAGE_NAMES.length ? handleNext : null}
            onannounce={announce}
          />
        {/key}
      </div>
    </main>
  </div>
  {#if showMap}
    <section class="px-4 pb-4" aria-label="Map" data-testid="map-pane">
      <div class="bg-map-bg rounded-lg shadow-md p-4">
        <ViewSwitch panelId="map-view-panel" />
        <div
          id="map-view-panel"
          role="tabpanel"
          aria-labelledby="view-tab-map"
          class="mt-3"
        >
          <LadderMap
            version={store.activeVersion}
            flags={store.metrics.flags}
          />
        </div>
      </div>
    </section>
  {/if}
  <!-- Pinned to the bottom of the viewport, so it stays in view however far
       the page or the ladder is scrolled. -->
  <div class="sticky bottom-0 z-10" data-testid="strip-region">
    {#if showMap}
      <SummaryStrip
        metrics={store.metrics}
        workdayHours={stream.workdayHours}
      />
    {/if}
  </div>
  <div class="sr-only" role="status" data-testid="live-region">
    {#key announcement.id}
      <span>{announcement.text}</span>
    {/key}
  </div>
</div>
