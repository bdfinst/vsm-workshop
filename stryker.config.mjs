// Mutation testing is scoped to the domain code that Vitest exercises:
// models, utils (calculations, validation, import, migration, session,
// simulation, ui helpers and the shared store factory), the v2 stores, and v2
// persistence. Excluded on purpose:
// - *.svelte components: Vitest does not render them (Playwright covers them), so
//   every mutant there would count as uncovered and drag the score down.
// - src/utils/export: DOM/canvas/PDF glue (html-to-image, jsPDF) with no unit tests.
// - the legacy v1 stores (src/stores/*.svelte.js outside v2/), src/services and
//   src/infrastructure: not part of the current domain scope.
// Run with `npm run test:mutation`; it is not part of CI or the quality gates.
/* global process */
import { createBaseConfig } from './vite.config.js'

// Stryker's Vitest runner does not apply vite.config.js `test.env`, so the unit
// tests that rely on the pinned zone fail the dry run. Export the same zone to
// the runner processes, read from the one place it is defined.
const zone = createBaseConfig({ splitVendorChunks: false }).test?.env?.TZ
if (zone) process.env.TZ = zone

export default {
  packageManager: 'npm',
  testRunner: 'vitest',
  coverageAnalysis: 'perTest',
  reporters: ['html', 'clear-text', 'progress'],
  mutate: [
    'src/models/**/*.js',
    'src/utils/**/*.js',
    'src/stores/v2/**/*.js',
    'src/persistence/v2/**/*.js',
    '!src/utils/export/**',
  ],
  // Baseline on 2026-10-03 was 85.17. `break` sits about 5 points under it, so the
  // run passes today and fails on a real regression. Raise it as the score rises.
  thresholds: { high: 90, low: 85, break: 80 },
}
