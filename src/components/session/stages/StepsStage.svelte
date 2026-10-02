<script>
  import { tick } from 'svelte'
  import PromptCard from '../PromptCard.svelte'
  import StepListRow from '../StepListRow.svelte'
  import { STEP_TEMPLATES } from '../../../data/stepTemplates.js'
  import { toastStore } from '../../../stores/toastStore.svelte.js'
  import { STAGES, stepsReason } from '../../../utils/session/stages.js'
  import {
    MOVE_DOWN,
    MOVE_UP,
    movedAnnouncement,
    moveBlockReason,
  } from '../../../utils/session/stepMoves.js'
  import { MOVE_WOULD_POINT_FORWARD_MESSAGE } from '../../../utils/validation/v2/editRules.js'
  import { countReworkPathsOf } from '../../../utils/session/stepData.js'
  import { rowModel } from '../../../utils/ui/rowModel.js'

  // StepsStage props: store (the open value stream store), onnext, and
  // onannounce(text) to say something to screen readers.
  let { store, onnext, onannounce } = $props()

  const { name: heading, prompt } = STAGES[1]

  // A starter suggestion fills in what the template knows: name and description.
  const starterFields = ({ name, description }) => ({ name, description })

  let listElement = $state()

  // Text is saved on blur or Enter, never per keystroke, so one edit is one
  // undo step. Unsaved text is laid over the stored rows.
  let drafts = $state({})
  let rows = $derived(
    rowModel(store.activeVersion, store.metrics).steps.map((row) => ({
      ...row,
      ...drafts[row.id],
    }))
  )

  let reason = $derived(stepsReason(rows))

  function handleInput(stepId, field, text) {
    drafts[stepId] = { ...drafts[stepId], [field]: text }
  }

  function handleCommit(stepId, field) {
    const draft = drafts[stepId]
    if (!draft || !(field in draft)) return
    const { [field]: text, ...rest } = draft
    drafts[stepId] = rest
    const stored = store.activeVersion.steps.find((s) => s.id === stepId)
    const value = text.trim()
    if (stored && value !== stored[field]) {
      clearRefusalWhenOk(store.updateStep(stepId, { [field]: value }))
    }
  }

  function handleHandoff(stepId, isHandoff) {
    clearRefusalWhenOk(store.updateStep(stepId, { isHandoff }))
  }

  const focusName = (item) =>
    item?.querySelector('[data-field="name"]')?.focus()

  // The new step is last in the list; its name is the next thing to type.
  async function addStep(fields) {
    if (!showRefusal(store.addStep(fields))) return
    await tick()
    focusName(listElement.lastElementChild)
  }

  // The new step sits right after the one it was inserted under.
  async function handleInsert(afterStepId) {
    const index = rows.findIndex((row) => row.id === afterStepId)
    if (!showRefusal(store.insertStep(afterStepId, {}))) return
    await tick()
    focusName(listElement.children[index + 1])
  }

  // Why the last change was refused, or null.
  let refusal = $state(null)

  // Show why a refused change was refused; a change that went through clears
  // the last refusal. True when the change went through.
  function showRefusal(result) {
    refusal = result.ok ? null : result.error
    return result.ok
  }

  const clearRefusalWhenOk = (result) => {
    if (result.ok) refusal = null
  }

  // A rework path keeps its direction, so the way out is on the Rework stage.
  const reworkStage = STAGES.find(({ name }) => name === 'Rework').number

  function handleGoToRework() {
    const result = store.goToStage(reworkStage)
    if (!result.ok) refusal = result.error
  }

  // A moved row is a new DOM node, so focus goes back to the control it was on.
  function restoreFocus(stepId, control) {
    const onControl = `[data-control="${control}"], [data-field="${control}"]`
    listElement
      .querySelector(`[data-step-id="${stepId}"] :is(${onControl})`)
      ?.focus()
  }

  async function moveTo(stepId, toIndex, control) {
    if (!showRefusal(store.moveStep(stepId, toIndex))) return
    await tick()
    if (control) restoreFocus(stepId, control)
    onannounce?.(movedAnnouncement(rows[toIndex].name, toIndex))
  }

  const indexOfRow = (stepId) => rows.findIndex((row) => row.id === stepId)

  function handleMove(stepId, direction, control) {
    return moveTo(stepId, indexOfRow(stepId) + direction, control)
  }

  // The dragged step takes the position of the row it is dropped on.
  let draggedId = $state(null)

  function handleDrop(targetId) {
    const stepId = draggedId
    draggedId = null
    if (stepId && stepId !== targetId) moveTo(stepId, indexOfRow(targetId))
  }

  function handleKindChange(stepId, kind) {
    showRefusal(store.switchStepKind(stepId, kind))
  }

  // The Undo toast of the last delete, and the version it was offered on. Any
  // other change, or leaving the stage, closes it: Undo would then undo that
  // change instead of the delete.
  let deleteToast = null

  function closeDeleteToast() {
    if (deleteToast) toastStore.dismiss(deleteToast.id)
    deleteToast = null
  }

  $effect(() => {
    // Read first, so the effect depends on the version even with no toast.
    const version = store.activeVersion
    if (deleteToast && version !== deleteToast.version) closeDeleteToast()
  })

  $effect(() => closeDeleteToast)

  function handleUndoDelete() {
    const result = store.undo()
    if (result.ok) onannounce?.(result.announcement)
  }

  const focusFirstField = (item) => item?.querySelector('input')?.focus()

  // The row that takes the deleted step's place gets focus.
  async function handleDelete(stepId, label) {
    const index = indexOfRow(stepId)
    // A second delete replaces the first Undo, which would otherwise undo this one.
    closeDeleteToast()
    if (!showRefusal(store.deleteStep(stepId))) return
    delete drafts[stepId]
    const action = { label: 'Undo', onclick: handleUndoDelete }
    deleteToast = {
      id: toastStore.add(`${label} deleted`, 'info', undefined, { action }),
      version: store.activeVersion,
    }
    await tick()
    focusFirstField(listElement.children[Math.min(index, rows.length - 1)])
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
  <div data-testid="steps-stage">
    <ol
      class="grid gap-4"
      role="list"
      aria-label="Steps"
      bind:this={listElement}
      data-testid="step-list"
    >
      {#each rows as row, index (row.id)}
        <StepListRow
          {row}
          position={index + 1}
          isIntake={index === 0}
          isLast={index === rows.length - 1}
          oninput={handleInput}
          oncommit={handleCommit}
          onhandoff={handleHandoff}
          onkindchange={handleKindChange}
          ondelete={handleDelete}
          reworkPathCount={countReworkPathsOf(
            store.activeVersion.reworkPaths,
            row.id
          )}
          oninsert={handleInsert}
          onmove={handleMove}
          ondragstart={(stepId) => (draggedId = stepId)}
          ondragend={() => (draggedId = null)}
          ondrop={handleDrop}
          dragging={draggedId !== null}
          moveUpReason={moveBlockReason(index, rows.length, MOVE_UP)}
          moveDownReason={moveBlockReason(index, rows.length, MOVE_DOWN)}
        />
      {/each}
    </ol>
    {#if refusal}
      <p class="mt-4 text-red-700" role="alert" data-testid="move-refusal">
        {refusal}
        {#if refusal === MOVE_WOULD_POINT_FORWARD_MESSAGE}
          <button
            type="button"
            class="underline text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onclick={handleGoToRework}
          >
            Go to the Rework stage
          </button>
        {/if}
      </p>
    {/if}
    <button
      type="button"
      class="mt-4 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      data-testid="add-step-button"
      onclick={() => addStep({})}
    >
      Add step
    </button>
    <div
      class="mt-4 flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Starter suggestions"
      data-testid="starter-suggestions"
    >
      {#each STEP_TEMPLATES as template (template.id)}
        <button
          type="button"
          class="px-3 py-1 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="starter-chip"
          onclick={() => addStep(starterFields(template))}
        >
          {template.name}
        </button>
      {/each}
    </div>
  </div>
</PromptCard>
