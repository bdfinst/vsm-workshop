<script>
  import { SvelteMap, SvelteSet } from 'svelte/reactivity'
  import PromptCard from '../PromptCard.svelte'
  import DurationInput from '../DurationInput.svelte'
  import {
    STAGE_NUMBER,
    TIME_SOURCE,
    isOutside,
  } from '../../../models/v2/constants.js'
  import { STAGES, timeReason } from '../../../utils/session/stages.js'
  import { stepLabelOf } from '../../../utils/session/stepData.js'
  import { timeFieldsOf } from '../../../models/v2/step.js'
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

  const keyOf = (row, field) => `${row.id}-${field}`

  // The fields whose typed text cannot be saved, by "stepId-field".
  const invalidFields = new SvelteSet()

  // Why the store refused each field's last edit, by the same key, as
  // { message, holdsNext }. A refused time field keeps its text, so it stays
  // here, and holds Next, until that same field saves; another field saving
  // does not clear it. A refused source switch has no text to save, so it
  // shows but never holds Next.
  const refusals = new SvelteMap()

  // The keys of the fields and source buttons on show. A refusal for anything
  // else (its step was removed, or switched to the other kind) is dropped, so
  // it neither shows nor holds Next.
  let shownKeys = $derived(
    new Set(
      rows.flatMap((row) => [
        keyOf(row, 'timeSource'),
        ...timeFieldsOf(row.kind).map((field) => keyOf(row, field)),
      ])
    )
  )

  $effect(() => {
    for (const key of [...refusals.keys()]) {
      if (!shownKeys.has(key)) refusals.delete(key)
    }
  })

  // Next waits for every field that cannot be saved, so a value that was
  // refused is never silently skipped.
  let nextReason = $derived(
    timeReason(
      rows,
      invalidFields.size > 0 || [...refusals.values()].some((r) => r.holdsNext)
    )
  )

  const createValidityHandler = (key) => (isValid) => {
    if (isValid) invalidFields.delete(key)
    else invalidFields.add(key)
  }

  // A value that was never entered is the same whether stored as a missing
  // field, null or undefined.
  const isSameRange = (stored, entered) =>
    ['typ', 'min', 'max'].every(
      (field) => (stored?.[field] ?? null) === (entered[field] ?? null)
    )

  // Show why a refused edit was refused, until that field is saved. Returns the
  // result, so the field knows whether to keep its text.
  function showRefusal(key, result, holdsNext = true) {
    if (result.ok) refusals.delete(key)
    else refusals.set(key, { message: result.error, holdsNext })
    return result
  }

  // One commit is one edit, so one undo step; nothing changed is no edit.
  function handleCommit(row, field, range) {
    const key = keyOf(row, field)
    if (isSameRange(row[field], range)) return showRefusal(key, { ok: true })
    return showRefusal(key, store.updateStep(row.id, { [field]: range }))
  }

  const otherSource = (source) =>
    source === TIME_SOURCE.MEASURED
      ? TIME_SOURCE.ESTIMATE
      : TIME_SOURCE.MEASURED

  function handleSourceToggle(row) {
    showRefusal(
      keyOf(row, 'timeSource'),
      store.updateStep(row.id, { timeSource: otherSource(row.timeSource) }),
      false
    )
  }
</script>

{#snippet duration(row, field, testid, label, options = {})}
  <DurationInput
    idPrefix="time-{row.id}-{testid}"
    {testid}
    {label}
    {...options}
    value={row[field]}
    {workdayHours}
    oncommit={(range) => handleCommit(row, field, range)}
    onvalidity={createValidityHandler(keyOf(row, field))}
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
                  mustBePositive: true,
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
    {#each [...refusals] as [key, { message }] (key)}
      <p class="mt-4 text-red-700" role="alert" data-testid="time-refusal">
        {message}
      </p>
    {/each}
  </div>
</PromptCard>
