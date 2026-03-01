import { STEP_TYPES } from './stepTypes.js'
import { CANVAS_START_X, CANVAS_STEP_SPACING, CANVAS_Y } from './thresholds.js'

export const TEMPLATE_CATEGORIES = {
  SOFTWARE: 'software',
  SUPPORT: 'support',
  MANUFACTURING: 'manufacturing',
}

export const STEP_TEMPLATES = [
  // Software Development templates
  {
    id: 'backlog',
    category: TEMPLATE_CATEGORIES.SOFTWARE,
    name: 'Backlog',
    type: STEP_TYPES.CUSTOM,
    description: 'Work items waiting to be picked up',
    processTime: 0,
    leadTime: 480,
    percentCompleteAccurate: 100,
    queueSize: 10,
    batchSize: 1,
  },
  {
    id: 'sprint-planning',
    category: TEMPLATE_CATEGORIES.SOFTWARE,
    name: 'Sprint Planning',
    type: STEP_TYPES.PLANNING,
    description: 'Planning and prioritization session',
    processTime: 60,
    leadTime: 240,
    percentCompleteAccurate: 90,
    queueSize: 0,
    batchSize: 1,
  },
  {
    id: 'development',
    category: TEMPLATE_CATEGORIES.SOFTWARE,
    name: 'Development',
    type: STEP_TYPES.DEVELOPMENT,
    description: 'Writing and testing code',
    processTime: 240,
    leadTime: 960,
    percentCompleteAccurate: 85,
    queueSize: 3,
    batchSize: 1,
  },
  {
    id: 'code-review',
    category: TEMPLATE_CATEGORIES.SOFTWARE,
    name: 'Code Review',
    type: STEP_TYPES.CODE_REVIEW,
    description: 'Peer review of changes',
    processTime: 30,
    leadTime: 240,
    percentCompleteAccurate: 90,
    queueSize: 2,
    batchSize: 1,
  },
  {
    id: 'testing',
    category: TEMPLATE_CATEGORIES.SOFTWARE,
    name: 'QA Testing',
    type: STEP_TYPES.TESTING,
    description: 'Manual and automated testing',
    processTime: 60,
    leadTime: 480,
    percentCompleteAccurate: 80,
    queueSize: 4,
    batchSize: 1,
  },
  {
    id: 'staging',
    category: TEMPLATE_CATEGORIES.SOFTWARE,
    name: 'Staging Deploy',
    type: STEP_TYPES.STAGING,
    description: 'Deploy to staging environment',
    processTime: 15,
    leadTime: 60,
    percentCompleteAccurate: 95,
    queueSize: 1,
    batchSize: 1,
  },
  {
    id: 'production',
    category: TEMPLATE_CATEGORIES.SOFTWARE,
    name: 'Production Deploy',
    type: STEP_TYPES.DEPLOYMENT,
    description: 'Release to production',
    processTime: 15,
    leadTime: 60,
    percentCompleteAccurate: 95,
    queueSize: 2,
    batchSize: 3,
  },

  // Support templates
  {
    id: 'ticket-triage',
    category: TEMPLATE_CATEGORIES.SUPPORT,
    name: 'Ticket Triage',
    type: STEP_TYPES.CUSTOM,
    description: 'Initial ticket review and categorization',
    processTime: 5,
    leadTime: 30,
    percentCompleteAccurate: 85,
    queueSize: 15,
    batchSize: 1,
  },
  {
    id: 'investigation',
    category: TEMPLATE_CATEGORIES.SUPPORT,
    name: 'Investigation',
    type: STEP_TYPES.CUSTOM,
    description: 'Analyze and diagnose the issue',
    processTime: 30,
    leadTime: 120,
    percentCompleteAccurate: 80,
    queueSize: 5,
    batchSize: 1,
  },
  {
    id: 'resolution',
    category: TEMPLATE_CATEGORIES.SUPPORT,
    name: 'Resolution',
    type: STEP_TYPES.CUSTOM,
    description: 'Implement the fix or solution',
    processTime: 45,
    leadTime: 180,
    percentCompleteAccurate: 90,
    queueSize: 3,
    batchSize: 1,
  },
  {
    id: 'verification',
    category: TEMPLATE_CATEGORIES.SUPPORT,
    name: 'Verification',
    type: STEP_TYPES.QA,
    description: 'Verify the fix works correctly',
    processTime: 15,
    leadTime: 60,
    percentCompleteAccurate: 95,
    queueSize: 2,
    batchSize: 1,
  },

  // Manufacturing templates
  {
    id: 'design',
    category: TEMPLATE_CATEGORIES.MANUFACTURING,
    name: 'Design',
    type: STEP_TYPES.PLANNING,
    description: 'Product design and specifications',
    processTime: 120,
    leadTime: 480,
    percentCompleteAccurate: 85,
    queueSize: 2,
    batchSize: 1,
  },
  {
    id: 'procurement',
    category: TEMPLATE_CATEGORIES.MANUFACTURING,
    name: 'Procurement',
    type: STEP_TYPES.CUSTOM,
    description: 'Order and receive materials',
    processTime: 30,
    leadTime: 2400, // 5 days
    percentCompleteAccurate: 95,
    queueSize: 5,
    batchSize: 10,
  },
  {
    id: 'assembly',
    category: TEMPLATE_CATEGORIES.MANUFACTURING,
    name: 'Assembly',
    type: STEP_TYPES.CUSTOM,
    description: 'Assemble the product',
    processTime: 60,
    leadTime: 240,
    percentCompleteAccurate: 92,
    queueSize: 8,
    batchSize: 5,
  },
  {
    id: 'quality-check',
    category: TEMPLATE_CATEGORIES.MANUFACTURING,
    name: 'Quality Check',
    type: STEP_TYPES.QA,
    description: 'Inspect for defects',
    processTime: 15,
    leadTime: 60,
    percentCompleteAccurate: 98,
    queueSize: 3,
    batchSize: 5,
  },
  {
    id: 'packaging',
    category: TEMPLATE_CATEGORIES.MANUFACTURING,
    name: 'Packaging',
    type: STEP_TYPES.CUSTOM,
    description: 'Package for shipping',
    processTime: 10,
    leadTime: 30,
    percentCompleteAccurate: 99,
    queueSize: 10,
    batchSize: 20,
  },
]

