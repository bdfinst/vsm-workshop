<script>
  /**
   * KeyboardShortcutsOverlay - Modal overlay listing keyboard shortcuts
   *
   * Triggered by pressing "?" key. Focus trap: close button receives
   * focus on open. Escape closes (with stopPropagation to avoid
   * bubbling to canvas handlers). Focus is restored to the triggering
   * element on close.
   */

  let { visible = false, onclose, triggerRef = null } = $props()

  let closeButtonRef = $state(null)

  $effect(() => {
    if (visible && closeButtonRef) {
      closeButtonRef.focus()
    }
  })

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      e.preventDefault()
      closeAndRestoreFocus()
    } else if (e.key === 'Tab') {
      // Only one focusable element; keep focus on it
      e.preventDefault()
    }
  }

  function closeAndRestoreFocus() {
    onclose()
    // Restore focus to the element that triggered the overlay
    if (triggerRef) {
      triggerRef.focus()
    }
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      closeAndRestoreFocus()
    }
  }

  const shortcuts = [
    { keys: 'Delete / Backspace', description: 'Remove selected step' },
    { keys: '?', description: 'Show this overlay' },
    { keys: 'Escape', description: 'Close overlay / deselect' },
    { keys: 'Ctrl+Z', description: 'Undo' },
    { keys: 'Ctrl+Shift+Z', description: 'Redo' },
  ]
</script>

{#if visible}
  <div
    class="fixed inset-0 z-80 flex items-center justify-center bg-black/40"
    role="dialog"
    aria-modal="true"
    aria-label="Keyboard shortcuts"
    onkeydown={handleKeydown}
    onclick={handleBackdropClick}
    data-testid="keyboard-shortcuts-overlay"
  >
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-slate-900">Keyboard Shortcuts</h2>
        <button
          bind:this={closeButtonRef}
          onclick={closeAndRestoreFocus}
          class="p-1 text-slate-400 hover:text-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Close keyboard shortcuts"
          data-testid="close-shortcuts-button"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <table class="w-full">
        <thead class="sr-only">
          <tr>
            <th scope="col">Key</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {#each shortcuts as shortcut (shortcut.keys)}
            <tr class="border-t border-slate-100">
              <td class="py-2 pr-4">
                <kbd class="px-2 py-1 text-xs font-mono bg-slate-100 border border-slate-200 rounded text-slate-700">
                  {shortcut.keys}
                </kbd>
              </td>
              <td class="py-2 text-sm text-slate-600">
                {shortcut.description}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}
