<script>
  import { tick } from 'svelte'
  import { STEP_KIND, isOutside } from '../../models/v2/constants.js'
  import {
    deleteConfirmMessage,
    hasTimeData,
    kindSwitchMessage,
    needsDeleteConfirm,
  } from '../../utils/session/stepData.js'
  import { MOVE_DOWN, MOVE_UP } from '../../utils/session/stepMoves.js'
  import ConfirmPopover from '../ui/ConfirmPopover.svelte'

  // StepListRow props: row (a step row from rowModel, with any unsaved text
  // laid over it), position (1-based), isIntake, oninput(stepId, field, text)
  // and oncommit(stepId, field) for the text fields, onhandoff(stepId, checked),
  // isLast, oninsert(stepId) to add a step right after this one, and
  // onmove(stepId, direction, control) for a step to move up (-1) or down (1);
  // `control` names the control to keep focus on. moveUpReason and
  // moveDownReason say why a move is unavailable, or are null when it works.
  // ondragstart(stepId), ondragend() and ondrop(stepId) report a drag of this
  // row's handle, and a drop on this row; `dragging` is true while any row is
  // being dragged. onkindchange(stepId, kind) switches
  // the step between team and outside; a switch that would clear a time asks
  // first. reworkPathCount is how many rework paths start or end at this step,
  // and ondelete(stepId, label) deletes it; a step with data or paths asks first.
  let {
    row,
    position,
    isIntake = false,
    isLast = false,
    oninput,
    oncommit,
    onhandoff,
    oninsert,
    onmove,
    moveUpReason = null,
    moveDownReason = null,
    ondragstart,
    ondragend,
    ondrop,
    dragging = false,
    onkindchange,
    reworkPathCount = 0,
    ondelete,
  } = $props()

  const stepLabel = $derived(row.name.trim() || `step ${position}`)

  let isNameMissing = $derived(!isIntake && row.name.trim() === '')

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  const checkboxClass =
    'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500'

  const buttonClass =
    'px-2 py-1 text-sm bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 aria-disabled:opacity-50 aria-disabled:cursor-not-allowed'

  const KEY_DIRECTIONS = { ArrowUp: MOVE_UP, ArrowDown: MOVE_DOWN }

  // The control a key press came from: a button, or a text field.
  const controlOf = ({ dataset }) => dataset.control ?? dataset.field

  // Alt+Up and Alt+Down act as the Move buttons, from any control in the row.
  const handleKeydown = (event) => {
    const direction = KEY_DIRECTIONS[event.key]
    if (!event.altKey || direction === undefined || isIntake) return
    event.preventDefault()
    const reason = direction === MOVE_UP ? moveUpReason : moveDownReason
    if (!reason) onmove(row.id, direction, controlOf(event.target))
  }

  // The whole row follows the pointer, not just the small handle.
  const handleDragStart = (event) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', row.id)
    event.dataTransfer.setDragImage(event.currentTarget.closest('li'), 0, 0)
    ondragstart(row.id)
  }

  // Only a row being dragged is accepted; text dropped into a field is not.
  const handleDragOver = (event) => {
    if (dragging) event.preventDefault()
  }

  const handleDrop = (event) => {
    if (!dragging) return
    event.preventDefault()
    ondrop(row.id)
  }

  const handleEnter = (event, field) => {
    if (event.key === 'Enter') oncommit(row.id, field)
  }

  const CONFIRM_KIND = 'kind'
  const CONFIRM_DELETE = 'delete'

  // Which question is open on this row, or null.
  let confirming = $state(null)
  let itemElement = $state()

  const otherKind = $derived(
    isOutside(row) ? STEP_KIND.TEAM : STEP_KIND.OUTSIDE
  )

  // The control that opened the question gets focus back when it closes.
  async function closeConfirm(control) {
    confirming = null
    await tick()
    itemElement?.querySelector(`[data-control="${control}"]`)?.focus()
  }

  function handleKindToggle(event) {
    const box = event.currentTarget
    if (hasTimeData(row)) confirming = CONFIRM_KIND
    else onkindchange(row.id, otherKind)
    // The box shows what the store holds: unchanged until a switch is
    // confirmed, and unchanged if the store refuses it.
    box.checked = isOutside(row)
  }

  function handleKindConfirm() {
    onkindchange(row.id, otherKind)
    closeConfirm('outside')
  }

  function handleDeleteClick() {
    if (needsDeleteConfirm(row, reworkPathCount)) confirming = CONFIRM_DELETE
    else ondelete(row.id, stepLabel)
  }

  function handleDeleteConfirm() {
    confirming = null
    ondelete(row.id, stepLabel)
  }
</script>

