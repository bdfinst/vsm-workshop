<script>
  import {
    durationUnitOf,
    fromMinutes,
    parseDurationRange,
  } from '../../utils/calculations/v2/format.js'

  // DurationInput props: id (prefix for the DOM ids, unique on the page),
  // testid (prefix for the data-testid attributes), label (what the time is
  // called, for example "Process time"), value ({ typ, min?, max? } in
  // minutes, or null), workdayHours (the length of a working day),
  // positive (the time must be more than 0, not just 0 or more),
  // showRange (also show the min and max fields), oncommit(range) with the
  // new { typ, min?, max? } in minutes, and onvalidity(isValid), which says
  // whether what is typed can be saved. Text is saved on blur, Enter or a
  // unit change, never per keystroke, so one edit is one undo step. The
  // parent decides whether the range changed.
  let {
    id,
    testid,
    label,
    value = null,
    workdayHours,
    positive = false,
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
    { value: 'minutes', label: 'minutes' },
    { value: 'hours', label: 'hours' },
    { value: 'days', label: `working days (${workdayHours} h)` },
  ])

  // Unsaved text, by field, laid over what is stored.
  let drafts = $state({})

  const storedText = (field) =>
    value?.[field] == null
      ? ''
      : String(fromMinutes(value[field], unit, workdayHours))

  const textOf = (field) => drafts[field] ?? storedText(field)

  let parsed = $derived(
    parseDurationRange(
      { typ: textOf('typ'), min: textOf('min'), max: textOf('max') },
      unit,
      workdayHours,
      { label, positive }
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
    oncommit(parsed.range)
    drafts = {}
  }

  function handleUnitChange(event) {
    chosenUnit = event.currentTarget.value
    handleCommit()
  }

  const handleEnter = (event) => {
    if (event.key === 'Enter') handleCommit()
  }
</script>

{#snippet field(key, text, testidSuffix, srPrefix = '')}
  <div>
    <label class="block font-medium" for="{id}-{key}">
      {#if srPrefix}<span class="sr-only">{srPrefix} </span>{/if}{text}
    </label>
    <input
      id="{id}-{key}"
      type="text"
      inputmode="decimal"
      class={inputClass}
      value={textOf(key)}
      aria-invalid={errors[key] ? 'true' : undefined}
      aria-describedby={errors[key] ? `${id}-${key}-error` : undefined}
      data-testid="{testid}{testidSuffix}-input"
      oninput={(event) => handleInput(key, event.currentTarget.value)}
      onblur={handleCommit}
      onkeydown={handleEnter}
    />
    {#if errors[key]}
      <p
        id="{id}-{key}-error"
        role="alert"
        class="mt-1 text-red-700"
        data-testid="{testid}{testidSuffix}-error"
      >
        {errors[key]}
      </p>
    {/if}
  </div>
{/snippet}

<div class="flex flex-wrap items-start gap-4" data-testid={testid}>
  {@render field('typ', label, '')}
  {#if showRange}
    {@render field('min', 'Min', '-min', label)}
    {@render field('max', 'Max', '-max', label)}
  {/if}
  <div>
    <label class="block font-medium" for="{id}-unit">
      <span class="sr-only">{label} </span>Unit
    </label>
    <select
      id="{id}-unit"
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
