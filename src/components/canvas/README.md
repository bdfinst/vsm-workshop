# Canvas Components

React Flow integration for VSM visualization.

## Structure

```
canvas/
├── Canvas.jsx            # Main React Flow container
└── nodes/                # Custom node components
    └── StepNode.jsx      # Process step visualization
```

## Custom Nodes

Each node type displays different VSM elements:

- **StepNode:** Step name, timing metrics, %C&A, position controls

## Data Flow

```
vsmStore (steps, connections)
    ↓
Canvas transforms to nodes/edges
    ↓
React Flow renders and handles interactions
    ↓
User actions update vsmStore
```

## How It Works

### Node Rendering

1. **vsmStore** provides steps array
2. **Canvas** component maps steps to React Flow nodes:
   ```javascript
   const nodes = steps.map(step => ({
     id: step.id,
     type: 'stepNode',
     data: step,
     position: step.position
   }))
   ```
3. **React Flow** renders nodes and handles:
   - Dragging (updates position in store)
   - Selection (updates UI state)
   - Pan/zoom controls

### Edge Rendering

1. **vsmStore** provides connections array
2. **Canvas** transforms to React Flow edges
3. Edges styled based on type:
   - Forward: Solid lines
   - Rework: Dashed lines (not yet implemented)

## Integration with React Flow

React Flow provides:
- Node positioning and dragging
- Pan and zoom controls
- Connection handles
- Mini-map (optional)
- Controls (zoom in/out/fit)

## Styling

Node styling follows Tailwind classes:
- Step types have different border colors
- Selected steps have enhanced borders
- Hover states for interactivity

See: [UI Patterns](../../.claude/rules/ui-patterns.md#react-flow-styling)

## Adding Custom Nodes

To add a new node type:

1. Create component in `nodes/`
2. Register in Canvas.jsx:
   ```javascript
   const nodeTypes = {
     stepNode: StepNode,
     newType: NewTypeNode  // Add here
   }
   ```
3. Add styling in new component
4. Update step type in vsmStore

## See Also

- [Architecture Guide](../../.claude/guides/architecture.md#reactflow-canvas-integration)
- [UI Patterns](../../.claude/rules/ui-patterns.md#react-flow-styling)
- [React Component Examples](../../.claude/examples/react-components.md)
