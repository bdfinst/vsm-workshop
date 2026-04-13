<script>
  /**
   * ConfirmPopover - Inline confirmation dialog
   * Replaces native confirm() with a non-blocking popover.
   * Position: absolute (z-60) relative to trigger parent (per D8).
   *
   * Accessibility:
   * - Focus moves to Cancel button on mount (safer default for destructive actions)
   * - Escape key dismisses via oncancel
   * - Focus is trapped between Cancel and confirm buttons
   */
  let { message = 'Are you sure?', confirmLabel = 'Delete', onconfirm, oncancel } = $props()

  let cancelButtonRef = $state(null)

  $effect(() => {
    if (cancelButtonRef) {
      cancelButtonRef.focus()
    }
  })

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      oncancel()
    } else if (e.key === 'Tab') {
      // Trap focus between the two buttons
      const focusable = [cancelButtonRef, cancelButtonRef?.nextElementSibling].filter(Boolean)
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
  }
</script>

<div
  class="absolute bottom-full left-0 mb-2 z-[60] w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-3"
  data-testid="confirm-popover"
  role="alertdialog"
  aria-labelledby="confirm-popover-message"
  onkeydown={handleKeydown}
>
  <p id="confirm-popover-message" class="text-sm text-gray-700 mb-3">{message}</p>
  <div class="flex gap-2 justify-end">
    <button
      bind:this={cancelButtonRef}
      onclick={oncancel}
      class="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      data-testid="confirm-popover-cancel"
    >
      Cancel
    </button>
    <button
      onclick={onconfirm}
      class="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
      data-testid="confirm-popover-confirm"
    >
      {confirmLabel}
    </button>
  </div>
</div>
