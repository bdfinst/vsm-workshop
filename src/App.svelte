<script>
  import { SvelteFlowProvider } from '@xyflow/svelte'
  import { vsmDataStore } from './stores/vsmDataStore.svelte.js'
  import { vsmUIStore } from './stores/vsmUIStore.svelte.js'
  import { performUndo, performRedo } from './utils/undoHelper.js'
  import Header from './components/ui/Header.svelte'
  import Canvas from './components/canvas/Canvas.svelte'
  import CanvasTotalsBar from './components/canvas/CanvasTotalsBar.svelte'
  import Sidebar from './components/ui/Sidebar.svelte'
  import MetricsDashboard from './components/metrics/MetricsDashboard.svelte'
  import CdReadinessScorecard from './components/metrics/CdReadinessScorecard.svelte'
  import WaitTimeWaterfall from './components/metrics/WaitTimeWaterfall.svelte'
  import RecommendationsPanel from './components/metrics/RecommendationsPanel.svelte'
  import WipLeversPanel from './components/metrics/WipLeversPanel.svelte'
  import MonteCarloPanel from './components/metrics/MonteCarloPanel.svelte'
  import DoraPanel from './components/metrics/DoraPanel.svelte'
  import AnnotationsPanel from './components/metrics/AnnotationsPanel.svelte'
  import FutureStatePanel from './components/metrics/FutureStatePanel.svelte'
  import ImportEventLog from './components/io/ImportEventLog.svelte'
  import WelcomeScreen from './components/ui/WelcomeScreen.svelte'
  import EditorPanel from './components/ui/EditorPanel.svelte'
  import SimulationPanel from './components/ui/SimulationPanel.svelte'
  import SimulationControls from './components/simulation/SimulationControls.svelte'
  import Toast from './components/ui/Toast.svelte'
  import KeyboardShortcutsOverlay from './components/ui/KeyboardShortcutsOverlay.svelte'

  // Off-canvas sidebar drawer (small screens)
  let sidebarOpen = $state(false)

  // Keyboard shortcuts overlay (local state per D5)
  let showShortcuts = $state(false)
  // Capture the element that had focus when the overlay was opened so we can restore it on close
  let shortcutsTriggerRef = $state(null)

  function handleGlobalKeyDown(e) {
    const tag = e.target?.tagName?.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return
    if (e.target?.isContentEditable) return

    // Undo/Redo shortcuts
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

    // Keyboard shortcuts overlay
    if (e.key === '?') {
      e.preventDefault()
      shortcutsTriggerRef = document.activeElement
      showShortcuts = true
    }
  }

  // Reactive derived values from stores
  let hasVsm = $derived(vsmDataStore.id !== null)
  let selectedStepId = $derived(vsmUIStore.selectedStepId)
  let isEditing = $derived(vsmUIStore.isEditing)
  let selectedConnectionId = $derived(vsmUIStore.selectedConnectionId)
  let isEditingConnection = $derived(vsmUIStore.isEditingConnection)
  let editorOpen = $derived(
    (selectedStepId && isEditing) || (selectedConnectionId && isEditingConnection)
  )

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

<Toast />
<svelte:window onkeydown={handleGlobalKeyDown} />

<KeyboardShortcutsOverlay visible={showShortcuts} triggerRef={shortcutsTriggerRef} onclose={() => { showShortcuts = false }} />
{#if !hasVsm}
  <WelcomeScreen />
{:else}
  <SvelteFlowProvider>
    <div class="h-screen flex flex-col bg-gray-100">
      <Header onMenuClick={() => (sidebarOpen = !sidebarOpen)} />
      <div class="flex-1 flex overflow-hidden relative">
        <!-- Backdrop for the mobile sidebar drawer -->
        {#if sidebarOpen}
          <button
            type="button"
            class="fixed inset-0 z-30 bg-black/30 lg:hidden"
            aria-label="Close menu"
            onclick={() => (sidebarOpen = false)}
          ></button>
        {/if}

        <!-- Sidebar: static on desktop, slide-in drawer on phone/tablet -->
        <div
          class="fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 {sidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'}"
        >
          <Sidebar onNavigate={() => (sidebarOpen = false)} />
        </div>

        <main
          class="flex-1 flex flex-col overflow-y-auto"
          onclick={handleCanvasClick}
          onkeydown={handleCanvasKeyDown}
        >
          <SimulationControls />
          <!-- Diagram gets a generous, fixed share of the viewport so it stays
               usable on small screens; the totals bar stays overlaid. -->
          <div class="relative shrink-0 h-[60vh] min-h-[320px] lg:h-[70vh]">
            <CanvasTotalsBar />
            <Canvas />
          </div>
          <SimulationPanel />
          <MetricsDashboard />
          <WaitTimeWaterfall />
          <CdReadinessScorecard />
          <RecommendationsPanel />
          <WipLeversPanel />
          <MonteCarloPanel />
          <DoraPanel />
          <AnnotationsPanel />
          <FutureStatePanel />
          <ImportEventLog />
        </main>

        <!-- Editor: side panel on desktop, bottom sheet on phone/tablet -->
        {#if editorOpen}
          <div
            class="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto bg-white shadow-2xl lg:static lg:inset-auto lg:max-h-none lg:overflow-visible lg:shadow-none"
          >
            <EditorPanel
              {selectedStepId}
              {isEditing}
              {selectedConnectionId}
              {isEditingConnection}
              onCloseEditor={handleCloseEditor}
              onCloseConnectionEditor={handleCloseConnectionEditor}
            />
          </div>
        {/if}
      </div>
    </div>
  </SvelteFlowProvider>
{/if}
