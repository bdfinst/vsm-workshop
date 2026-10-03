<script>
  import PromptCard from '../PromptCard.svelte'
  import { STAGE_NUMBER, UNIT_OF_WORK } from '../../../models/v2/constants.js'
  import { isUnnamed } from '../../../models/v2/valueStream.js'
  import {
    STAGES,
    missingScopeFields,
    scopeReason,
  } from '../../../utils/session/stages.js'
  import { validateScope } from '../../../utils/validation/v2/scopeValidator.js'

  // ScopeStage props: store (the open value stream store), onnext.
  let { store, onnext } = $props()

  const { name: heading, prompt } = STAGES[STAGE_NUMBER.SCOPE - 1]

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  // The value stream's name is not here: it is edited in the header, once.
  const TEXT_FIELDS = [
    {
      key: 'trigger',
      id: 'scope-trigger',
      label: 'Trigger',
      testid: 'trigger-input',
    },
    {
      key: 'endPoint',
      id: 'scope-end-point',
      label: 'End point',
      testid: 'end-point-input',
    },
  ]
  const UNIT_OPTIONS = [
    { value: UNIT_OF_WORK.STORY, label: 'Story' },
    { value: UNIT_OF_WORK.FEATURE, label: 'Feature' },
    { value: UNIT_OF_WORK.DEFECT, label: 'Defect' },
  ]

  // Text is saved on blur or Enter, never per keystroke, so one edit is one
  // undo step. The gate reads what is typed, so Next is ready as soon as the
  // last field is filled.
  let textDrafts = $state({})
  let workdayDraft = $state(null)

  let stream = $derived(store.stream)
  let reason = $derived(
    scopeReason(missingScopeFields({ ...stream, ...textDrafts }))
  )
  let workdayError = $derived(
    workdayDraft === null
      ? null
      : (validateScope({ workdayHours: Number(workdayDraft) }).errors
          .workdayHours ?? null)
  )

  function commitText(key) {
    if (!(key in textDrafts)) return
    store.setScope({ [key]: textDrafts[key] })
    delete textDrafts[key]
  }

  function commitWorkday() {
    if (workdayDraft === null || workdayError) return
    store.setScope({ workdayHours: Number(workdayDraft) })
    workdayDraft = null
  }

  function handleEnter(event, commit) {
    if (event.key === 'Enter') commit()
  }
</script>

<PromptCard
  {heading}
  question={prompt.question}
  explanation={prompt.explanation}
  example={prompt.example}
  nextReason={reason}
  {onnext}
>
  {#if isUnnamed(stream)}
    <p class="mb-4 text-gray-700" data-testid="scope-name-hint">
      Name this value stream in the header.
    </p>
  {/if}
  <div class="grid gap-4 md:grid-cols-2" data-testid="scope-stage">
    {#each TEXT_FIELDS as field (field.key)}
      <div>
        <label class="block font-medium" for={field.id}>{field.label}</label>
        <input
          id={field.id}
          type="text"
          aria-required="true"
          class={inputClass}
          value={textDrafts[field.key] ?? stream[field.key]}
          data-testid={field.testid}
          oninput={(event) => (textDrafts[field.key] = event.currentTarget.value)}
          onblur={() => commitText(field.key)}
          onkeydown={(event) =>
            handleEnter(event, () => commitText(field.key))}
        />
      </div>
    {/each}

    <div>
      <label class="block font-medium" for="scope-unit-of-work">
        Unit of work
      </label>
      <select
        id="scope-unit-of-work"
        aria-required="true"
        class={inputClass}
        value={stream.unitOfWork ?? ''}
        data-testid="unit-of-work-select"
        onchange={(event) =>
          store.setScope({ unitOfWork: event.currentTarget.value })}
      >
        <option value="" disabled>Choose a unit of work</option>
        {#each UNIT_OPTIONS as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>

    <div>
      <label class="block font-medium" for="scope-working-day">
        Working day (hours)
      </label>
      <input
        id="scope-working-day"
        type="number"
        step="0.5"
        class={inputClass}
        value={workdayDraft ?? stream.workdayHours}
        aria-invalid={workdayError ? 'true' : undefined}
        aria-describedby={workdayError ? 'working-day-error' : undefined}
        data-testid="working-day-input"
        oninput={(event) => (workdayDraft = event.currentTarget.value)}
        onblur={commitWorkday}
        onkeydown={(event) => handleEnter(event, commitWorkday)}
      />
      {#if workdayError}
        <p
          id="working-day-error"
          role="alert"
          class="mt-1 text-red-700"
          data-testid="working-day-error"
        >
          {workdayError}
        </p>
      {/if}
    </div>
  </div>
</PromptCard>
