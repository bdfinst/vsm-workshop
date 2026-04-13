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
  import ReworkEdge from './edges/ReworkEdge.svelte'
  import GuidanceBanner from '../ui/GuidanceBanner.svelte'

  const nodeTypes = {
    stepNode: StepNode,
  }

  const edgeTypes = {
    rework: ReworkEdge,
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

  // Non-reactive node cache keyed by step ID.
  // Avoids reconstructing unchanged node objects on every simulation tick.
  // Plain object intentionally avoids Svelte reactive tracking for this cache.
  let nodeCache = Object.create(null)

  const buildNode = (step, queueSize, isBottleneck, selected) => ({
    id: step.id,
    type: 'stepNode',
    position: step.position,
    data: {
      ...step,
      simulationQueueSize: queueSize,
      isSimulationBottleneck: isBottleneck,
    },
    selected,
  })

  let nodes = $derived(
    vsmDataStore.steps.map((step) => {
      const queueSize = simControlStore.isRunning
        ? simDataStore.queueSizesByStepId[step.id]
        : undefined
      const isBottleneck = simDataStore.detectedBottlenecks.includes(step.id)
      const selected = step.id === vsmUIStore.selectedStepId

      const cached = nodeCache[step.id]
      if (
        cached &&
        cached.step === step &&
        cached.queueSize === queueSize &&
        cached.isBottleneck === isBottleneck &&
        cached.selected === selected
      ) {
        return cached.node
      }

      const node = buildNode(step, queueSize, isBottleneck, selected)
      nodeCache[step.id] = { step, queueSize, isBottleneck, selected, node }
      return node
    })
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
      const isRework = conn.type === 'rework'
      return {
        id: conn.id,
        source: conn.source,
        target: conn.target,
        type: isRework ? 'rework' : 'smoothstep',
        animated: isRework,
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

<div
  class="w-full h-full relative"
  onkeydown={handleKeyDown}
  tabindex="0"
  role="application"
  aria-label="Value stream map canvas"
  data-testid="vsm-canvas"
>
  <GuidanceBanner />
  <SvelteFlow
    {nodes}
    {edges}
    {nodeTypes}
    {edgeTypes}
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
