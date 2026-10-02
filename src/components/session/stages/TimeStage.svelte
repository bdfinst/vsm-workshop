<script>
  import { SvelteSet } from 'svelte/reactivity'
  import PromptCard from '../PromptCard.svelte'
  import DurationInput from '../DurationInput.svelte'
  import {
    STAGE_NUMBER,
    TIME_SOURCE,
    isOutside,
  } from '../../../models/v2/constants.js'
  import { STAGES, timeReason } from '../../../utils/session/stages.js'
  import { stepLabelOf } from '../../../utils/session/stepData.js'
  import { rowModel } from '../../../utils/ui/rowModel.js'

  // TimeStage props: store (the open value stream store), onnext.
  let { store, onnext } = $props()

  const { name: heading, prompt } = STAGES[STAGE_NUMBER.TIME - 1]

  const buttonClass =
    'px-2 py-1 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500'

  const SOURCE_LABELS = {
    [TIME_SOURCE.ESTIMATE]: 'Estimate',
    [TIME_SOURCE.MEASURED]: 'Measured',
  }

  let rows = $derived(
    rowModel(store.activeVersion, store.metrics).steps
  )
  let workdayHours = $derived(store.stream.workdayHours)

  // The fields whose typed text cannot be saved, by "stepId-field". Next waits
  // for all of them, so a value that was refused is never silently skipped.
  const invalidFields = new SvelteSet()

  let nextReason = $derived(timeReason(rows, invalidFields.size > 0))

  const handleValidity = (key) => (isValid) => {
    if (isValid) invalidFields.delete(key)
    else invalidFields.add(key)
  }

  const isSameRange = (a, b) =>
    a?.typ === b.typ && a?.min === b.min && a?.max === b.max

  // One commit is one edit, so one undo step; nothing changed is no edit.
  function handleCommit(row, field, range) {
    if (isSameRange(row[field], range)) return
    store.updateStep(row.id, { [field]: range })
  }

  const otherSource = (source) =>
    source === TIME_SOURCE.MEASURED
      ? TIME_SOURCE.ESTIMATE
      : TIME_SOURCE.MEASURED

  function handleSourceToggle(row) {
    store.updateStep(row.id, { timeSource: otherSource(row.timeSource) })
  }
</script>

{#snippet duration(row, field, testid, label, options = {})}
  <DurationInput
    id="time-{row.id}-{testid}"
    {testid}
    {label}
    {...options}
    value={row[field]}
    {workdayHours}
    oncommit={(range) => handleCommit(row, field, range)}
    onvalidity={handleValidity(`${row.id}-${field}`)}
  />
{/snippet}

<PromptCard
  {heading}
  question={prompt.question}
  explanation={prompt.explanation}
  example={prompt.example}
  {nextReason}
  {onnext}
>
  <div data-testid="time-stage">
    <ol class="grid gap-4" role="list" aria-label="Steps" data-testid="time-list">
      {#each rows as row, index (row.id)}
        {@const stepLabel = stepLabelOf(row.name, index + 1)}
        <li
          class="rounded-lg border border-gray-200 p-4"
          data-step-id={row.id}
          data-testid="time-row"
        >
          {#if isOutside(row)}
            <div
              class="hatch-outside -mx-4 -mt-4 mb-3 h-2 rounded-t-lg"
              aria-hidden="true"
              data-testid="outside-hatch"
            ></div>
          {/if}
          <div class="flex items-center gap-2">
            <h3 class="font-medium" data-testid="time-step-name">
              {stepLabel}
            </h3>
            {#if isOutside(row)}
              <span
                class="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                data-testid="outside-marker"
              >
                outside
              </span>
            {/if}
            <button
              type="button"
              class={buttonClass}
              aria-label="Time source for {stepLabel}: {SOURCE_LABELS[
                row.timeSource
              ]}. Switch to {SOURCE_LABELS[otherSource(row.timeSource)]}"
              data-testid="time-source-button"
              data-source={row.timeSource}
              onclick={() => handleSourceToggle(row)}
            >
              {SOURCE_LABELS[row.timeSource]}
            </button>
          </div>
          <div class="mt-3 grid gap-4">
            {#if isOutside(row)}
              {@render duration(
                row,
                'elapsedTime',
                'elapsed-time',
                'Elapsed time',
                {
                  fieldLabel: 'Elapsed, submitted → returned',
                  positive: true,
                }
              )}
            {:else}
              {@render duration(
                row,
                'processTime',
                'process-time',
                'Process time',
                { showRange: true }
              )}
              {@render duration(row, 'waitTime', 'wait-time', 'Wait time', {
                showRange: true,
              })}
            {/if}
          </div>
        </li>
      {/each}
    </ol>
  </div>
</PromptCard>
