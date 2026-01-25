import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import PropTypes from 'prop-types'
import { STEP_TYPE_CONFIG } from '../../../data/stepTypes'
import { formatDuration } from '../../../utils/calculations/metrics'

const QUEUE_HIGH_THRESHOLD = 5

function StepNode({ data, selected }) {
  const config = STEP_TYPE_CONFIG[data.type] || STEP_TYPE_CONFIG.custom
  const hasQueue = data.queueSize > 0
  const isHighQueue = data.queueSize >= QUEUE_HIGH_THRESHOLD
  const hasBatch = data.batchSize > 1
  const isBottleneck = isHighQueue || data.isSimulationBottleneck

  return (
    <div
      className={`vsm-node vsm-node--${data.type} ${selected ? 'ring-2 ring-blue-500' : ''} ${isBottleneck ? 'vsm-node--bottleneck' : ''}`}
      data-testid={`step-node-${data.id}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-gray-400 !w-3 !h-3"
      />

      {hasQueue && (
        <div
          className={`vsm-node__queue-badge ${isHighQueue ? 'vsm-node__queue-badge--high' : ''}`}
          title={`${data.queueSize} items waiting`}
        >
          {data.queueSize}
        </div>
      )}

      {hasBatch && (
        <div className="vsm-node__batch-badge" title={`Batch size: ${data.batchSize}`}>
          {data.batchSize}x
        </div>
      )}

      <div className="vsm-node__header">
        <span className="text-lg">{config.icon}</span>
        <span className="truncate">{data.name}</span>
      </div>

      <div className="vsm-node__metrics">
        <div>
          <span className="text-gray-500">PT:</span>
          <span className="font-medium">{formatDuration(data.processTime)}</span>
        </div>
        <div>
          <span className="text-gray-500">LT:</span>
          <span className="font-medium">{formatDuration(data.leadTime)}</span>
        </div>
        <div>
          <span className="text-gray-500">%C&A:</span>
          <span className="font-medium">{data.percentCompleteAccurate}%</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-gray-400 !w-3 !h-3"
      />
    </div>
  )
}

StepNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    processTime: PropTypes.number.isRequired,
    leadTime: PropTypes.number.isRequired,
    percentCompleteAccurate: PropTypes.number.isRequired,
    queueSize: PropTypes.number,
    batchSize: PropTypes.number,
    isSimulationBottleneck: PropTypes.bool,
  }).isRequired,
  selected: PropTypes.bool,
}

StepNode.defaultProps = {
  selected: false,
}

export default memo(StepNode)
