<script>
  import { tick } from 'svelte'
  import { menuActionFor, menuIndexFor } from '../../utils/ui/keymap.js'
  import { createConfirmThenUndo } from '../../utils/ui/confirmThenUndo.js'
  import ConfirmPopover from '../ui/ConfirmPopover.svelte'

  // StreamMenu props: name (the stream's display name), onrename() to start
  // renaming it in place, onduplicate(), onexport() and ondelete(), called once
  // the delete is confirmed.
  let { name, onrename, onduplicate, ondelete, onexport } = $props()

  let open = $state(false)
  let confirming = $state(false)
  let root = $state()
  let button = $state()
  let menu = $state()

  const itemClass =
    'block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 focus:ring-2 focus:ring-inset focus:ring-blue-500'

  const items = () => [...(menu?.querySelectorAll('[role="menuitem"]') ?? [])]

  const focusButton = async () => {
    await tick()
    button?.focus()
  }

  const deleteFlow = createConfirmThenUndo({
    ask: () => (confirming = true),
    close: () => (confirming = false),
    run: () => ondelete(),
    restoreFocus: focusButton,
  })

  async function handleToggle() {
    open = !open
    if (!open) return
    await tick()
    items()[0]?.focus()
  }

  function handleMenuKeydown(event) {
    const action = menuActionFor(event)
    if (!action) return
    if (action === 'leave') {
      open = false
      return
    }
    event.preventDefault()
    if (action === 'close') {
      open = false
      focusButton()
      return
    }
    const list = items()
    const current = list.indexOf(document.activeElement)
    list[menuIndexFor(action, current, list.length)]?.focus()
  }

  // A press outside the menu closes it and leaves focus where the press put it.
  function handleWindowPointerDown(event) {
    if (open && !root?.contains(event.target)) open = false
  }

  function chooseRename() {
    open = false
    onrename()
  }

  function chooseDuplicate() {
    open = false
    onduplicate()
    focusButton()
  }

  function chooseDelete() {
    open = false
    deleteFlow.request()
  }

  function chooseExport() {
    open = false
    onexport()
    focusButton()
  }
</script>

<svelte:window onpointerdown={handleWindowPointerDown} />

<div class="absolute top-3 right-3 z-10" bind:this={root}>
  <button
    type="button"
    class="px-2 py-1 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
    aria-label="Actions for {name}"
    aria-haspopup="menu"
    aria-expanded={open}
    data-control="menu-button"
    data-testid="stream-menu-button"
    bind:this={button}
    onclick={handleToggle}
  >
    <span aria-hidden="true">&#8943;</span>
  </button>
  {#if open}
    <ul
      class="absolute right-0 mt-1 w-52 py-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[50]"
      role="menu"
      aria-label="Actions for {name}"
      data-testid="stream-menu"
      bind:this={menu}
      onkeydown={handleMenuKeydown}
    >
      <li role="none">
        <button
          type="button"
          role="menuitem"
          tabindex="-1"
          class={itemClass}
          onclick={chooseRename}>Rename</button
        >
      </li>
      <li role="none">
        <button
          type="button"
          role="menuitem"
          tabindex="-1"
          class={itemClass}
          onclick={chooseDuplicate}>Duplicate</button
        >
      </li>
      <li role="none">
        <button
          type="button"
          role="menuitem"
          tabindex="-1"
          class={itemClass}
          onclick={chooseExport}>Export value stream</button
        >
      </li>
      <li role="none">
        <button
          type="button"
          role="menuitem"
          tabindex="-1"
          class={itemClass}
          onclick={chooseDelete}>Delete</button
        >
      </li>
    </ul>
  {/if}
  {#if confirming}
    <ConfirmPopover
      message={`Delete "${name}"? You can undo this right after.`}
      align="right"
      placement="below"
      onconfirm={deleteFlow.confirm}
      oncancel={deleteFlow.cancel}
    />
  {/if}
</div>
