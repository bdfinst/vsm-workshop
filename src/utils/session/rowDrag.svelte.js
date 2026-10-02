/**
 * Which step is being dragged by its handle. A drop on another row asks for
 * the dragged step to take that row's place.
 * @file This file uses Svelte 5 runes ($state)
 * @param {function(string, string): void} onMove - Called with the dragged step's id and the id of the row it was dropped on
 * @returns {{isAnyRowDragged: boolean, start: function(string): void, end: function(): void, drop: function(string): void}}
 */
export const createRowDrag = (onMove) => {
  let draggedId = $state(null)

  return {
    get isAnyRowDragged() {
      return draggedId !== null
    },
    start: (stepId) => {
      draggedId = stepId
    },
    end: () => {
      draggedId = null
    },
    drop: (targetId) => {
      const stepId = draggedId
      draggedId = null
      if (stepId && stepId !== targetId) onMove(stepId, targetId)
    },
  }
}