export const CATEGORY_LABELS = {
  [TEMPLATE_CATEGORIES.SOFTWARE]: 'Software Development',
  [TEMPLATE_CATEGORIES.SUPPORT]: 'Support & Service',
  [TEMPLATE_CATEGORIES.MANUFACTURING]: 'Manufacturing',
}

export function getTemplatesByCategory() {
  const grouped = {}
  for (const template of STEP_TEMPLATES) {
    if (!grouped[template.category]) {
      grouped[template.category] = []
    }
    grouped[template.category].push(template)
  }
  return grouped
}

// Map templates - complete value stream configurations
export const MAP_TEMPLATES = [
  {
    id: 'software-delivery',
    name: 'Software Delivery Pipeline',
    description: 'A typical software delivery value stream from backlog to production',
    steps: [
      { ...STEP_TEMPLATES.find((t) => t.id === 'backlog'), position: { x: CANVAS_START_X, y: CANVAS_Y } },
      { ...STEP_TEMPLATES.find((t) => t.id === 'development'), position: { x: CANVAS_START_X + CANVAS_STEP_SPACING, y: CANVAS_Y } },
      { ...STEP_TEMPLATES.find((t) => t.id === 'code-review'), position: { x: CANVAS_START_X + CANVAS_STEP_SPACING * 2, y: CANVAS_Y } },
      { ...STEP_TEMPLATES.find((t) => t.id === 'testing'), position: { x: CANVAS_START_X + CANVAS_STEP_SPACING * 3, y: CANVAS_Y } },
      { ...STEP_TEMPLATES.find((t) => t.id === 'production'), position: { x: CANVAS_START_X + CANVAS_STEP_SPACING * 4, y: CANVAS_Y } },
    ],
    connections: [
      { source: 0, target: 1, type: 'forward' },
      { source: 1, target: 2, type: 'forward' },
      { source: 2, target: 3, type: 'forward' },
      { source: 3, target: 4, type: 'forward' },
      { source: 2, target: 1, type: 'rework', reworkRate: 15 },
      { source: 3, target: 1, type: 'rework', reworkRate: 20 },
    ],
  },
  {
    id: 'support-ticket',
    name: 'Support Ticket Flow',
    description: 'Customer support ticket handling process',
    steps: [
      { ...STEP_TEMPLATES.find((t) => t.id === 'ticket-triage'), position: { x: CANVAS_START_X, y: CANVAS_Y } },
      { ...STEP_TEMPLATES.find((t) => t.id === 'investigation'), position: { x: CANVAS_START_X + CANVAS_STEP_SPACING, y: CANVAS_Y } },
      { ...STEP_TEMPLATES.find((t) => t.id === 'resolution'), position: { x: CANVAS_START_X + CANVAS_STEP_SPACING * 2, y: CANVAS_Y } },
      { ...STEP_TEMPLATES.find((t) => t.id === 'verification'), position: { x: CANVAS_START_X + CANVAS_STEP_SPACING * 3, y: CANVAS_Y } },
    ],
    connections: [
      { source: 0, target: 1, type: 'forward' },
      { source: 1, target: 2, type: 'forward' },
      { source: 2, target: 3, type: 'forward' },
      { source: 3, target: 2, type: 'rework', reworkRate: 10 },
    ],
  },
]
