/**
 * VSM UI Store - Svelte 5 Runes
 * Manages selection and editing UI state
 * Not persisted (ephemeral state)
 */

/**
 * Create the VSM UI store
 * @returns {Object} VSM UI store with reactive state and actions
 */
function createVsmUIStore() {
  // Step selection & editing
  let selectedStepId = $state(null)
  let isEditing = $state(false)

  // Connection selection & editing
  let selectedConnectionId = $state(null)
  let isEditingConnection = $state(false)

  // Guidance banner for backwards mapping
  let guidanceDismissed = $state(false)
  let guidanceForceShow = $state(false)

  return {
    // Reactive getters - Step
    get selectedStepId() {
      return selectedStepId
    },
    get isEditing() {
      return isEditing
    },

    // Reactive getters - Connection
    get selectedConnectionId() {
      return selectedConnectionId
    },
    get isEditingConnection() {
      return isEditingConnection
    },

    // Step Actions
    selectStep(stepId) {
      selectedStepId = stepId
      // Clear connection selection when selecting a step
      selectedConnectionId = null
      isEditingConnection = false
    },

    clearSelection() {
      selectedStepId = null
    },

    setEditing(editing) {
      isEditing = editing
    },

    // Guidance
    get guidanceDismissed() {
      return guidanceDismissed
    },

    get guidanceForceShow() {
      return guidanceForceShow
    },

    dismissGuidance() {
      guidanceDismissed = true
      guidanceForceShow = false
    },

    forceShowGuidance() {
      guidanceForceShow = true
    },

    resetGuidance() {
      guidanceDismissed = false
      guidanceForceShow = false
    },

    // Connection Actions
    selectConnection(connectionId) {
      selectedConnectionId = connectionId
      isEditingConnection = true
      // Clear step selection when selecting a connection
      selectedStepId = null
      isEditing = false
    },

    setEditingConnection(editing) {
      isEditingConnection = editing
    },

    clearConnectionSelection() {
      selectedConnectionId = null
      isEditingConnection = false
    },

    // Clear all UI state
    clearUIState() {
      selectedStepId = null
      isEditing = false
      selectedConnectionId = null
      isEditingConnection = false
      guidanceDismissed = false
      guidanceForceShow = false
    },
  }
}

// Export singleton instance
export const vsmUIStore = createVsmUIStore()
