<script>
  import { tick } from 'svelte'
  import { workspaceStore } from '../../stores/v2/workspaceStore.svelte.js'

  // SessionHeader props: store (the open value stream store), onundo, onredo.
  let { store, onundo, onredo } = $props()

  const buttonClass =
    'px-3 py-1 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 aria-disabled:opacity-50 aria-disabled:cursor-not-allowed'

  // The name is saved on blur or Enter, never per keystroke, so one edit is one undo step.
  let draft = $state(null)
  let name = $derived(draft ?? store.stream.name)
  let label = $derived(store.activeVersion.label)

  let menuOpen = $state(false)
  let fileButton = $state()
  let firstMenuItem = $state()

  function handleNameInput(event) {
    draft = event.currentTarget.value
  }

  function commitName() {
    if (draft === null) return
    store.setName(draft)
    draft = null
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
            class="w-full text-left px-3 py-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="new-value-stream-item"
            bind:this={firstMenuItem}
            onclick={handleNewValueStream}
          >
            New value stream
          </button>
        </li>
      </ul>
    {/if}
  </div>

  <label class="flex items-center gap-2">
    <span class="sr-only">Map name</span>
    <input
      type="text"
      class="px-3 py-1 border border-gray-300 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      placeholder="Map name"
      value={name}
      data-testid="map-name-input"
      oninput={handleNameInput}
      onblur={commitName}
      onkeydown={handleNameKeydown}
    />
  </label>

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
</div>
