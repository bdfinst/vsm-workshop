import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, mergeConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { createBaseConfig } from './vite.config.js'

const OUT_DIR = 'dist-standalone'
const FILE_NAME = 'vsm-workshop.html'

// The single-file plugin emits index.html; the download is named for the app.
const nameStandaloneFile = () => ({
  name: 'name-standalone-file',
  apply: 'build',
  enforce: 'post',
  closeBundle() {
    fs.renameSync(
      path.join(OUT_DIR, 'index.html'),
      path.join(OUT_DIR, FILE_NAME)
    )
  },
})

export default defineConfig(
  mergeConfig(createBaseConfig({ splitVendorChunks: false }), {
    plugins: [viteSingleFile(), nameStandaloneFile()],
    publicDir: false,
    define: {
      'import.meta.env.VITE_DEFAULT_UI': JSON.stringify('guided'),
    },
    build: {
      outDir: OUT_DIR,
      cssCodeSplit: false,
      assetsInlineLimit: 100000000,
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  })
)
