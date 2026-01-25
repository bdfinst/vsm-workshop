/**
 * Simulation Engine
 * Core logic for simulating work item flow through a value stream
 */

/**
 * Initialize simulation state
 */
export function initSimulation(steps, connections, config = {}) {
  const { workItemCount = 10 } = config

  const queueSizes = {}
  steps.forEach((step) => {
    queueSizes[step.id] = 0
  })

  return {
    isRunning: false,
    isPaused: false,
    speed: 1.0,
    workItemCount,
    workItems: [],
    completedCount: 0,
    elapsedTime: 0,
    queueSizes,
    queueHistory: [],
    detectedBottlenecks: [],
    results: null,
  }
}

/**
 * Generate work items at the first step
 */
export function generateWorkItems(count, firstStepId) {
  const items = []
  for (let i = 0; i < count; i++) {
    items.push({
      id: crypto.randomUUID(),
      currentStepId: firstStepId,
      progress: 0,
      enteredAt: 0,
      history: [],
      isRework: false,
    })
  }
  return items
}

/**
 * Process one simulation tick
 */
export function processTick(state, steps, connections) {
  if (state.isPaused) {
    return state
  }

  const tickDuration = 1 / state.speed
  const newElapsedTime = state.elapsedTime + tickDuration
  let newCompletedCount = state.completedCount
  const newQueueSizes = { ...state.queueSizes }

  const newWorkItems = state.workItems.map((item) => {
    if (item.currentStepId === null) {
      return item // Already completed
    }

    const step = steps.find((s) => s.id === item.currentStepId)
    if (!step) {
      return item
    }

    const newProgress = item.progress + tickDuration * 10

    // Check if step is complete
    if (newProgress >= step.processTime) {
      // Record history
      const newHistory = [
        ...item.history,
        {
          stepId: step.id,
          enteredAt: item.enteredAt,
          exitedAt: newElapsedTime,
        },
      ]

      // Check for rework
      const triggerRework = shouldRework(step, connections)
      const nextStepId = routeWorkItem(step, connections, triggerRework)

      if (nextStepId) {
        // Update queue at next step
        newQueueSizes[nextStepId] = (newQueueSizes[nextStepId] || 0) + 1

        return {
          ...item,
          currentStepId: nextStepId,
          progress: 0,
          enteredAt: newElapsedTime,
          history: newHistory,
          isRework: triggerRework,
        }
      } else {
        // No next step - completed
        newCompletedCount++
        return {
          ...item,
          currentStepId: null,
          progress: 0,
          history: newHistory,
        }
      }
    }

    return {
      ...item,
      progress: newProgress,
    }
  })

  // Record queue history
  const newQueueHistory = [...state.queueHistory]
  steps.forEach((step) => {
    newQueueHistory.push({
      tick: newElapsedTime,
      stepId: step.id,
      queueSize: newQueueSizes[step.id] || 0,
    })
  })

  // Detect bottlenecks
  const newBottlenecks = detectBottlenecks(steps, newQueueSizes)

  return {
    ...state,
    elapsedTime: newElapsedTime,
    workItems: newWorkItems,
    completedCount: newCompletedCount,
    queueSizes: newQueueSizes,
    queueHistory: newQueueHistory,
    detectedBottlenecks: newBottlenecks,
  }
}

/**
 * Route work item to next step
 */
export function routeWorkItem(currentStep, connections, isRework = false) {
  const connectionType = isRework ? 'rework' : 'forward'

  const connection = connections.find(
    (c) => c.source === currentStep.id && c.type === connectionType
  )

  if (connection) {
    return connection.target
  }

  // If looking for rework but none found, try forward
  if (isRework) {
    const forwardConnection = connections.find(
      (c) => c.source === currentStep.id && c.type === 'forward'
    )
    return forwardConnection?.target || null
  }

  return null
}

/**
 * Determine if rework should occur based on %C&A
 */
export function shouldRework(step, connections, randomFn = Math.random) {
  // Check if rework connection exists
  const hasReworkConnection = connections.some(
    (c) => c.source === step.id && c.type === 'rework'
  )

  if (!hasReworkConnection) {
    return false
  }

  // Calculate rework probability based on %C&A
  const reworkProbability = (100 - step.percentCompleteAccurate) / 100

  return randomFn() < reworkProbability
}

/**
 * Detect bottleneck steps based on queue sizes
 */
export function detectBottlenecks(steps, queueSizes, threshold = 3) {
  return steps
    .filter((step) => (queueSizes[step.id] || 0) > threshold)
    .map((step) => step.id)
}

/**
 * Calculate simulation results
 */
export function calculateResults(state, steps) {
  const { workItems, workItemCount, completedCount, elapsedTime, queueHistory } =
    state

  // Calculate average lead time
  let totalLeadTime = 0
  workItems.forEach((item) => {
    const itemLeadTime = item.history.reduce(
      (sum, h) => sum + (h.exitedAt - h.enteredAt),
      0
    )
    totalLeadTime += itemLeadTime
  })
  const avgLeadTime = workItemCount > 0 ? totalLeadTime / workItemCount : 0

  // Calculate throughput
  const throughput = elapsedTime > 0 ? completedCount / elapsedTime : 0

  // Calculate peak queues for bottleneck reporting
  const peakQueues = {}
  queueHistory.forEach((record) => {
    if (
      !peakQueues[record.stepId] ||
      record.queueSize > peakQueues[record.stepId]
    ) {
      peakQueues[record.stepId] = record.queueSize
    }
  })

  const bottlenecks = Object.entries(peakQueues)
    .filter(([, peak]) => peak > 3)
    .map(([stepId, peakQueueSize]) => ({
      stepId,
      peakQueueSize,
      stepName: steps.find((s) => s.id === stepId)?.name,
    }))
    .sort((a, b) => b.peakQueueSize - a.peakQueueSize)

  return {
    completedCount,
    avgLeadTime,
    throughput,
    bottlenecks,
    totalTime: elapsedTime,
  }
}

/**
 * Run simulation to completion
 */
export function runSimulationToCompletion(
  initialState,
  steps,
  connections,
  maxTicks = 10000
) {
  let state = { ...initialState, isRunning: true }
  let ticks = 0

  while (state.completedCount < state.workItemCount && ticks < maxTicks) {
    state = processTick(state, steps, connections)
    ticks++
  }

  state.isRunning = false
  state.results = calculateResults(state, steps)

  return state
}
