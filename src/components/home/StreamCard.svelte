<script>
  import { tick } from 'svelte'
  import { isBlankName, normalizeName } from '../../models/v2/valueStream.js'
  import { controlSelector, focusControl } from '../../utils/session/focus.js'
  import StreamMenu from './StreamMenu.svelte'

  // StreamCard props: summary (from streamSummary), onopen(), onrename(name)
  // returning { ok, error }, onduplicate(), ondelete() (already confirmed) and
  // onexport(), all required.
  let { summary, onopen, onrename, onduplicate, ondelete, onexport } = $props()

  let detailsId = $derived(`stream-${summary.id}-details`)
  let nameFieldId = $derived(`stream-${summary.id}-name`)
  let errorId = $derived(`stream-${summary.id}-name-error`)

  let item = $state()
  let renaming = $state(false)
  let draft = $state('')
  let renameError = $state(null)
  let nameInput = $state()

  // The link stays a real link (so it can be opened in a new tab and is announced as
  // one), but a plain click opens the stream in this page.
  function handleClick(event) {
    event.preventDefault()
    onopen()
  }

  async function startRename() {
    draft = summary.rawName
    renameError = null
    renaming = true
    await tick()
    nameInput?.select()
  }

  // The menu button is where the rename was asked from, so focus goes back to it.
  async function endRename() {
    renaming = false
    renameError = null
    await tick()
    focusControl(item, controlSelector('menu-button'))
  }

  // Saving the name as it already is changes nothing: no new "updated" time and
  // no lost undo history, and an unnamed stream stays unnamed.
  function handleRenameSubmit(event) {
    event.preventDefault()
    if (normalizeName(draft) === normalizeName(summary.rawName)) {
      endRename()
      return
    }
    const result = onrename(draft)
    if (result.ok) endRename()
    else renameError = result.error
  }

  function handleRenameKeydown(event) {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    endRename()
  }
</script>

<!-- The right padding leaves room for the menu button, a sibling of the link. -->
<li
  class="relative bg-white rounded-lg shadow-md p-4 pr-14 hover:bg-gray-50"
  data-testid="stream-card"
  data-stream-id={summary.id}
  bind:this={item}
>
  <h2 class="font-semibold">
    <a
      href="#{summary.id}"
      class="text-blue-700 underline after:absolute after:inset-0 focus:outline-none focus:after:ring-2 focus:after:ring-blue-500 focus:after:rounded-lg"
      aria-describedby={detailsId}
      data-control="open-stream"
      data-testid="stream-card-link"
      onclick={handleClick}
    >
      {summary.name}
    </a>
  </h2>
  <p id={detailsId} class="mt-1 text-sm text-gray-600">
    <span data-testid="stream-card-steps">{summary.steps}</span>
    <span aria-hidden="true">&middot;</span>
    <span data-testid="stream-card-stage">
      Furthest stage: {summary.furthestStage}
    </span>
    {#if summary.updated}
      <span aria-hidden="true">&middot;</span>
      <span data-testid="stream-card-updated">{summary.updated}</span>
    {/if}
    {#if summary.created}
      <span aria-hidden="true">&middot;</span>
      <span data-testid="stream-card-created">{summary.created}</span>
    {/if}
  </p>
  {#if renaming}
    <form
      class="relative z-10 mt-3 flex flex-wrap items-end gap-2"
      data-testid="rename-form"
      onsubmit={handleRenameSubmit}
    >
      <div class="flex-1 min-w-48">
        <label class="block font-medium" for={nameFieldId}>
          Value stream name
        </label>
        <input
          id={nameFieldId}
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          bind:value={draft}
          bind:this={nameInput}
          placeholder={isBlankName(summary.rawName) ? summary.name : undefined}
          aria-invalid={renameError ? 'true' : undefined}
          aria-describedby={renameError ? errorId : undefined}
          data-testid="rename-input"
          onkeydown={handleRenameKeydown}
        />
        {#if renameError}
          <p
            id={errorId}
            class="mt-1 text-red-700"
            role="alert"
            data-testid="rename-error"
          >
            {renameError}
          </p>
        {/if}
      </div>
      <button
        type="submit"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        data-testid="rename-save-button"
        onkeydown={handleRenameKeydown}
      >
        Save
      </button>
      <button
        type="button"
        class="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        data-testid="rename-cancel-button"
        onkeydown={handleRenameKeydown}
        onclick={endRename}
      >
        Cancel
      </button>
    </form>
  {/if}
  <StreamMenu
    name={summary.name}
    onrename={startRename}
    {onduplicate}
    {ondelete}
    {onexport}
  />
</li>