{#snippet textField(field, label, testid, error = null)}
  <div>
    <label class="block font-medium" for="step-{row.id}-{field}">{label}</label>
    <input
      id="step-{row.id}-{field}"
      type="text"
      class={inputClass}
      value={row[field]}
      data-field={field}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `step-${row.id}-${field}-error` : undefined}
      data-testid={testid}
      oninput={(event) => oninput(row.id, field, event.currentTarget.value)}
      onblur={() => oncommit(row.id, field)}
      onkeydown={(event) => handleEnter(event, field)}
    />
    {#if error}
      <p
        id="step-{row.id}-{field}-error"
        class="mt-1 text-red-700"
        data-testid="step-{field}-error"
      >
        {error}
      </p>
    {/if}
  </div>
{/snippet}

{#snippet moveButton(name, label, direction, reason)}
  <button
    type="button"
    class={buttonClass}
    aria-label="{label} {stepLabel}"
    aria-disabled={reason ? 'true' : undefined}
    aria-describedby={reason ? `step-${row.id}-move-${name}-reason` : undefined}
    data-control="move-{name}"
    data-testid="move-{name}-button"
    onclick={(event) =>
      reason || onmove(row.id, direction, event.currentTarget.dataset.control)}
  >
    {label}
  </button>
  {#if reason}
    <span id="step-{row.id}-move-{name}-reason" class="sr-only">{reason}</span>
  {/if}
{/snippet}

<li
  class="rounded-lg border border-gray-200 p-4"
  data-step-id={row.id}
  data-testid="step-row"
  data-position={position}
  bind:this={itemElement}
  onkeydown={handleKeydown}
  ondragover={handleDragOver}
  ondrop={handleDrop}
>
  {#if isOutside(row)}
    <div
      class="hatch-outside -mx-4 -mt-4 mb-3 h-2 rounded-t-lg"
      aria-hidden="true"
      data-testid="outside-hatch"
    ></div>
  {/if}
  <div class="flex items-center gap-2">
    <span class="font-semibold" aria-hidden="true">{position}</span>
    {#if isIntake}
      <span class="font-medium" data-testid="step-name">{row.name}</span>
      <span
        class="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
        data-testid="always-first-marker"
      >
        Always first
      </span>
    {:else}
      <div class="flex-1">
        {@render textField(
          'name',
          'Name',
          'step-name-input',
          isNameMissing ? 'Name required' : null
        )}
      </div>
      {#if isOutside(row)}
        <span
          class="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
          data-testid="outside-marker"
        >
          outside
        </span>
      {/if}
    {/if}
    {#if !isIntake}
      <span
        class="cursor-grab select-none px-1 text-gray-500"
        draggable="true"
        aria-hidden="true"
        data-testid="drag-handle"
        ondragstart={handleDragStart}
        ondragend={() => ondragend()}
      >
        &#10303;
      </span>
      {@render moveButton('up', 'Move up', MOVE_UP, moveUpReason)}
      {@render moveButton('down', 'Move down', MOVE_DOWN, moveDownReason)}
    {/if}
  </div>
  <div class="mt-3 grid gap-4 md:grid-cols-2">
    {@render textField('description', 'Description', 'step-description-input')}
    {@render textField('performedBy', 'Performed by', 'step-performer-input')}
  </div>
  <div class="mt-3 flex flex-wrap items-center gap-4">
    <label class="inline-flex items-center gap-2">
      <input
        type="checkbox"
        class={checkboxClass}
        checked={row.isHandoff}
        disabled={isOutside(row)}
        data-control="handoff"
        data-testid="step-handoff-checkbox"
        onchange={(event) => onhandoff(row.id, event.currentTarget.checked)}
      />
      Handed off to another team
    </label>
    {#if !isIntake}
      <div class="relative">
        <label class="inline-flex items-center gap-2">
          <input
            type="checkbox"
            class={checkboxClass}
            checked={isOutside(row)}
            data-control="outside"
            data-testid="step-outside-checkbox"
            onchange={handleKindToggle}
          />
          Outside team
        </label>
        {#if confirming === CONFIRM_KIND}
          <ConfirmPopover
            message={kindSwitchMessage(stepLabel, otherKind)}
            confirmLabel="Switch"
            onconfirm={handleKindConfirm}
            oncancel={() => closeConfirm('outside')}
          />
        {/if}
      </div>
      <div class="relative">
        <button
          type="button"
          class={buttonClass}
          aria-label="Delete {stepLabel}"
          aria-haspopup="dialog"
          data-control="delete"
          data-testid="delete-step-button"
          onclick={handleDeleteClick}
        >
          Delete
        </button>
        {#if confirming === CONFIRM_DELETE}
          <ConfirmPopover
            message={deleteConfirmMessage(stepLabel, reworkPathCount)}
            onconfirm={handleDeleteConfirm}
            oncancel={() => closeConfirm('delete')}
          />
        {/if}
      </div>
    {/if}
  </div>
  {#if !isLast}
    <button
      type="button"
      class="mt-3 w-full px-3 py-1 text-sm text-gray-700 border border-dashed border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label="Insert step here, after {stepLabel}"
      data-control="insert"
      data-testid="insert-step-button"
      onclick={() => oninsert(row.id)}
    >
      Insert step here
    </button>
  {/if}
</li>
