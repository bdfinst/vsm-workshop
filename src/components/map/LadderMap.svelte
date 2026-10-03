<script>
  import { ladderLayout } from '../../utils/ui/ladderLayout.js'
  import {
    annotationsOf,
    equalWidthFor,
    labelLanes,
    scaleToFit,
  } from '../../utils/ui/ladderView.js'

  // LadderMap props: version (the map version to draw) and flags
  // (`metrics.flags` for it). The ladder reads both and works out neither.
  let { version, flags } = $props()

  const MODES = [
    { value: 'scaled', label: 'To scale' },
    { value: 'equal', label: 'Equal width' },
  ]

  // Pixels. Wait blocks sit above the track and process blocks below it; the
  // outline of a step surrounds both; labels hang below in lanes.
  const PAD_X = 12
  const BLOCK_HEIGHT = 48
  const WAIT_TOP = 8
  const TRACK_HEIGHT = 2
  const TRACK_Y = WAIT_TOP + BLOCK_HEIGHT + 4
  const PROCESS_TOP = TRACK_Y + TRACK_HEIGHT + 4
  const COLUMN_BOTTOM = PROCESS_TOP + BLOCK_HEIGHT
  const OUTLINE_TOP = WAIT_TOP - 4
  const OUTLINE_HEIGHT = COLUMN_BOTTOM + 4 - OUTLINE_TOP
  const LABEL_TOP = COLUMN_BOTTOM + 16
  const LINE_HEIGHT = 15
  const LANE_PADDING = 8
  const CHAR_WIDTH = 7
  const LABEL_GAP = 8
  // Keeps a fitted ladder a pixel inside the pane, so rounding never adds a scrollbar.
  const FIT_SLACK = 1

  const TONE_CLASS = {
    handoff: 'fill-handoff-text',
    warn: 'fill-warn-text',
    crit: 'fill-crit-text',
    muted: 'fill-muted-text',
  }

  let mode = $state('scaled')
  let paneWidth = $state(0)

  let available = $derived(Math.max(paneWidth - 2 * PAD_X - FIT_SLACK, 0))
  let layout = $derived(
    ladderLayout(
      version,
      mode === 'scaled'
        ? { mode, scale: scaleToFit(version, available), flags }
        : {
            mode,
            width: equalWidthFor(version.steps.length, available),
            flags,
          }
    )
  )

  let labelled = $derived(
    layout.steps.map((step) => {
      const lines = [{ text: step.name, tone: null }, ...annotationsOf(step)]
      const width =
        Math.max(...lines.map(({ text }) => text.length)) * CHAR_WIDTH
      return { step, lines, width }
    })
  )
  let lanes = $derived(
    labelLanes(
      labelled.map(({ step, width }) => ({ x: step.x, width })),
      LABEL_GAP
    )
  )
  let laneHeight = $derived(
    Math.max(0, ...labelled.map(({ lines }) => lines.length)) * LINE_HEIGHT +
      LANE_PADDING
  )
  let laneCount = $derived(Math.max(...lanes, 0) + 1)
  let svgWidth = $derived(layout.totalWidth + 2 * PAD_X)
  let svgHeight = $derived(LABEL_TOP + laneCount * laneHeight)

  const outlineAttrs = {
    solid: { stroke: 'none', 'stroke-width': 0 },
    handoff: {
      class: 'stroke-map-handoff-outline',
      'stroke-width': 3,
    },
    dashed: {
      class: 'stroke-map-dashed-outline',
      'stroke-width': 2,
      'stroke-dasharray': '6 4',
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
      aria-label="Time ladder, {mode === 'scaled' ? 'to scale' : 'equal width'}"
      class="block max-w-none"
      data-testid="ladder-map"
    >
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
        {#each labelled as { step, lines }, index (step.stepId)}
          {@const laneTop = LABEL_TOP + lanes[index] * laneHeight}
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
            {#if step.outside}
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
            <text x={step.x + 4} y={laneTop + 12} font-size="12">
              {#each lines as line, lineIndex (lineIndex)}
                <tspan
                  x={step.x + 4}
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
