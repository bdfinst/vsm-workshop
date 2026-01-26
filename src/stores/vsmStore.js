import { create } from 'zustand'
import { useVsmDataStore, selectMetrics } from './vsmDataStore.js'
import { useVsmUIStore } from './vsmUIStore.js'
import { useVsmIOStore } from './vsmIOStore.js'

/**
 * Composed VSM Store
 *
 * This is a composition layer that delegates to three separate stores:
 * - vsmDataStore: Domain entities (VSM maps, steps, connections) and business rules
 * - vsmUIStore: UI state management (selection, editing modes) - SEPARATED from domain
 * - vsmIOStore: Import/export operations
 *
 * This separation ensures domain logic remains independent of UI concerns.
 * Components can use this unified store for backward compatibility,
 * or access individual stores directly for better separation.
 */
export const useVsmStore = create((set, get) => ({
  // Proxy getters to data store
  get id() {
    return useVsmDataStore.getState().id
  },
  get name() {
    return useVsmDataStore.getState().name
  },
  get description() {
    return useVsmDataStore.getState().description
  },
  get steps() {
    return useVsmDataStore.getState().steps
  },
  get connections() {
    return useVsmDataStore.getState().connections
  },
  get createdAt() {
    return useVsmDataStore.getState().createdAt
  },
  get updatedAt() {
    return useVsmDataStore.getState().updatedAt
  },

  // Proxy getters to UI store
  get selectedStepId() {
    return useVsmUIStore.getState().selectedStepId
  },
  get isEditing() {
    return useVsmUIStore.getState().isEditing
  },
  get selectedConnectionId() {
    return useVsmUIStore.getState().selectedConnectionId
  },
  get isEditingConnection() {
    return useVsmUIStore.getState().isEditingConnection
  },

  // Data store actions
  createNewMap: (...args) => {
    useVsmDataStore.getState().createNewMap(...args)
    useVsmUIStore.getState().clearUIState()
  },
  updateMapName: (...args) => useVsmDataStore.getState().updateMapName(...args),
  updateMapDescription: (...args) =>
    useVsmDataStore.getState().updateMapDescription(...args),
  addStep: (...args) => useVsmDataStore.getState().addStep(...args),
  updateStep: (...args) => useVsmDataStore.getState().updateStep(...args),
  deleteStep: (stepId) => {
    useVsmDataStore.getState().deleteStep(stepId)
    // Clear UI state if deleted step was selected
    const uiState = useVsmUIStore.getState()
    if (uiState.selectedStepId === stepId) {
      uiState.clearSelection()
    }
  },
  updateStepPosition: (...args) =>
    useVsmDataStore.getState().updateStepPosition(...args),
  addConnection: (...args) => useVsmDataStore.getState().addConnection(...args),
  updateConnection: (...args) =>
    useVsmDataStore.getState().updateConnection(...args),
  deleteConnection: (connectionId) => {
    useVsmDataStore.getState().deleteConnection(connectionId)
    // Clear UI state if deleted connection was selected
    const uiState = useVsmUIStore.getState()
    if (uiState.selectedConnectionId === connectionId) {
      uiState.clearConnectionSelection()
    }
  },
  clearMap: () => {
    useVsmDataStore.getState().clearMap()
    useVsmUIStore.getState().clearUIState()
  },

  // UI store actions
  selectStep: (...args) => useVsmUIStore.getState().selectStep(...args),
  clearSelection: (...args) => useVsmUIStore.getState().clearSelection(...args),
  setEditing: (...args) => useVsmUIStore.getState().setEditing(...args),
  selectConnection: (...args) =>
    useVsmUIStore.getState().selectConnection(...args),
  setEditingConnection: (...args) =>
    useVsmUIStore.getState().setEditingConnection(...args),
  clearConnectionSelection: (...args) =>
    useVsmUIStore.getState().clearConnectionSelection(...args),

  // IO store actions
  loadExample: (...args) => useVsmIOStore.getState().loadExample(...args),
  loadTemplate: (...args) => useVsmIOStore.getState().loadTemplate(...args),
  exportToJson: (...args) => useVsmIOStore.getState().exportToJson(...args),
  importFromJson: (...args) => useVsmIOStore.getState().importFromJson(...args),
}))

// Export selector for use with store
export { selectMetrics }

// Subscribe to underlying stores to trigger re-renders
useVsmDataStore.subscribe(() => {
  useVsmStore.setState({})
})

useVsmUIStore.subscribe(() => {
  useVsmStore.setState({})
})
