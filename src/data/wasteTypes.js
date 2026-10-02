/**
 * Lean waste categories for Kaizen-burst annotations, adapted to software delivery.
 * Used to tag improvement opportunities on steps and connections.
 */
export const WASTE_TYPES = {
  WAITING: 'waiting',
  HANDOFF: 'handoff',
  REWORK: 'rework',
  OVERPROCESSING: 'overprocessing',
  OVERPRODUCTION: 'overproduction',
  INVENTORY: 'inventory',
  TASK_SWITCHING: 'task_switching',
  PRACTICE_GAP: 'practice_gap',
}

/** Display labels for each waste type. */
export const WASTE_TYPE_LABELS = {
  [WASTE_TYPES.WAITING]: 'Waiting',
  [WASTE_TYPES.HANDOFF]: 'Handoff',
  [WASTE_TYPES.REWORK]: 'Rework / Defects',
  [WASTE_TYPES.OVERPROCESSING]: 'Over-processing',
  [WASTE_TYPES.OVERPRODUCTION]: 'Over-production',
  [WASTE_TYPES.INVENTORY]: 'Inventory / WIP',
  [WASTE_TYPES.TASK_SWITCHING]: 'Task switching',
  [WASTE_TYPES.PRACTICE_GAP]: 'Practice gap',
}

/** True when the value is a recognized waste type. */
export const isWasteType = (value) => Object.values(WASTE_TYPES).includes(value)
