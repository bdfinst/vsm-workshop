<script>
  import { DURATION_UNIT } from '../../models/v2/constants.js'
  import {
    durationUnitOf,
    fromMinutes,
    parseDurationRange,
  } from '../../utils/calculations/v2/format.js'

  // DurationInput props: idPrefix (prefix for the DOM ids, unique on the page),
  // testid (prefix for the data-testid attributes), label (what the time is
  // called, for example "Process time"), fieldLabel (what the main field
  // shows instead of the label, when it reads better; the label still names
  // the time in error messages), value ({ typ, min?, max? } in
  // minutes, or null), workdayHours (the length of a working day),
  // mustBePositive (the time must be more than 0, not just 0 or more),
  // showRange (also show the min and max fields), oncommit(range) with the
  // new { typ, min?, max? } in minutes (only { typ } when the range fields are
  // not shown), which returns { ok } (false when the parent refuses the edit,
  // so the text stays for correcting), and
  // onvalidity(isValid), which says whether what is typed can be saved. Text
  // is saved on blur, Enter or a unit change, never per keystroke, so one edit
  // is one undo step. The parent decides whether the range changed.
  let {
    idPrefix,
    testid,
    label,
    fieldLabel = label,
    value = null,
    workdayHours,
    mustBePositive = false,
    showRange = false,
    oncommit,
    onvalidity,
  } = $props()

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent aria-invalid:border-red-500'

  // The unit stays what the person last chose; until then a stored time opens
  // in the unit it reads best in.
  let chosenUnit = $state(null)
  let unit = $derived(chosenUnit ?? durationUnitOf(value?.typ, workdayHours))

  let unitOptions = $derived([
    { value: DURATION_UNIT.MINUTES, label: 'minutes' },
    { value: DURATION_UNIT.HOURS, label: 'hours' },
    { value: DURATION_UNIT.DAYS, label: `working days (${workdayHours} h)` },
  ])

  // Unsaved text, by field, laid over what is stored.
  let drafts = $state({})

  const storedText = (field) =>
    value?.[field] == null
      ? ''
      : String(fromMinutes(value[field], unit, workdayHours))

  const textOf = (field) => drafts[field] ?? storedText(field)

  // Without the range fields, a stored min or max is not shown, so it is not
  // parsed (it could block Next unseen) and not part of what is committed.
  let parsed = $derived(
    parseDurationRange(
      {
        typ: textOf('typ'),
        ...(showRange && { min: textOf('min'), max: textOf('max') }),
      },
      unit,
      workdayHours,
      { label, mustBePositive }
    )
  )
  let errors = $derived(parsed.errors ?? {})
  let isValid = $derived(!parsed.errors)

  $effect(() => {
    onvalidity?.(isValid)
    return () => onvalidity?.(true)
  })

  function handleInput(field, text) {
    if (chosenUnit === null) chosenUnit = unit
    drafts[field] = text
  }

  function handleCommit() {
    if (Object.keys(drafts).length === 0 || !isValid) return
    // Without the range fields the commit is the typical time alone: a hidden
    // min or max is dropped, so the store never refuses over a field the person
    // cannot see.
    const result = oncommit(
      showRange ? parsed.range : { typ: parsed.range.typ }
    )
    if (result.ok) drafts = {}
  }

  function handleUnitChange(event) {
    chosenUnit = event.currentTarget.value
    handleCommit()
  }

  const handleEnter = (event) => {
    if (event.key === 'Enter') handleCommit()
  }
</script>

{#snippet fieldInput(field, labelText, testidSuffix, srPrefix = '')}
  <div>
    <label class="block font-medium" for="{idPrefix}-{field}">
      {#if srPrefix}<span class="sr-only">{srPrefix} </span>{/if}{labelText}
    </label>
    <input
      id="{idPrefix}-{field}"
      type="text"
      inputmode="decimal"
      class={inputClass}
      value={textOf(field)}
      aria-invalid={errors[field] ? 'true' : undefined}
      aria-describedby={errors[field] ? `${idPrefix}-${field}-error` : undefined}
      data-testid="{testid}{testidSuffix}-input"
      oninput={(event) => handleInput(field, event.currentTarget.value)}
      onblur={handleCommit}
      onkeydown={handleEnter}
    />
    {#if errors[field]}
      <p
        id="{idPrefix}-{field}-error"
        role="alert"
        class="mt-1 text-red-700"
        data-testid="{testid}{testidSuffix}-error"
      >
        {errors[field]}
      </p>
    {/if}
  </div>
{/snippet}

<div class="flex flex-wrap items-start gap-4" data-testid={testid}>
  {@render fieldInput('typ', fieldLabel, '')}
  {#if showRange}
    {@render fieldInput('min', 'Min', '-min', label)}
    {@render fieldInput('max', 'Max', '-max', label)}
  {/if}
  <div>
    <label class="block font-medium" for="{idPrefix}-unit">
      <span class="sr-only">{label} </span>Unit
    </label>
    <select
      id="{idPrefix}-unit"
      class={inputClass}
      value={unit}
      data-testid="{testid}-unit-select"
      onchange={handleUnitChange}
    >
      {#each unitOptions as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </div>
</div>
