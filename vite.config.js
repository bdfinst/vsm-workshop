import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    exclude: ['**/node_modules/**', '**/tests/e2e/**'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(moduleId) {
          if (moduleId.includes('node_modules')) {
            if (moduleId.includes('reactflow')) {
              return 'vendor_reactflow';
            }
            if (moduleId.includes('recharts')) {
              return 'vendor_recharts';
            }
            if (moduleId.includes('react') || moduleId.includes('react-dom')) {
              return 'vendor_react';
            }
          }
        },
      },
    },
  },
})
