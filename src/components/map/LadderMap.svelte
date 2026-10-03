<script>
  import { LADDER_MODE, sizeLadder } from '../../utils/ui/ladderLayout.js'
  import {
    HATCH_ANGLE,
    HATCH_STROKE_WIDTH,
    HATCH_TILE_SIZE,
    LABEL_TOP,
    LANE_PADDING,
    LINE_HEIGHT,
    MIN_EQUAL_BOX_WIDTH,
    MIN_SCALED_BOX_WIDTH,
    PAD_X,
    TRACK_HEIGHT,
    TRACK_Y,
  } from '../../utils/ui/ladderGeometry.js'
  import {
    equalBoxWidthFor,
    layoutLabels,
    labelOverhangFor,
    pixelsPerMinuteToFit,
  } from '../../utils/ui/ladderView.js'
  import LadderStep from './LadderStep.svelte'

  // LadderMap props: ladderModel (`store.ladderModel`, or one built with
  // `ladderModel(version, flags)`: the model of the version being drawn, which
  // does not depend on the width it is drawn at; the map works out neither
  // metrics nor flags). Optional: pixelsPerMinute (a scale to draw To scale at,
  // so maps can share one; absent, the map fits its scroller), ladderMode
  // (bindable; a LADDER_MODE, To scale unless given) and showLadderModeToggle
  // (false hides the mode choice). The ids the drawing needs are per map, so any
  // number of maps can share a page.
  let {
    ladderModel,
    pixelsPerMinute = undefined,
    ladderMode = $bindable(LADDER_MODE.SCALED),
    showLadderModeToggle = true,
  } = $props()

  const uid = $props.id()

  const MODES = [
    { value: LADDER_MODE.SCALED, label: 'To scale' },
    { value: LADDER_MODE.EQUAL, label: 'Equal width' },
  ]

  // Keeps a fitted ladder a pixel inside the scroller, so rounding never adds a scrollbar.
  const FIT_SLACK = 1

  // What the drawing means, for anyone who cannot see it. Every encoding is
  // also written as text beside its step.
  const DESC_ID = `ladder-${uid}-desc`
  const HATCH_ID = `ladder-${uid}-hatch`
  const MODE_GROUP = `ladder-${uid}-mode`
  const LADDER_DESCRIPTION =
    'Each step is a column on a track. Its wait time is drawn above the track and its process time below it. ' +
    'A solid outline is a plain step, a thick outline a handoff, and a dashed outline a step with a time not yet entered or one done outside the team. ' +
    'A hatched block is an outside step. ' +
    'Handoffs, outside steps, missing times and the largest wait and lowest percent complete and accurate are also written as text under each step.'

  let scrollerWidth = $state(0)
  let modeLabel = $derived(
    MODES.find(({ value }) => value === ladderMode).label
  )

  // A label can run past the last box, so the fit leaves room for the furthest
  // it can reach (see labelOverhangFor) and nothing is clipped or scrolls for it.
  let labelOverhang = $derived(
    labelOverhangFor(
      ladderModel.steps,
      ladderMode === LADDER_MODE.SCALED
        ? MIN_SCALED_BOX_WIDTH
        : MIN_EQUAL_BOX_WIDTH
    )
  )
  let availableWidth = $derived(
    Math.max(scrollerWidth - 2 * PAD_X - FIT_SLACK - labelOverhang, 0)
  )
  let ladderLayout = $derived(
    sizeLadder(
      ladderModel,
      ladderMode === LADDER_MODE.SCALED
        ? {
            mode: ladderMode,
            pixelsPerMinute:
              pixelsPerMinute ??
              pixelsPerMinuteToFit(ladderModel, availableWidth),
          }
        : {
            mode: ladderMode,
            boxWidth: equalBoxWidthFor(
              ladderModel.steps.length,
              availableWidth
            ),
          }
    )
  )

  let labelLayout = $derived(layoutLabels(ladderLayout.steps))
  let laneHeight = $derived(
    Math.max(0, ...labelLayout.labels.map(({ lines }) => lines.length)) *
      LINE_HEIGHT +
      LANE_PADDING
  )
  let laneCount = $derived(Math.max(...labelLayout.lanes, 0) + 1)
  let svgWidth = $derived(labelLayout.rightEdge + 2 * PAD_X)
  let svgHeight = $derived(LABEL_TOP + laneCount * laneHeight)
</script>

<div data-testid="ladder-pane">
  {#if showLadderModeToggle}
    <fieldset
      class="flex flex-wrap items-center gap-2 mb-2 border-0 p-0 m-0"
      data-testid="ladder-mode"
    >
      <legend class="sr-only">Ladder width</legend>
      <div
        class="inline-flex rounded-md border border-gray-300 overflow-hidden"
      >
        {#each MODES as option (option.value)}
          <label class="relative cursor-pointer">
            <input
              type="radio"
              name={MODE_GROUP}
              value={option.value}
              bind:group={ladderMode}
              class="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
              data-testid="ladder-mode-{option.value}"
            />
            <span
              class="block px-3 py-1 bg-white text-gray-800 hover:bg-gray-50 peer-checked:bg-blue-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-inset peer-focus-visible:ring-blue-500"
            >
              {option.label}
            </span>
          </label>
        {/each}
      </div>
    </fieldset>
  {/if}

  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="overflow-x-auto"
    role="region"
    aria-label="Time ladder"
    tabindex="0"
    bind:clientWidth={scrollerWidth}
    data-testid="ladder-scroll"
  >
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox="0 0 {svgWidth} {svgHeight}"
      role="group"
      aria-label="Time ladder, {modeLabel.toLowerCase()}"
      aria-describedby={DESC_ID}
      class="block max-w-none"
      data-testid="ladder-map"
    >
      <title>Time ladder, {modeLabel.toLowerCase()}</title>
      <desc id={DESC_ID} data-testid="ladder-desc">{LADDER_DESCRIPTION}</desc>
      <defs>
        <pattern
          id={HATCH_ID}
          patternUnits="userSpaceOnUse"
          width={HATCH_TILE_SIZE}
          height={HATCH_TILE_SIZE}
          patternTransform="rotate({HATCH_ANGLE})"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={HATCH_TILE_SIZE}
            stroke-width={HATCH_STROKE_WIDTH}
            class="stroke-hatch-outside"
          />
        </pattern>
      </defs>
      <g transform="translate({PAD_X} 0)">
        <rect
          x="0"
          y={TRACK_Y}
          width={ladderLayout.totalWidth}
          height={TRACK_HEIGHT}
          class="fill-map-track"
          data-testid="ladder-track"
        />
        {#each labelLayout.labels as { step, lines }, index (step.stepId)}
          {@const laneTop = LABEL_TOP + labelLayout.lanes[index] * laneHeight}
          <LadderStep {step} {lines} {laneTop} hatchId={HATCH_ID} />
        {/each}
      </g>
    </svg>
  </div>
</div>
