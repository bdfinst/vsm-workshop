# UI/UX Patterns

## Tailwind CSS Usage

### Color Scheme

Use semantic color names with Tailwind's color palette:

```css
/* Primary actions */
bg-blue-600 hover:bg-blue-700

/* Success/Good metrics */
bg-green-500 text-green-700

/* Warning/Attention */
bg-amber-500 text-amber-700

/* Critical/Problem */
bg-red-500 text-red-700

/* Neutral/Inactive */
bg-gray-100 text-gray-600
```

### Spacing

Follow Tailwind's spacing scale consistently:

- `p-2` / `m-2`: Tight spacing within components
- `p-4` / `m-4`: Standard component padding
- `gap-4`: Standard gap between items
- `gap-6` / `gap-8`: Section spacing

### Component Patterns

```jsx
// Card pattern
<div className="bg-white rounded-lg shadow-md p-4">

// Metric card with status
<div className={`rounded-lg p-4 border ${
  status === 'good' ? 'bg-green-50 border-green-200' :
  status === 'warning' ? 'bg-amber-50 border-amber-200' :
  'bg-red-50 border-red-200'
}`}>

// Form input
<input className="w-full px-3 py-2 border border-gray-300 rounded-md
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />

// Button primary
<button className="px-4 py-2 bg-blue-600 text-white rounded-md
  hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
  focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">

// Button secondary
<button className="px-4 py-2 bg-white text-gray-700 border border-gray-300
  rounded-md hover:bg-gray-50">
```

## React Flow Styling

### Node Styling

```jsx
// Base node styles
const nodeBaseClass = "bg-white border-2 rounded-lg shadow-sm p-3 min-w-[180px]";

// Node type variations
const nodeStyles = {
  development: "border-blue-400",
  testing: "border-purple-400",
  deployment: "border-green-400",
  bottleneck: "border-red-400 ring-2 ring-red-200",
};
```

### Edge Styling

```jsx
// Forward flow
const forwardEdgeStyle = {
  stroke: '#6B7280',
  strokeWidth: 2,
};

// Rework loop
const reworkEdgeStyle = {
  stroke: '#EF4444',
  strokeWidth: 2,
  strokeDasharray: '5,5',
};
```

## Responsive Design

- Mobile-first approach
- Breakpoints: `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`
- Canvas/diagram: Full width with minimum height
- Side panels: Slide-in on mobile, fixed on desktop
- Metrics dashboard: Stack on mobile, grid on desktop

```jsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

// Responsive sidebar
<aside className="fixed inset-y-0 right-0 w-full sm:w-96 lg:relative lg:w-80">
```

## Accessibility

- Use semantic HTML elements
- Provide aria-labels for interactive elements
- Ensure sufficient color contrast
- Support keyboard navigation
- Include focus states on all interactive elements

```jsx
<button
  aria-label="Delete step"
  className="... focus:ring-2 focus:ring-offset-2"
>
  <TrashIcon className="h-5 w-5" aria-hidden="true" />
</button>
```

## Data Test Attributes

Always add `data-testid` for acceptance testing:

```jsx
<button data-testid="add-step-button">Add Step</button>
<div data-testid="metrics-dashboard">...</div>
<input data-testid="process-time-input" />
<div data-testid="flow-efficiency-card" data-status={status}>...</div>
```

## Loading States

```jsx
// Skeleton loader
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
  <div className="h-4 bg-gray-200 rounded w-1/2" />
</div>

// Spinner
<div className="animate-spin h-5 w-5 border-2 border-blue-600
  border-t-transparent rounded-full" />
```

## Toast Notifications

- Position: Bottom-right
- Auto-dismiss: 5 seconds for info, manual dismiss for errors
- Stack multiple notifications vertically

## Tooltips

Educational tooltips for VSM concepts:

- Trigger on hover/focus
- Include "Learn more" link to detailed explanation
- Position intelligently to avoid edge clipping
