# Canvas Components

@xyflow/svelte integration for VSM visualization.

## Structure

```
canvas/
├── Canvas.svelte         # Main SvelteFlow container
└── nodes/                # Custom node components
    └── StepNode.svelte   # Process step visualization
```

## Custom Nodes

- **StepNode:** Step name, timing metrics, %C&A, bottleneck highlight, selection ring

## Data Flow

```
vsmDataStore (steps, connections)
    ↓
Canvas derives nodes/edges via $derived
    ↓
SvelteFlow renders and handles interactions
    ↓
User actions update vsmDataStore
```

## How It Works

### Node Rendering

1. **vsmDataStore** provides reactive `steps` array
2. **Canvas.svelte** maps steps to SvelteFlow nodes via `$derived`:
   ```javascript
   let nodes = $derived(
     vsmDataStore.steps.map(step => ({
       id: step.id,
       type: 'stepNode',
       data: step,
       position: step.position
     }))
   )
   ```
3. **SvelteFlow** renders nodes and handles dragging, selection, pan/zoom

### Edge Rendering

1. **vsmDataStore** provides `connections` array
2. **Canvas.svelte** derives SvelteFlow edges from connections
3. Edge style based on type:
   - Forward: Solid grey lines
   - Rework: Dashed red lines

## Adding Custom Nodes

1. Create `nodes/MyNode.svelte`
2. Register in `Canvas.svelte`:
   ```javascript
   const nodeTypes = {
     stepNode: StepNode,
     myNode: MyNode
   }
   ```
3. Add Tailwind styling inside the component
4. Update step type in `src/data/stepTypes.js`

## See Also

- [Architecture Guide](../../.claude/guides/architecture.md)
- [UI Patterns](../../.claude/rules/ui-patterns.md)
- [Svelte Component Examples](../../.claude/examples/svelte-components.md)
