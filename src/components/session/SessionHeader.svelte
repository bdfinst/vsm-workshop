<script>
  import { tick } from 'svelte'
  import { workspaceStore } from '../../stores/v2/workspaceStore.svelte.js'
  import { toastStore, TOAST_TYPE } from '../../stores/toastStore.svelte.js'
  import { focusUpgradeNotice } from '../../utils/session/focus.js'
  import { showUpgradeNotice } from '../../utils/session/upgradeNotice.js'
  import {
    exportStreamFile,
    importStreamFile,
  } from '../../utils/ui/streamFiles.js'

  // SessionHeader props: store (the open value stream store), onundo, onredo.
  let { store, onundo, onredo } = $props()

  const buttonClass =
    'px-3 py-1 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 aria-disabled:opacity-50 aria-disabled:cursor-not-allowed'

  // The name is saved on blur or Enter, never per keystroke, so one edit is one undo step.
  let draft = $state(null)
  // Set when the name was refused (blank); the field then shows the stored name.
  let nameError = $state('')
  let nameInput = $state()
  let name = $derived(draft ?? store.stream.name)
  let label = $derived(store.activeVersion.label)

  let menuOpen = $state(false)
  let fileButton = $state()
  let firstMenuItem = $state()
  let importInput = $state()
  let importError = $state('')

  const itemClass =
    'w-full text-left px-3 py-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'

  function handleNameInput(event) {
    draft = event.currentTarget.value
    nameError = ''
  }

  // A refusal leaves the field, so focus goes back to it: the message is about
  // that field. After a tick, so it also wins over where Tab was moving focus.
  async function commitName() {
    if (draft === null) return
    const result = store.setName(draft)
    nameError = result.ok ? '' : result.error
    draft = null
    if (result.ok) return
    await tick()
    nameInput?.focus()
  }

  function handleNameKeydown(event) {
    if (event.key === 'Enter') commitName()
  }

  async function handleFileClick() {
    menuOpen = !menuOpen
    if (!menuOpen) return
    await tick()
    firstMenuItem?.focus()
  }

  function closeMenu() {
    menuOpen = false
    fileButton?.focus()
  }

  function handleMenuKeydown(event) {
    if (event.key === 'Escape') closeMenu()
  }

  function handleMenuFocusout(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) menuOpen = false
  }

  function handleNewValueStream() {
    const created = workspaceStore.create({})
    menuOpen = false
    if (created.ok) workspaceStore.open(created.streamId)
    // On failure the menu item is gone, so focus goes back to what opened it.
    else fileButton?.focus()
  }

  // The file picker takes focus, so the menu closes first and "File" gets it back.
  function handleImportValueStream() {
    closeMenu()
    importInput?.click()
  }

  // The user stays on the open value stream; the import is added to the workspace.
  async function handleImportChosen(event) {
    const input = event.currentTarget
    const file = input.files[0]
    input.value = ''
    if (!file) return
    const result = await importStreamFile(file, workspaceStore)
    importError = result.ok ? '' : result.error
    if (!result.ok) return
    showUpgradeNotice(workspaceStore, result.changes)
    toastStore.add(`${result.name} imported`, TOAST_TYPE.INFO)
    // So a screen reader announces the notice; no changes, no notice, no move.
    if (result.changes.length > 0) {
      await tick()
      focusUpgradeNotice()
    }
  }

  function handleExportValueStream() {
    closeMenu()
    exportStreamFile(workspaceStore, store.stream.id)
  }

  // Home keeps the open stream as the active one, so a reload comes back to it.
  function handleAllValueStreams() {
    workspaceStore.goHome()
  }

  // Undo and Redo stay focusable when there is nothing to do, so focus is not
  // lost when the last step is used; the click is ignored instead.
  function handleUndo() {
    if (store.canUndo) onundo()
  }

  function handleRedo() {
    if (store.canRedo) onredo()
  }
</script>

<div class="flex flex-wrap items-center gap-4">
  <button
    type="button"
    class={buttonClass}
    data-testid="all-value-streams-button"
    onclick={handleAllValueStreams}
  >
    All value streams
  </button>

  <div class="relative" onfocusout={handleMenuFocusout}>
    <button
      type="button"
      class={buttonClass}
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      aria-controls={menuOpen ? 'file-menu' : undefined}
      data-testid="file-menu-button"
      bind:this={fileButton}
      onclick={handleFileClick}
    >
      File
    </button>
    {#if menuOpen}
      <ul
        id="file-menu"
        role="menu"
        aria-label="File"
        class="absolute left-0 z-10 mt-1 min-w-48 bg-white border border-gray-300 rounded-md shadow-md p-1"
        data-testid="file-menu"
        onkeydown={handleMenuKeydown}
      >
        <li role="none">
          <button
            type="button"
            role="menuitem"
            class={itemClass}
            data-testid="new-value-stream-item"
            bind:this={firstMenuItem}
            onclick={handleNewValueStream}
          >
            New value stream
          </button>
        </li>
        <li role="none">
          <button
            type="button"
            role="menuitem"
            class={itemClass}
            aria-describedby="import-value-stream-help"
            data-testid="import-value-stream-item"
            onclick={handleImportValueStream}
          >
            Import value stream
          </button>
          <p id="import-value-stream-help" class="px-3 pb-1 text-sm text-gray-600">
            Add a value stream from a file to this workspace.
          </p>
        </li>
        <li role="none">
          <button
            type="button"
            role="menuitem"
            class={itemClass}
            aria-describedby="export-value-stream-help"
            data-testid="export-value-stream-item"
            onclick={handleExportValueStream}
          >
            Export value stream
          </button>
          <p id="export-value-stream-help" class="px-3 pb-1 text-sm text-gray-600">
            Save this value stream as a file.
          </p>
        </li>
      </ul>
    {/if}
    <input
      type="file"
      accept=".json,application/json"
      hidden
      bind:this={importInput}
      onchange={handleImportChosen}
      data-testid="import-value-stream-input"
    />
  </div>

  <div>
    <label class="flex items-center gap-2">
      <span class="sr-only">Value stream name</span>
      <input
        type="text"
        class="px-3 py-1 border border-gray-300 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Value stream name"
        aria-required="true"
        value={name}
        bind:this={nameInput}
        aria-invalid={nameError ? 'true' : undefined}
        aria-describedby={nameError ? 'stream-name-error' : undefined}
        data-testid="stream-name-input"
        oninput={handleNameInput}
        onblur={commitName}
        onkeydown={handleNameKeydown}
      />
    </label>
    {#if nameError}
      <p
        id="stream-name-error"
        role="alert"
        class="mt-1 text-red-700"
        data-testid="name-error"
      >
        {nameError}
      </p>
    {/if}
  </div>

  <p class="text-gray-600" data-testid="editing-indicator">
    Editing: {label}
  </p>
  <!-- Slice 14 puts the version switcher here. -->
  <div data-testid="version-switcher"></div>

  <div class="flex gap-2 ml-auto">
    <button
      type="button"
      class={buttonClass}
      aria-label="Undo"
      aria-disabled={store.canUndo ? undefined : 'true'}
      data-testid="undo-button"
      onclick={handleUndo}
    >
      Undo
    </button>
    <button
      type="button"
      class={buttonClass}
      aria-label="Redo"
      aria-disabled={store.canRedo ? undefined : 'true'}
      data-testid="redo-button"
      onclick={handleRedo}
    >
      Redo
    </button>
  </div>

  {#if importError}
    <p class="w-full text-red-700" role="alert" data-testid="import-error">
      {importError}
    </p>
  {/if}
</div>
