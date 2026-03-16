/**
 * UI rendering configuration for step types
 * Maps domain step type keys to display labels, icons, and colors
 * Domain constants live in stepTypes.js; this file is UI-layer only.
 * Note: string literals used to avoid circular dependency with stepTypes.js
 */

export const STEP_TYPE_CONFIG = {
  planning: {
    label: 'Planning',
    icon: '📋',
    color: 'yellow',
    defaultProcessTime: 60,
    defaultLeadTime: 240,
  },
  development: {
    label: 'Development',
    icon: '💻',
    color: 'blue',
    defaultProcessTime: 120,
    defaultLeadTime: 480,
  },
  code_review: {
    label: 'Code Review',
    icon: '👀',
    color: 'orange',
    defaultProcessTime: 30,
    defaultLeadTime: 120,
  },
  testing: {
    label: 'Testing',
    icon: '🧪',
    color: 'purple',
    defaultProcessTime: 60,
    defaultLeadTime: 240,
  },
  qa: {
    label: 'QA',
    icon: '✅',
    color: 'pink',
    defaultProcessTime: 45,
    defaultLeadTime: 180,
  },
  staging: {
    label: 'Staging',
    icon: '🎭',
    color: 'teal',
    defaultProcessTime: 15,
    defaultLeadTime: 60,
  },
  deployment: {
    label: 'Deployment',
    icon: '🚀',
    color: 'green',
    defaultProcessTime: 15,
    defaultLeadTime: 30,
  },
  monitoring: {
    label: 'Monitoring',
    icon: '📊',
    color: 'indigo',
    defaultProcessTime: 30,
    defaultLeadTime: 60,
  },
  custom: {
    label: 'Custom',
    icon: '⚙️',
    color: 'gray',
    defaultProcessTime: 60,
    defaultLeadTime: 120,
  },
}
