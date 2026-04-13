<script>
  /**
   * ConfirmPopover - Inline confirmation dialog
   * Replaces native confirm() with a non-blocking popover.
   * Position: absolute (z-60) relative to trigger parent (per D8).
   */
  let { message = 'Are you sure?', onconfirm, oncancel } = $props()
</script>

<div
  class="absolute bottom-full left-0 mb-2 z-[60] w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-3"
  data-testid="confirm-popover"
  role="alertdialog"
  aria-label={message}
>
  <p class="text-sm text-gray-700 mb-3">{message}</p>
  <div class="flex gap-2 justify-end">
    <button
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
      Delete
    </button>
  </div>
</div>
