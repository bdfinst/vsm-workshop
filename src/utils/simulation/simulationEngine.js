/**
 * Simulation Engine
 * Core logic for simulating work item flow through a value stream
 *
 * Module Organization:
 * 1. Work Item Factory - Functions for creating and managing work items
 * 2. Simulation Engine - Core tick processing and state management
 * 3. Routing Logic - Work item routing between steps
 * 4. Bottleneck Detector - Queue monitoring and bottleneck identification
 * 5. Results Calculator - Final metrics and statistics
 */

// ============================================================================
// WORK ITEM FACTORY
// ============================================================================

/**
 * Initialize simulation state
 */
export function initSimulation(steps, connections, config = {}) {
  const { workItemCount = 10 } = config

  const queueSizesByStepId = {}
  steps.forEach((step) => {
    queueSizesByStepId[step.id] = 0
  })

  return {
    isRunning: false,
    isPaused: false,
    speed: 1.0,
    workItemCount,
    workItems: [],
    completedCount: 0,
    elapsedTime: 0,
    queueSizesByStepId,
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

// ============================================================================
// SIMULATION ENGINE
// ============================================================================

/**
 * Process a single work item for one tick
 */
function processWorkItem(item, step, tickDuration, newElapsedTime, connections) {
  const newProgress = item.progress + tickDuration * 10

  // Check if step is complete
  if (newProgress >= step.processTime) {
    const newHistory = recordStepCompletion(item, step, newElapsedTime)
    const triggerRework = shouldRework(step, connections)
    const nextStepId = routeToNextStep(step, connections, triggerRework)

    if (nextStepId) {
      return {
        updatedItem: {
          ...item,
          currentStepId: nextStepId,
          progress: 0,
          enteredAt: newElapsedTime,
          history: newHistory,
          isRework: triggerRework,
        },
        isCompleted: false,
        nextStepId,
      }
    } else {
      return {
        updatedItem: {
          ...item,
          currentStepId: null,
          progress: 0,
          history: newHistory,
        },
        isCompleted: true,
        nextStepId: null,
      }
    }
  }

  return {
    updatedItem: {
      ...item,
      progress: newProgress,
    },
    isCompleted: false,
    nextStepId: null,
  }
}

/**
 * Record step completion in work item history
 */
function recordStepCompletion(item, step, newElapsedTime) {
  return [
    ...item.history,
    {
      stepId: step.id,
      enteredAt: item.enteredAt,
      exitedAt: newElapsedTime,
    },
  ]
}

/**
 * Route work item to next step
 */
function routeToNextStep(step, connections, triggerRework) {
  return routeWorkItem(step, connections, triggerRework)
}

/**
 * Process a single item in the work items map
 */
function processItemInTick(
  item,
  steps,
  connections,
  tickDuration,
  newElapsedTime
) {
  if (item.currentStepId === null) {
    return { updatedItem: item, isCompleted: false, nextStepId: null }
  }

  const step = steps.find((s) => s.id === item.currentStepId)
  if (!step) {
    return { updatedItem: item, isCompleted: false, nextStepId: null }
  }

  return processWorkItem(item, step, tickDuration, newElapsedTime, connections)
}

/**
 * Advance progress for all work items and move completed ones
 */
function advanceItemProgress(
  workItems,
  steps,
  connections,
  tickDuration,
  newElapsedTime
) {
  let completedCount = 0
  const queueUpdates = {}

  const updatedItems = workItems.map((item) => {
    const result = processItemInTick(
      item,
      steps,
      connections,
      tickDuration,
      newElapsedTime
    )

    if (result.isCompleted) {
      completedCount++
    }

    if (result.nextStepId) {
      queueUpdates[result.nextStepId] =
        (queueUpdates[result.nextStepId] || 0) + 1
    }

    return result.updatedItem
  })

  return { updatedItems, completedCount, queueUpdates }
}

/**
 * Update queue sizes with new items
 */
function updateQueues(currentQueueSizes, queueUpdates) {
  const newQueueSizes = { ...currentQueueSizes }

  Object.entries(queueUpdates).forEach(([stepId, increment]) => {
    newQueueSizes[stepId] = (newQueueSizes[stepId] || 0) + increment
  })

  return newQueueSizes
}

/**
 * Record queue state for current tick
 */
function recordHistory(queueHistory, steps, queueSizesByStepId, currentTime) {
  const newHistory = [...queueHistory]

  steps.forEach((step) => {
    newHistory.push({
      tick: currentTime,
      stepId: step.id,
      queueSize: queueSizesByStepId[step.id] || 0,
    })
  })

  return newHistory
}

/**
 * Process one simulation tick
 * Main engine loop that advances the simulation by one time unit
 */
export function processTick(state, steps, connections) {
  if (state.isPaused) {
    return state
  }

  const tickDuration = 1 / state.speed
  const newElapsedTime = state.elapsedTime + tickDuration

  const { updatedItems, completedCount, queueUpdates } = advanceItemProgress(
    state.workItems,
    steps,
    connections,
    tickDuration,
    newElapsedTime
  )

  const newQueueSizes = updateQueues(state.queueSizesByStepId, queueUpdates)
  const newQueueHistory = recordHistory(
    state.queueHistory,
    steps,
    newQueueSizes,
    newElapsedTime
  )
  const newBottlenecks = detectBottlenecks(steps, newQueueSizes)

  return {
    ...state,
    elapsedTime: newElapsedTime,
    workItems: updatedItems,
    completedCount: state.completedCount + completedCount,
    queueSizesByStepId: newQueueSizes,
    queueHistory: newQueueHistory,
    detectedBottlenecks: newBottlenecks,
  }
}

/**
 * Run simulation to completion
 * Executes simulation until all work items complete or max ticks reached
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

// ============================================================================
// ROUTING LOGIC
// ============================================================================

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
 * Check if a step has a rework path
 * @param {Object} step - The process step
 * @param {Array} connections - All connections in the VSM
 * @returns {boolean} True if rework connection exists
 */
export function hasReworkPath(step, connections) {
  return connections.some(
    (c) => c.source === step.id && c.type === 'rework'
  )
}

/**
 * Calculate rework probability based on %C&A
 * @param {Object} step - The process step with percentCompleteAccurate
 * @returns {number} Probability of rework (0-1)
 */
export function calculateReworkProbability(step) {
  return (100 - step.percentCompleteAccurate) / 100
}

/**
 * Determine if rework should occur based on %C&A
 * @param {Object} step - The process step
 * @param {Array} connections - All connections in the VSM
 * @param {Function} randomFn - Random function for testability (0-1)
 * @returns {boolean} True if rework should occur
 */
export function shouldRework(step, connections, randomFn = Math.random) {
  if (!hasReworkPath(step, connections)) {
    return false
  }

  const reworkProbability = calculateReworkProbability(step)
  return randomFn() < reworkProbability
}

// ============================================================================
// BOTTLENECK DETECTOR
// ============================================================================

/**
 * Detect bottleneck steps based on queue sizes
 * Identifies steps with queues exceeding the threshold
 */
export function detectBottlenecks(steps, queueSizesByStepId, threshold = 3) {
  return steps
    .filter((step) => (queueSizesByStepId[step.id] || 0) > threshold)
    .map((step) => step.id)
}

// ============================================================================
// RESULTS CALCULATOR
// ============================================================================

/**
 * Calculate simulation results
 * Computes final metrics including lead time, throughput, and bottlenecks
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
