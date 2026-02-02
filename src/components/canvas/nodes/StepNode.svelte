<script>
  import { Handle, Position } from '@xyflow/svelte'
  import { STEP_TYPE_CONFIG } from '../../../data/stepTypes.js'
  import { formatDuration } from '../../../utils/calculations/metrics.js'

  const QUEUE_HIGH_THRESHOLD = 5

  let { data, selected = false } = $props()

  let config = $derived(STEP_TYPE_CONFIG[data.type] || STEP_TYPE_CONFIG.custom)
  let hasQueue = $derived(data.queueSize > 0)
  let isHighQueue = $derived(data.queueSize >= QUEUE_HIGH_THRESHOLD)
  let hasBatch = $derived(data.batchSize > 1)
  let isBottleneck = $derived(isHighQueue || data.isSimulationBottleneck)

  let nodeClasses = $derived(() => {
    const classes = ['vsm-node', `vsm-node--${data.type}`]
    if (selected) classes.push('ring-2 ring-blue-500')
    if (isBottleneck) classes.push('vsm-node--bottleneck')
    return classes.join(' ')
  })
</script>

<div
  class={nodeClasses}
  data-testid="step-node-{data.id}"
>
  <Handle
    type="target"
    position={Position.Left}
    class="!bg-gray-400 !w-3 !h-3"
  />

  {#if hasQueue}
    <div
      class="vsm-node__queue-badge {isHighQueue ? 'vsm-node__queue-badge--high' : ''}"
      title="{data.queueSize} items waiting"
    >
      {data.queueSize}
    </div>
  {/if}

  {#if hasBatch}
    <div class="vsm-node__batch-badge" title="Batch size: {data.batchSize}">
      {data.batchSize}x
    </div>
  {/if}

  <div class="vsm-node__header">
    <span class="text-lg">{config.icon}</span>
    <span class="truncate">{data.name}</span>
  </div>

  <div class="vsm-node__metrics">
    <div>
      <span class="text-gray-500">PT:</span>
      <span class="font-medium">{formatDuration(data.processTime)}</span>
    </div>
    <div>
      <span class="text-gray-500">LT:</span>
      <span class="font-medium">{formatDuration(data.leadTime)}</span>
    </div>
    <div>
      <span class="text-gray-500">%C&A:</span>
      <span class="font-medium">{data.percentCompleteAccurate}%</span>
    </div>
  </div>

  <Handle
    type="source"
    position={Position.Right}
    class="!bg-gray-400 !w-3 !h-3"
  />
</div>
