import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useVsmStore } from '../../stores/vsmStore'
import { useSimulationStore } from '../../stores/simulationStore'
import StepNode from './nodes/StepNode'

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

function Canvas() {
  const {
    steps,
    connections,
    selectedStepId,
    selectedConnectionId,
    addConnection,
    deleteConnection,
    updateStepPosition,
    selectStep,
    setEditing,
    deleteStep,
    selectConnection,
    clearConnectionSelection,
  } = useVsmStore()

  const { detectedBottlenecks, queueSizes, isRunning } = useSimulationStore()

  const nodes = useMemo(
    () =>
      steps.map((step) => ({
        id: step.id,
        type: 'stepNode',
        position: step.position,
        data: {
          ...step,
          // Override queue size with simulation queue if running
          queueSize: isRunning ? (queueSizes[step.id] || 0) : step.queueSize,
          isSimulationBottleneck: detectedBottlenecks.includes(step.id),
        },
        selected: step.id === selectedStepId,
      })),
    [steps, selectedStepId, isRunning, queueSizes, detectedBottlenecks]
  )

  const edges = useMemo(
    () =>
      connections.map((conn) => {
        const isSelected = conn.id === selectedConnectionId
        return {
          id: conn.id,
          source: conn.source,
          target: conn.target,
          type: 'smoothstep',
          animated: conn.type === 'rework',
          selected: isSelected,
          style: {
            stroke: isSelected ? '#3b82f6' : conn.type === 'rework' ? '#ef4444' : '#6b7280',
            strokeWidth: isSelected ? 3 : 2,
            strokeDasharray: conn.type === 'rework' ? '5,5' : 'none',
          },
          label: conn.type === 'rework' ? `${conn.reworkRate}% rework` : undefined,
          labelStyle: { fill: conn.type === 'rework' ? '#ef4444' : '#6b7280', fontSize: 10 },
        }
      }),
    [connections, selectedConnectionId]
  )

  const [reactFlowNodes, setNodes, onNodesChange] = useNodesState(nodes)
  const [reactFlowEdges, setEdges, onEdgesChange] = useEdgesState(edges)

  // Sync with store when steps/connections change
  useMemo(() => {
    setNodes(nodes)
  }, [nodes, setNodes])

  useMemo(() => {
    setEdges(edges)
  }, [edges, setEdges])

  const onConnect = useCallback(
    (params) => {
      addConnection(params.source, params.target)
    },
    [addConnection]
  )

  const onNodeDragStop = useCallback(
    (event, node) => {
      updateStepPosition(node.id, node.position)
    },
    [updateStepPosition]
  )

  const onNodeClick = useCallback(
    (event, node) => {
      event.stopPropagation()
      clearConnectionSelection()
      selectStep(node.id)
    },
    [selectStep, clearConnectionSelection]
  )

  const onNodeDoubleClick = useCallback(
    (event, node) => {
      event.stopPropagation()
      selectStep(node.id)
      setEditing(true)
    },
    [selectStep, setEditing]
  )

  const onEdgeClick = useCallback(
    (event, edge) => {
      event.stopPropagation()
      selectConnection(edge.id)
    },
    [selectConnection]
  )

  const onKeyDown = useCallback(
    (event) => {
      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        selectedStepId
      ) {
        if (confirm('Delete this step?')) {
          deleteStep(selectedStepId)
        }
      }
    },
    [selectedStepId, deleteStep]
  )

  return (
    <div
      className="w-full h-full"
      onKeyDown={onKeyDown}
      tabIndex={0}
      data-testid="vsm-canvas"
    >
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        snapToGrid
        snapGrid={[10, 10]}
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.selected) return '#3b82f6'
            return '#9ca3af'
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  )
}

export default Canvas
