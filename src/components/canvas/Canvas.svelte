<script>
  /**
   * VSMCanvas - Svelte Flow integration for VSM visualization
   *
   * This component wraps Svelte Flow and provides:
   * - Custom node types (StepNode for process visualization)
   * - Svelte stores integration for VSM data
   * - Pan/zoom controls and mini-map
   * - Node positioning and drag-to-update
   * - Connection visualization between steps
   */
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    MarkerType,
  } from '@xyflow/svelte'
  import '@xyflow/svelte/dist/style.css'

  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'
  import { vsmUIStore } from '../../stores/vsmUIStore.svelte.js'
  import { simDataStore } from '../../stores/simulationDataStore.svelte.js'
  import { simControlStore } from '../../stores/simulationControlStore.svelte.js'
  import StepNode from './nodes/StepNode.svelte'

  const nodeTypes = {
    stepNode: StepNode,
  }

  const defaultEdgeOptions = {
    type: 'smoothstep',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
    },
    style: {
      strokeWidth: 2,
    },
  }

  // Derive nodes from store
  let nodes = $derived(
    vsmDataStore.steps.map((step) => ({
      id: step.id,
      type: 'stepNode',
      position: step.position,
      data: {
        ...step,
        simulationQueueSize: simControlStore.isRunning
          ? simDataStore.queueSizesByStepId[step.id]
          : undefined,
        isSimulationBottleneck: simDataStore.detectedBottlenecks.includes(step.id),
      },
      selected: step.id === vsmUIStore.selectedStepId,
    }))
  )

  // Helper function to get edge stroke color
  function getEdgeStrokeColor(isSelected, connectionType) {
    if (isSelected) return '#3b82f6'
    if (connectionType === 'rework') return '#ef4444'
    return '#6b7280'
  }

  // Derive edges from store
  let edges = $derived(
    vsmDataStore.connections.map((conn) => {
      const isSelected = conn.id === vsmUIStore.selectedConnectionId
      return {
        id: conn.id,
        source: conn.source,
        target: conn.target,
        type: 'smoothstep',
        animated: conn.type === 'rework',
        selected: isSelected,
        style: {
          stroke: getEdgeStrokeColor(isSelected, conn.type),
          strokeWidth: isSelected ? 3 : 2,
          strokeDasharray: conn.type === 'rework' ? '5,5' : 'none',
        },
        label: conn.type === 'rework' ? `${conn.reworkRate}% rework` : undefined,
        labelStyle: { fill: conn.type === 'rework' ? '#ef4444' : '#6b7280', fontSize: 10 },
      }
    })
  )

  function handleConnect(event) {
    const { source, target } = event.detail.connection
    vsmDataStore.addConnection(source, target)
  }

  function handleNodeDragStop(event) {
    const { node } = event.detail
    vsmDataStore.updateStepPosition(node.id, node.position)
  }

  function handleNodeClick(event) {
    const { node } = event.detail
    vsmUIStore.clearConnectionSelection()
    vsmUIStore.selectStep(node.id)
  }

  function handleNodeDoubleClick(event) {
    const { node } = event.detail
    vsmUIStore.selectStep(node.id)
    vsmUIStore.setEditing(true)
  }

  function handleEdgeClick(event) {
    const { edge } = event.detail
    vsmUIStore.selectConnection(edge.id)
  }

  function handlePaneClick() {
    vsmUIStore.clearSelection()
    vsmUIStore.clearConnectionSelection()
  }

  function handleKeyDown(event) {
    if (
      (event.key === 'Delete' || event.key === 'Backspace') &&
      vsmUIStore.selectedStepId
    ) {
      if (confirm('Delete this step?')) {
        vsmDataStore.deleteStep(vsmUIStore.selectedStepId)
      }
    }
  }

  function getNodeColor(node) {
    if (node.selected) return '#3b82f6'
    return '#9ca3af'
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="w-full h-full"
  onkeydown={handleKeyDown}
  tabindex="0"
  data-testid="vsm-canvas"
>
  <SvelteFlow
    {nodes}
    {edges}
    {nodeTypes}
    {defaultEdgeOptions}
    fitView
    fitViewOptions={{ padding: 0.2 }}
    snapToGrid
    snapGrid={[10, 10]}
    onconnect={handleConnect}
    onnodedragstop={handleNodeDragStop}
    onnodeclick={handleNodeClick}
    onnodedoubleclick={handleNodeDoubleClick}
    onedgeclick={handleEdgeClick}
    onpaneclick={handlePaneClick}
  >
    <Background color="#e5e7eb" gap={20} />
    <Controls />
    <MiniMap
      nodeColor={getNodeColor}
      maskColor="rgba(0, 0, 0, 0.1)"
    />
  </SvelteFlow>
</div>
