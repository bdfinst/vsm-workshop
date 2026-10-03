<script>
  import {
    LADDER_MODE,
    MIN_SCALED_BOX_WIDTH,
    sizeLadder,
  } from '../../utils/ui/ladderLayout.js'
  import {
    LABEL_TOP,
    LANE_PADDING,
    LINE_HEIGHT,
    PAD_X,
    TRACK_HEIGHT,
    TRACK_Y,
  } from '../../utils/ui/ladderGeometry.js'
  import {
    MIN_EQUAL_BOX_WIDTH,
    equalBoxWidthFor,
    layoutLabels,
    labelOverhangFor,
    pixelsPerMinuteToFit,
  } from '../../utils/ui/ladderView.js'
  import LadderStep from './LadderStep.svelte'

  // LadderMap props: ladderModel (`store.ladderModel`, the pane-independent
  // model of the version being drawn). The map sizes it for its scroll region
  // and works out neither metrics nor flags.
  let { ladderModel } = $props()

  const MODES = [
    { value: LADDER_MODE.SCALED, label: 'To scale' },
    { value: LADDER_MODE.EQUAL, label: 'Equal width' },
  ]

  // Keeps a fitted ladder a pixel inside the pane, so rounding never adds a scrollbar.
  const FIT_SLACK = 1

  // What the drawing means, for anyone who cannot see it. Every encoding is
  // also written as text beside its step.
  const DESC_ID = 'ladder-desc'
  const HATCH_ID = 'ladder-hatch'
  const LADDER_DESCRIPTION =
    'Each step is a column on a track. Its wait time is drawn above the track and its process time below it. ' +
    'A solid outline is a plain step, a thick outline a handoff, and a dashed outline a step with a time not yet entered or one done outside the team. ' +
    'A hatched block is an outside step. ' +
    'Handoffs, outside steps, missing times and the largest wait and lowest percent complete and accurate are also written as text under each step.'

  let mode = $state(LADDER_MODE.SCALED)
  let scrollerWidth = $state(0)
  let modeLabel = $derived(MODES.find(({ value }) => value === mode).label)

  // A label can run past the last box, so the fit leaves room for the furthest
  // it can reach (see labelOverhangFor) and nothing is clipped or scrolls for it.
  let labelOverhang = $derived(
    labelOverhangFor(
      ladderModel.steps,
      mode === LADDER_MODE.SCALED ? MIN_SCALED_BOX_WIDTH : MIN_EQUAL_BOX_WIDTH
    )
  )
  let available = $derived(
    Math.max(scrollerWidth - 2 * PAD_X - FIT_SLACK - labelOverhang, 0)
  )
  let ladderLayout = $derived(
    sizeLadder(
      ladderModel,
      mode === LADDER_MODE.SCALED
        ? {
            mode,
            pixelsPerMinute: pixelsPerMinuteToFit(ladderModel, available),
          }
        : {
            mode,
            boxWidth: equalBoxWidthFor(ladderModel.steps.length, available),
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
  <fieldset
    class="flex flex-wrap items-center gap-2 mb-2 border-0 p-0 m-0"
    data-testid="ladder-mode"
  >
    <legend class="sr-only">Ladder width</legend>
    <div class="inline-flex rounded-md border border-gray-300 overflow-hidden">
      {#each MODES as option (option.value)}
        <label class="relative cursor-pointer">
          <input
            type="radio"
            name="ladder-mode"
            value={option.value}
            bind:group={mode}
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
          width="8"
          height="8"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="8"
            stroke-width="2"
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
