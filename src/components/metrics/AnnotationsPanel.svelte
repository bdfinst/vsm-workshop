<script>
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'
  import { WASTE_TYPES, WASTE_TYPE_LABELS } from '../../data/wasteTypes.js'
  import {
    groupAnnotationsByWaste,
    summarizeAnnotations,
  } from '../../utils/annotations.js'

  let steps = $derived(vsmDataStore.steps)
  let connections = $derived(vsmDataStore.connections)
  let annotations = $derived(vsmDataStore.annotations)
  let grouped = $derived(groupAnnotationsByWaste(annotations))
  let summary = $derived(summarizeAnnotations(annotations))

  let targetId = $state('')
  let wasteType = $state(WASTE_TYPES.WAITING)
  let note = $state('')

  // Targets the user can annotate: steps and connections (labelled by step names).
  let targets = $derived([
    ...steps.map((s) => ({ id: s.id, type: 'step', label: `Step: ${s.name}` })),
    ...connections.map((c) => ({
      id: c.id,
      type: 'connection',
      label: `Edge: ${stepName(c.source)} → ${stepName(c.target)}`,
    })),
  ])

  function stepName(id) {
    return steps.find((s) => s.id === id)?.name ?? '?'
  }

  function targetLabel(annotation) {
    return targets.find((t) => t.id === annotation.targetId)?.label ?? '(removed)'
  }

  function handleAdd() {
    const target = targets.find((t) => t.id === targetId)
    if (!target) return
    vsmDataStore.addAnnotation(target.type, target.id, wasteType, note.trim())
    note = ''
  }
</script>

<details class="bg-white border-t border-gray-200 px-6 py-4" data-testid="annotations-panel" open>
  <summary class="cursor-pointer text-sm font-semibold text-gray-800">
    Improvement Backlog
    <span class="ml-2 text-xs font-normal text-gray-500" data-testid="annotations-summary">
      {summary.total} kaizen {summary.total === 1 ? 'burst' : 'bursts'}
    </span>
  </summary>

  {#if targets.length === 0}
    <p class="mt-3 text-sm text-gray-500">Add steps to annotate improvement opportunities.</p>
  {:else}
    <div class="mt-3 flex flex-wrap items-end gap-2">
      <label class="text-xs font-medium text-gray-700">
        Target
        <select
          bind:value={targetId}
          class="mt-1 block rounded-md border border-gray-300 px-2 py-1 text-sm"
          data-testid="annotation-target-select"
        >
          <option value="" disabled>Choose…</option>
          {#each targets as t (t.id)}
            <option value={t.id}>{t.label}</option>
          {/each}
        </select>
      </label>
      <label class="text-xs font-medium text-gray-700">
        Waste
        <select
          bind:value={wasteType}
          class="mt-1 block rounded-md border border-gray-300 px-2 py-1 text-sm"
          data-testid="annotation-waste-select"
        >
          {#each Object.entries(WASTE_TYPE_LABELS) as [value, label] (value)}
            <option {value}>{label}</option>
          {/each}
        </select>
      </label>
      <input
        bind:value={note}
        placeholder="Note (optional)"
        class="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
        data-testid="annotation-note-input"
      />
      <button
        type="button"
        onclick={handleAdd}
        disabled={!targetId}
        class="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        data-testid="annotation-add-button"
      >
        Add burst
      </button>
    </div>

    {#if annotations.length > 0}
      <div class="mt-4 space-y-3">
        {#each Object.entries(grouped) as [waste, items] (waste)}
          <section data-testid="waste-group-{waste}">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {WASTE_TYPE_LABELS[waste]} ({items.length})
            </h4>
            <ul class="mt-1 space-y-1">
              {#each items as a (a.id)}
                <li
                  class="flex items-center justify-between rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs"
                  data-testid="annotation-{a.id}"
                >
                  <span>
                    <span class="font-medium">{targetLabel(a)}</span>
                    {#if a.note}<span class="text-gray-600"> — {a.note}</span>{/if}
                  </span>
                  <button
                    type="button"
                    onclick={() => vsmDataStore.removeAnnotation(a.id)}
                    class="text-red-600 hover:text-red-800"
                    aria-label="Remove annotation"
                    data-testid="annotation-remove-{a.id}"
                  >
                    ✕
                  </button>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>
    {/if}
  {/if}
</details>
