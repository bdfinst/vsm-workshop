<script>
  import { SvelteFlowProvider } from '@xyflow/svelte'
  import { vsmDataStore } from './stores/vsmDataStore.svelte.js'
  import { vsmUIStore } from './stores/vsmUIStore.svelte.js'
  import Header from './components/ui/Header.svelte'
  import Canvas from './components/canvas/Canvas.svelte'
  import Sidebar from './components/ui/Sidebar.svelte'
  import MetricsDashboard from './components/metrics/MetricsDashboard.svelte'
  import WelcomeScreen from './components/ui/WelcomeScreen.svelte'
  import EditorPanel from './components/ui/EditorPanel.svelte'
  import SimulationPanel from './components/ui/SimulationPanel.svelte'
  import SimulationControls from './components/simulation/SimulationControls.svelte'
  import KeyboardShortcutsOverlay from './components/ui/KeyboardShortcutsOverlay.svelte'

  // Keyboard shortcuts overlay (local state per D5)
  let showShortcuts = $state(false)

  function handleGlobalKeydown(e) {
    // Do not fire when typing in inputs/textareas/selects
    const tag = e.target?.tagName?.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return
    if (e.target?.isContentEditable) return

    if (e.key === '?') {
      e.preventDefault()
      showShortcuts = true
    }
  }

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
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<KeyboardShortcutsOverlay visible={showShortcuts} onclose={() => { showShortcuts = false }} />

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
