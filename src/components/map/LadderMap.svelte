<script>
  import {
    LADDER_MODE,
    MIN_SCALED_BOX_WIDTH,
    OUTLINE,
    sizeLadder,
  } from '../../utils/ui/ladderLayout.js'
  import {
    LABEL_FONT_SIZE,
    LABEL_INSET,
    MIN_EQUAL_WIDTH,
    TONE,
    equalWidthFor,
    labelLayout,
    labelOverhangFor,
    pixelsPerMinuteToFit,
  } from '../../utils/ui/ladderView.js'

  // LadderMap props: ladder (`store.ladder`, the pane-independent model of the
  // version being drawn). The ladder sizes it for the pane and works out
  // neither metrics nor flags.
  let { ladder } = $props()

  const MODES = [
    { value: LADDER_MODE.SCALED, label: 'To scale' },
    { value: LADDER_MODE.EQUAL, label: 'Equal width' },
  ]

  // Pixels. Wait blocks sit above the track and process blocks below it; the
  // outline of a step surrounds both; labels hang below in lanes.
  const PAD_X = 12
  const BLOCK_HEIGHT = 48
  const BLOCK_GAP = 4
  const WAIT_TOP = 8
  const TRACK_HEIGHT = 2
  const TRACK_Y = WAIT_TOP + BLOCK_HEIGHT + BLOCK_GAP
  const PROCESS_TOP = TRACK_Y + TRACK_HEIGHT + BLOCK_GAP
  const COLUMN_BOTTOM = PROCESS_TOP + BLOCK_HEIGHT
  const OUTLINE_PADDING = 4
  const OUTLINE_TOP = WAIT_TOP - OUTLINE_PADDING
  const OUTLINE_HEIGHT = COLUMN_BOTTOM + OUTLINE_PADDING - OUTLINE_TOP
  const LABEL_TOP = COLUMN_BOTTOM + 16
  const LABEL_BASELINE = LABEL_FONT_SIZE
  const LINE_HEIGHT = 15
  const LANE_PADDING = 8
  const HANDOFF_STROKE_WIDTH = 3
  const DASHED_STROKE_WIDTH = 2
  const DASH_PATTERN = '6 4'
  // Keeps a fitted ladder a pixel inside the pane, so rounding never adds a scrollbar.
  const FIT_SLACK = 1

  const TONE_CLASS = {
    [TONE.HANDOFF]: 'fill-handoff-text',
    [TONE.WARN]: 'fill-warn-text',
    [TONE.CRIT]: 'fill-crit-text',
    [TONE.MUTED]: 'fill-muted-text',
  }

  // What the drawing means, for anyone who cannot see it. Every encoding is
  // also written as text beside its step.
  const DESC_ID = 'ladder-desc'
  const LADDER_DESCRIPTION =
    'Each step is a column on a track. Its wait time is drawn above the track and its process time below it. ' +
    'A solid outline is a plain step, a thick outline a handoff, and a dashed outline a step with a time not yet entered or one done outside the team. ' +
    'A hatched block is an outside step. ' +
    'Handoffs, outside steps, missing times and the largest wait and lowest percent complete and accurate are also written as text under each step.'

  let mode = $state(LADDER_MODE.SCALED)
  let paneWidth = $state(0)
  let modeLabel = $derived(MODES.find(({ value }) => value === mode).label)

  // A label can run past the last box, so the fit leaves room for the furthest
  // it can reach (see labelOverhangFor) and nothing is clipped or scrolls for it.
  let labelOverhang = $derived(
    labelOverhangFor(
      ladder.steps,
      mode === LADDER_MODE.SCALED ? MIN_SCALED_BOX_WIDTH : MIN_EQUAL_WIDTH
    )
  )
  let available = $derived(
    Math.max(paneWidth - 2 * PAD_X - FIT_SLACK - labelOverhang, 0)
  )
  let layout = $derived(
    sizeLadder(
      ladder,
      mode === LADDER_MODE.SCALED
        ? { mode, pixelsPerMinute: pixelsPerMinuteToFit(ladder, available) }
        : { mode, width: equalWidthFor(ladder.steps.length, available) }
    )
  )

  let labelled = $derived(labelLayout(layout.steps))
  let laneHeight = $derived(
    Math.max(0, ...labelled.labels.map(({ lines }) => lines.length)) *
      LINE_HEIGHT +
      LANE_PADDING
  )
  let laneCount = $derived(Math.max(...labelled.lanes, 0) + 1)
  let svgWidth = $derived(labelled.rightEdge + 2 * PAD_X)
  let svgHeight = $derived(LABEL_TOP + laneCount * laneHeight)

  const outlineAttrs = {
    [OUTLINE.SOLID]: { stroke: 'none', 'stroke-width': 0 },
    [OUTLINE.HANDOFF]: {
      class: 'stroke-map-handoff-outline',
      'stroke-width': HANDOFF_STROKE_WIDTH,
    },
    [OUTLINE.DASHED]: {
      class: 'stroke-map-dashed-outline',
      'stroke-width': DASHED_STROKE_WIDTH,
      'stroke-dasharray': DASH_PATTERN,
    },
  }
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
    bind:clientWidth={paneWidth}
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
          id="ladder-hatch"
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
          width={layout.totalWidth}
          height={TRACK_HEIGHT}
          class="fill-map-track"
          data-testid="ladder-track"
        />
        {#each labelled.labels as { step, lines }, index (step.stepId)}
          {@const laneTop = LABEL_TOP + labelled.lanes[index] * laneHeight}
          <g
            role="group"
            aria-label={step.name}
            data-testid="ladder-step"
            data-outline={step.outline}
          >
            {#if step.wait && step.wait.width > 0}
              <rect
                x={step.wait.x}
                y={WAIT_TOP}
                width={step.wait.width}
                height={BLOCK_HEIGHT}
                stroke-width="1.5"
                class="fill-map-wait-fill stroke-map-wait-outline"
                data-testid="ladder-wait"
              />
            {/if}
            {#if step.process && step.process.width > 0}
              <rect
                x={step.process.x}
                y={PROCESS_TOP}
                width={step.process.width}
                height={BLOCK_HEIGHT}
                stroke-width="1.5"
                class="fill-map-process-fill stroke-map-process-outline"
                data-testid="ladder-process"
              />
            {/if}
            {#if step.outsideText}
              <rect
                x={step.x}
                y={WAIT_TOP}
                width={step.width}
                height={COLUMN_BOTTOM - WAIT_TOP}
                fill="url(#ladder-hatch)"
                data-testid="ladder-hatched"
              />
            {/if}
            <rect
              x={step.x}
              y={OUTLINE_TOP}
              width={step.width}
              height={OUTLINE_HEIGHT}
              fill="none"
              {...outlineAttrs[step.outline]}
              data-testid="ladder-box"
            />
            <line
              x1={step.x + 2}
              y1={OUTLINE_TOP + OUTLINE_HEIGHT}
              x2={step.x + 2}
              y2={laneTop}
              stroke-width="1"
              class="stroke-map-track"
            />
            <text
              x={step.x + LABEL_INSET}
              y={laneTop + LABEL_BASELINE}
              font-size={LABEL_FONT_SIZE}
            >
              {#each lines as line, lineIndex (lineIndex)}
                <tspan
                  x={step.x + LABEL_INSET}
                  dy={lineIndex === 0 ? 0 : LINE_HEIGHT}
                  class={line.tone
                    ? TONE_CLASS[line.tone]
                    : 'fill-map-text font-semibold'}
                >
                  {line.text}
                </tspan>
              {/each}
            </text>
          </g>
        {/each}
      </g>
    </svg>
  </div>
</div>
