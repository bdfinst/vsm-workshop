<script>
  // ViewSwitch props: views (the choices, each { id, label }), current (the
  // chosen id), onselect(id), and panelId (the id of the panel the tabs show).
  // The Map is the only view until Slice 13 adds the others.
  let {
    views = [{ id: 'map', label: 'Map' }],
    current = 'map',
    onselect = () => {},
    panelId,
  } = $props()
</script>

<div
  role="tablist"
  aria-label="Map view"
  class="inline-flex rounded-md border border-gray-300 overflow-hidden"
  data-testid="view-switch"
>
  {#each views as view (view.id)}
    {@const selected = view.id === current}
    <button
      type="button"
      role="tab"
      id="view-tab-{view.id}"
      aria-selected={selected}
      aria-controls={panelId}
      class="px-4 py-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 {selected
        ? 'bg-blue-600 text-white'
        : 'bg-white text-gray-800 hover:bg-gray-50'}"
      data-testid="view-tab-{view.id}"
      onclick={() => onselect(view.id)}
    >
      {view.label}
    </button>
  {/each}
</div>
