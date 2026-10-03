<script>
  // SummaryFigure props, drawn inside a <dl>: figure (one figure of
  // `summaryModel`: id, label, text, incomplete, note and, for the hero only,
  // context) and size (the Tailwind text size of the value). An incomplete
  // figure is written in the warning colour and names the step it needs.
  let { figure, size } = $props()
</script>

<div data-testid="summary-{figure.id}" data-incomplete={figure.incomplete}>
  <dt class="text-sm font-medium text-muted-text">{figure.label}</dt>
  <dd
    class="m-0 {size} font-semibold {figure.incomplete
      ? 'text-warn-text'
      : 'text-map-text'}"
  >
    {figure.text}
  </dd>
  {#if figure.note}
    <dd class="m-0 text-sm text-warn-text">{figure.note}</dd>
  {/if}
  {#if figure.context}
    <dd class="m-0 text-sm text-muted-text max-w-sm">{figure.context}</dd>
  {/if}
</div>
