<script>
  import { toastStore } from '../../stores/toastStore.svelte.js'

  const typeStyles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
  }

  const iconMap = {
    info: '\u2139\ufe0f',
    error: '\u274c',
    success: '\u2705',
    warning: '\u26a0\ufe0f',
  }
</script>

{#if toastStore.messages.length > 0}
  <div
    class="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 max-w-sm"
    data-testid="toast-container"
  >
    {#each toastStore.messages as toast (toast.id)}
      <div
        class="flex items-start gap-2 p-3 border rounded-lg shadow-md {typeStyles[toast.type] || typeStyles.info}"
        data-testid="toast-message"
        role={toast.type === 'error' ? 'alert' : 'status'}
        aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
        aria-atomic="true"
      >
        <span class="flex-shrink-0" aria-hidden="true">
          {iconMap[toast.type] || iconMap.info}
        </span>
        <p class="flex-1 text-sm">{toast.text}</p>
        <button
          onclick={() => toastStore.dismiss(toast.id)}
          class="flex-shrink-0 text-gray-400 hover:text-gray-600 p-0.5"
          aria-label="Dismiss notification"
          data-testid="toast-dismiss-button"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    {/each}
  </div>
{/if}
