<script>
  import { summaryModel } from '../../utils/ui/summaryModel.js'
  import { TONE } from '../../utils/ui/flaggedSteps.js'

  // SummaryStrip props: metrics (`store.metrics`, read as it is, never worked
  // out again) and workdayHours (the stream's working day, for durations).
  // Flow efficiency leads; lead time, process time, rolled %C/A, handoffs and
  // the flagged steps follow. Under 640 px (Tailwind `sm`) only flow efficiency
  // shows until "Show all metrics" is pressed.
  let { metrics, workdayHours } = $props()

  let summary = $derived(summaryModel(metrics, workdayHours))
  let expanded = $state(false)

  const MORE_ID = 'summary-more'
  const FLAG_TEXT_CLASS = {
    [TONE.WARN]: 'text-warn-text',
    [TONE.CRIT]: 'text-crit-text',
  }

  const valueClass = (figure, size) =>
    `${size} font-semibold ${figure.incomplete ? 'text-warn-text' : 'text-map-text'}`
</script>

<section
  class="bg-map-bg border-t border-gray-300 shadow-[0_-2px_6px_rgba(0,0,0,0.08)] px-4 py-3"
  aria-label="Summary"
  data-testid="summary-strip"
>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-8">
    <dl class="m-0">
      <div
        data-testid="summary-{summary.hero.id}"
        data-incomplete={summary.hero.incomplete}
      >
        <dt class="text-sm font-medium text-muted-text">
          {summary.hero.label}
        </dt>
        <dd class="m-0 {valueClass(summary.hero, 'text-3xl')}">
          {summary.hero.text}
        </dd>
        {#if summary.hero.note}
          <dd class="m-0 text-sm text-warn-text">{summary.hero.note}</dd>
        {/if}
        <dd class="m-0 text-sm text-muted-text max-w-sm">
          {summary.hero.context}
        </dd>
      </div>
    </dl>

    <button
      type="button"
      class="sm:hidden self-start px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-expanded={expanded}
      aria-controls={MORE_ID}
      onclick={() => (expanded = !expanded)}
      data-testid="summary-toggle"
    >
      Show all metrics
      <span aria-hidden="true">{expanded ? '▴' : '▾'}</span>
    </button>

    <div
      id={MORE_ID}
      class="{expanded ? 'block' : 'hidden sm:block'} sm:flex-1"
    >
      <dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {#each summary.rows as row (row.id)}
          <div data-testid="summary-{row.id}" data-incomplete={row.incomplete}>
            <dt class="text-sm font-medium text-muted-text">{row.label}</dt>
            <dd class="m-0 {valueClass(row, 'text-xl')}">{row.text}</dd>
            {#if row.note}
              <dd class="m-0 text-sm text-warn-text">{row.note}</dd>
            {/if}
          </div>
        {/each}
      </dl>

      {#if summary.flagged.length > 0}
        <ul
          class="m-0 mt-2 p-0 list-none flex flex-wrap gap-x-6 gap-y-1"
          aria-label="Flagged steps"
        >
          {#each summary.flagged as flag (flag.kind)}
            <li class="text-sm" data-testid="summary-flag">
              <span class="font-medium {FLAG_TEXT_CLASS[flag.tone]}"
                >{flag.label}</span
              >
              <strong class="text-map-text">{flag.name}</strong>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</section>
