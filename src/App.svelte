<script>
  import { SvelteFlowProvider } from '@xyflow/svelte'
  import { vsmDataStore } from './stores/vsmDataStore.svelte.js'
  import { vsmUIStore } from './stores/vsmUIStore.svelte.js'
  import { performUndo, performRedo } from './utils/undoHelper.js'
  import Header from './components/ui/Header.svelte'
  import Canvas from './components/canvas/Canvas.svelte'
  import Sidebar from './components/ui/Sidebar.svelte'
  import MetricsDashboard from './components/metrics/MetricsDashboard.svelte'
  import WelcomeScreen from './components/ui/WelcomeScreen.svelte'
  import EditorPanel from './components/ui/EditorPanel.svelte'
  import SimulationPanel from './components/ui/SimulationPanel.svelte'
  import SimulationControls from './components/simulation/SimulationControls.svelte'

  // Reactive derived values from stores
  let hasVsm = $derived(vsmDataStore.id !== null)
  let selectedStepId = $derived(vsmUIStore.selectedStepId)
  let isEditing = $derived(vsmUIStore.isEditing)
  let selectedConnectionId = $derived(vsmUIStore.selectedConnectionId)
  let isEditingConnection = $derived(vsmUIStore.isEditingConnection)

  function handleCanvasClick() {
    if (isEditing || isEditingConnection) return
    vsmUIStore.clearSelection()
    vsmUIStore.clearConnectionSelection()
  }

  function handleCanvasKeyDown(e) {
    if (e.key === 'Escape') {
      handleCanvasClick()
    }
  }

  function handleCloseEditor() {
    vsmUIStore.setEditing(false)
    vsmUIStore.clearSelection()
  }

  function handleCloseConnectionEditor() {
    vsmUIStore.clearConnectionSelection()
  }

  function handleGlobalKeyDown(e) {
    // Skip undo/redo when focus is in an input or textarea
    const tag = e.target?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      performUndo()
    } else if (
      (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')
    ) {
      e.preventDefault()
      e.stopPropagation()
      performRedo()
    }
  }
</script>

<svelte:window onkeydown={handleGlobalKeyDown} />

{#if !hasVsm}
  <WelcomeScreen />
{:else}
  <SvelteFlowProvider>
    <div class="h-screen flex flex-col bg-gray-100">
      <Header />
      <div class="flex-1 flex overflow-hidden">
        <Sidebar />
        <main class="flex-1 flex flex-col" onclick={handleCanvasClick} onkeydown={handleCanvasKeyDown}>
          <SimulationControls />
          <div class="flex-1 relative">
            <Canvas />
          </div>
          <SimulationPanel />
          <MetricsDashboard />
        </main>
        <EditorPanel
          {selectedStepId}
          {isEditing}
          {selectedConnectionId}
          {isEditingConnection}
          onCloseEditor={handleCloseEditor}
          onCloseConnectionEditor={handleCloseConnectionEditor}
        />
      </div>
    </div>
  </SvelteFlowProvider>
{/if}
