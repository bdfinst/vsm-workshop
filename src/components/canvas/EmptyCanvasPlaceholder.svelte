<script>
  /**
   * EmptyCanvasPlaceholder - Shows guidance when canvas has no steps
   *
   * Replaces GuidanceBanner for empty canvas state. Positioned at
   * CANVAS_RIGHT_X to align with where the first step will appear.
   * Encourages backwards-mapping approach.
   */
</script>

<div
  class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
  data-testid="empty-canvas-placeholder"
>
  <div class="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center max-w-sm">
    <div class="text-4xl mb-3" aria-hidden="true">&#x2190;</div>
    <h3 class="text-lg font-semibold text-slate-700 mb-2">
      Add your first step here
    </h3>
    <p class="text-sm text-slate-500 mb-3">
      Start from the end of your value stream. Add your final delivery step
      first (e.g., "Deploy to Production"), then work backwards to trace
      how value flows from request to delivery.
    </p>
    <p class="text-xs text-slate-400">
      Use the <span class="font-medium">Add Step</span> button in the sidebar to begin.
    </p>
  </div>
</div>
