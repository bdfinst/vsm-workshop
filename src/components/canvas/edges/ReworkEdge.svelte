<script>
  import { BaseEdge } from '@xyflow/svelte'
  import { calculateReworkPath } from '../../../utils/ui/reworkEdgePath.js'

  let {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    label,
    labelStyle,
    markerStart,
    markerEnd,
    style,
  } = $props()

  let edgePath = $derived(
    calculateReworkPath({ sourceX, sourceY, targetX, targetY })
  )
</script>

<BaseEdge
  {id}
  path={edgePath.path}
  labelX={edgePath.labelPosition.x}
  labelY={edgePath.labelPosition.y}
  {label}
  {labelStyle}
  {markerStart}
  {markerEnd}
  {style}
/>
