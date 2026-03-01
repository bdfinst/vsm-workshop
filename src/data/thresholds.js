/**
 * Shared threshold constants for VSM metrics and simulation
 *
 * Centralizes business rules about what constitutes good/warning/critical
 * status for various metrics. Used by both static metrics calculations
 * and simulation bottleneck detection.
 */

// Flow efficiency thresholds (percentage)
export const FLOW_EFFICIENCY_GOOD_THRESHOLD = 25
export const FLOW_EFFICIENCY_WARNING_THRESHOLD = 15

// First pass yield thresholds (percentage)
export const FIRST_PASS_YIELD_GOOD_THRESHOLD = 80
export const FIRST_PASS_YIELD_WARNING_THRESHOLD = 60

// Rework multiplier thresholds
export const REWORK_MULTIPLIER_GOOD_THRESHOLD = 1.1
export const REWORK_MULTIPLIER_WARNING_THRESHOLD = 1.3

// Bottleneck detection
export const BOTTLENECK_QUEUE_THRESHOLD = 5
export const BOTTLENECK_QUEUE_MULTIPLIER = 1.5

// Queue warning threshold for dashboard
export const QUEUE_WARNING_THRESHOLD = 10

// Simulation progress multiplier
export const PROGRESS_MULTIPLIER = 10

// Canvas layout
export const CANVAS_START_X = 50
export const CANVAS_STEP_SPACING = 250
export const CANVAS_Y = 150
