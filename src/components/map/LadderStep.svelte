<svelte:options namespace="svg" />

<script>
  import { TONE } from '../../utils/ui/flaggedSteps.js'
  import { OUTLINE } from '../../utils/ui/ladderModel.js'
  import {
    BLOCK_HEIGHT,
    BLOCK_STROKE_WIDTH,
    COLUMN_BOTTOM,
    DASHED_STROKE_WIDTH,
    DASH_PATTERN,
    HANDOFF_STROKE_WIDTH,
    LABEL_BASELINE,
    LABEL_FONT_SIZE,
    LABEL_INSET,
    LEADER_INSET,
    LEADER_STROKE_WIDTH,
    LINE_HEIGHT,
    OUTLINE_HEIGHT,
    OUTLINE_TOP,
    PROCESS_TOP,
    WAIT_TOP,
  } from '../../utils/ui/ladderGeometry.js'

  // LadderStep props, drawn inside the SVG of a LadderMap: step (a laid-out
  // step from sizeLadder), lines (its label lines, from layoutLabels), laneTop
  // (the y where its label lane starts) and hatchId (the id of the hatch
  // pattern an outside step is filled with).
  let { step, lines, laneTop, hatchId } = $props()

  const TONE_CLASS = {
    [TONE.HANDOFF]: 'fill-handoff-text',
    [TONE.WARN]: 'fill-warn-text',
    [TONE.CRIT]: 'fill-crit-text',
    [TONE.MUTED]: 'fill-muted-text',
  }

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

<g
  role="group"
  aria-label={step.name}
  data-testid="ladder-step"
  data-outline={step.outline}
>
  {#if step.waitBlock && step.waitBlock.width > 0}
    <rect
      x={step.waitBlock.x}
      y={WAIT_TOP}
      width={step.waitBlock.width}
      height={BLOCK_HEIGHT}
      stroke-width={BLOCK_STROKE_WIDTH}
      class="fill-map-wait-fill stroke-map-wait-outline"
      data-testid="ladder-wait-block"
    />
  {/if}
  {#if step.processBlock && step.processBlock.width > 0}
    <rect
      x={step.processBlock.x}
      y={PROCESS_TOP}
      width={step.processBlock.width}
      height={BLOCK_HEIGHT}
      stroke-width={BLOCK_STROKE_WIDTH}
      class="fill-map-process-fill stroke-map-process-outline"
      data-testid="ladder-process-block"
    />
  {/if}
  {#if step.outsideText}
    <rect
      x={step.x}
      y={WAIT_TOP}
      width={step.boxWidth}
      height={COLUMN_BOTTOM - WAIT_TOP}
      fill="url(#{hatchId})"
      data-testid="ladder-hatched"
    />
  {/if}
  <rect
    x={step.x}
    y={OUTLINE_TOP}
    width={step.boxWidth}
    height={OUTLINE_HEIGHT}
    fill="none"
    {...outlineAttrs[step.outline]}
    data-testid="ladder-box"
  />
  <line
    x1={step.x + LEADER_INSET}
    y1={OUTLINE_TOP + OUTLINE_HEIGHT}
    x2={step.x + LEADER_INSET}
    y2={laneTop}
    stroke-width={LEADER_STROKE_WIDTH}
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
        class={line.tone ? TONE_CLASS[line.tone] : 'fill-map-text font-semibold'}
      >
        {line.text}
      </tspan>
    {/each}
  </text>
</g>
