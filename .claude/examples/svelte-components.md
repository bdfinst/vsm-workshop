# Svelte Component Examples

**Svelte 5 components with runes - NO CLASSES.**

---

## Basic Component Structure

### Minimal Component

```svelte
<script>
  let { name } = $props()
</script>

<h1>Hello, {name}!</h1>
```

### With Default Props

```svelte
<script>
  let { name = 'World', count = 0 } = $props()
</script>

<h1>Hello, {name}! Count: {count}</h1>
```

---

## Complete Component Template

```svelte
<script>
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'

  let { stepId, onsave, oncancel } = $props()

  // ===== DERIVED STATE =====
  let step = $derived(vsmDataStore.steps.find((s) => s.id === stepId))

  // ===== LOCAL STATE =====
  let name = $state(step?.name || '')
  let processTime = $state(step?.processTime || 0)
  let leadTime = $state(step?.leadTime || 0)
  let errors = $state({})

  // ===== EVENT HANDLERS =====
  function handleSubmit(e) {
    e.preventDefault()

    // Validation
    const newErrors = {}
    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (leadTime < processTime) {
      newErrors.leadTime = 'Lead time must be >= process time'
    }

    if (Object.keys(newErrors).length > 0) {
      errors = newErrors
      return
    }

    // Save
    const stepData = { ...step, name, processTime, leadTime }
    vsmDataStore.updateStep(stepId, stepData)
    onsave(stepData)
  }

  function handleCancel() {
    name = step?.name || ''
    processTime = step?.processTime || 0
    leadTime = step?.leadTime || 0
    errors = {}
    oncancel()
  }
</script>

{#if !step}
  <div>Step not found</div>
{:else}
  <form onsubmit={handleSubmit} data-testid="step-editor">
    <div class="form-group">
      <label for="step-name">Step Name</label>
      <input
        id="step-name"
        type="text"
        bind:value={name}
        data-testid="step-name-input"
        class="form-input"
      />
      {#if errors.name}
        <span class="error-message">{errors.name}</span>
      {/if}
    </div>

    <div class="form-group">
      <label for="process-time">Process Time (minutes)</label>
      <input
        id="process-time"
        type="number"
        min="0"
        bind:value={processTime}
        data-testid="process-time-input"
        class="form-input"
      />
    </div>

    <div class="form-group">
      <label for="lead-time">Lead Time (minutes)</label>
      <input
        id="lead-time"
        type="number"
        min="0"
        bind:value={leadTime}
        data-testid="lead-time-input"
        class="form-input"
      />
      {#if errors.leadTime}
        <span class="error-message">{errors.leadTime}</span>
      {/if}
    </div>

    <div class="form-actions">
      <button type="submit" class="btn-primary" data-testid="save-button">
        Save
      </button>
      <button
        type="button"
        onclick={handleCancel}
        class="btn-secondary"
        data-testid="cancel-button"
      >
        Cancel
      </button>
    </div>
  </form>
{/if}
```

---

## Props Patterns

### Required and Optional Props

```svelte
<script>
  // Required props (no default)
  let { title, onclick } = $props()

  // Optional props with defaults
  let { count = 0, step = null, steps = [], status = 'good' } = $props()
</script>
```

### Spread Props / Rest Props

```svelte
<script>
  let { title, ...rest } = $props()
</script>

<div {...rest}>{title}</div>
```

---

## Reactivity Patterns

### $state for Mutable Values

```svelte
<script>
  let count = $state(0)
  let items = $state([])

  function addItem(item) {
    items = [...items, item]
  }
</script>
```

### $derived for Computed Values

```svelte
<script>
  import { vsmDataStore } from '../stores/vsmDataStore.svelte.js'

  let flowEfficiency = $derived(() => {
    const processTime = vsmDataStore.steps.reduce((sum, s) => sum + s.processTime, 0)
    const leadTime = vsmDataStore.steps.reduce((sum, s) => sum + s.leadTime, 0)
    return leadTime > 0 ? (processTime / leadTime) * 100 : 0
  })
</script>

<div>
  <h2>Flow Efficiency: {flowEfficiency.toFixed(1)}%</h2>
</div>
```

### $effect for Side Effects (Use Sparingly)

```svelte
<script>
  let { stepId } = $props()

  $effect(() => {
    // Runs when stepId changes
    console.log('Step changed:', stepId)
  })
</script>
```

---

## Event Handler Patterns

### Callback Props

```svelte
<!-- Parent -->
<StepNode step={step} onselect={handleStepSelect} />

<!-- Child (StepNode.svelte) -->
<script>
  let { step, onselect } = $props()
</script>

<button onclick={() => onselect(step.id)}>
  {step.name}
</button>
```

### Form Handling

```svelte
<script>
  let name = $state('')

  function handleSubmit(e) {
    e.preventDefault()
    // process form data
  }
</script>

<form onsubmit={handleSubmit}>
  <input bind:value={name} data-testid="name-input" />
  <button type="submit">Save</button>
</form>
```

---

## Conditional Rendering

```svelte
{#if loading}
  <div class="animate-pulse">Loading...</div>
{:else if error}
  <div class="text-red-500">{error}</div>
{:else}
  <div data-testid="content">{data}</div>
{/if}
```

## List Rendering

```svelte
{#each steps as step (step.id)}
  <StepNode {step} onselect={handleSelect} />
{/each}
```

---

## Related Documentation

- [JavaScript/Svelte Rules](../rules/javascript-svelte.md) - Complete code standards
- [Svelte Store Examples](svelte-stores.md) - State management
- [Factory Function Examples](factory-functions.md) - No classes pattern
- [UI Patterns](../rules/ui-patterns.md) - Styling guidelines
