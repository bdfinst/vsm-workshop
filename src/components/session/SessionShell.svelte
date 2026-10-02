<script>
  import { workspaceStore } from '../../stores/v2/workspaceStore.svelte.js'
  import { STAGE_NAMES } from '../../models/v2/constants.js'
  import { isTextEntry, shortcutFor } from '../../utils/ui/keymap.js'
  import PlaceholderStage from './stages/PlaceholderStage.svelte'
  import { stageStatus } from '../../utils/session/stages.js'
  import {
    focusOpeningTarget,
    focusStageHeading,
  } from '../../utils/session/focus.js'
  import ScopeStage from './stages/ScopeStage.svelte'
  import SessionHeader from './SessionHeader.svelte'
  import StageRail from './StageRail.svelte'

  let store = $derived(workspaceStore.activeStore)
  let stream = $derived(store?.stream)
  let streamId = $derived(stream?.id)
  let stage = $derived(stream?.session.activeStage ?? 1)
  let stageName = $derived(STAGE_NAMES[stage - 1])
  let statuses = $derived(stream ? stageStatus(stream) : [])

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

  // Later slices replace the remaining placeholders with the stages' own components.
  function handleNext() {
    workspaceStore.activeStore.goToStage(stage + 1)
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
        {#if store && stage === 1}
          {#key stream.id}
            <ScopeStage {store} onnext={handleNext} />
          {/key}
        {:else}
          <PlaceholderStage
            name={stageName}
            onnext={stage < STAGE_NAMES.length ? handleNext : null}
          />
        {/if}
      </div>
    </main>
    <aside class="lg:w-80" aria-label="Map" data-testid="map-pane"></aside>
  </div>
  <div data-testid="strip-region"></div>
  <div class="sr-only" role="status" data-testid="live-region">
    {#key announcement.id}
      <span>{announcement.text}</span>
    {/key}
  </div>
</div>
