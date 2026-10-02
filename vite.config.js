import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

/**
 * The config both builds share. The plugin list lives only here.
 * @param {Object} options
 * @param {boolean} options.splitVendorChunks - Split vendor code into chunks
 * @returns {import('vite').UserConfig}
 */
export const createBaseConfig = ({ splitVendorChunks }) => ({
  plugins: [
    svelte({
      // Don't compile node_modules packages with runes mode
      compilerOptions: {
        // Per-component runes detection
      },
    }),
  ],
  // Vitest resolves 'svelte' to its server build unless told otherwise, which has
  // no effects and a no-op flushSync. The browser build makes runes react in tests.
  // Verified needed: without it tests/unit/v2/runeLoader.test.js fails (runes do not react).
  resolve: process.env.VITEST ? { conditions: ['browser'] } : {},
  optimizeDeps: {
    // Include @xyflow/svelte for proper dependency optimization
    include: ['@xyflow/svelte'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    exclude: ['**/node_modules/**', '**/tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.{js,svelte}'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: splitVendorChunks
          ? (moduleId) => {
              if (moduleId.includes('node_modules')) {
                if (moduleId.includes('@xyflow/svelte')) {
                  return 'vendor_xyflow'
                }
                if (
                  moduleId.includes('layerchart') ||
                  moduleId.includes('d3')
                ) {
                  return 'vendor_charts'
                }
                if (moduleId.includes('svelte')) {
                  return 'vendor_svelte'
                }
              }
            }
          : undefined,
      },
    },
  },
})

export default defineConfig(createBaseConfig({ splitVendorChunks: true }))
