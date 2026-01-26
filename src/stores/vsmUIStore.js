import { create } from 'zustand'

export const useVsmUIStore = create((set) => ({
  // Step Selection & Editing
  selectedStepId: null,
  isEditing: false,

  selectStep: (stepId) => {
    set({ selectedStepId: stepId })
  },

  clearSelection: () => {
    set({ selectedStepId: null })
  },

  setEditing: (isEditing) => {
    set({ isEditing })
  },

  // Connection Selection & Editing
  selectedConnectionId: null,
  isEditingConnection: false,

  selectConnection: (connectionId) => {
    set({
      selectedConnectionId: connectionId,
      isEditingConnection: true,
      selectedStepId: null,
      isEditing: false,
    })
  },

  setEditingConnection: (isEditingConnection) => {
    set({ isEditingConnection })
  },

  clearConnectionSelection: () => {
    set({
      selectedConnectionId: null,
      isEditingConnection: false,
    })
  },

  // Clear all UI state
  clearUIState: () => {
    set({
      selectedStepId: null,
      isEditing: false,
      selectedConnectionId: null,
      isEditingConnection: false,
    })
  },
}))
