import { defineConfig, mergeConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { createBaseConfig } from './vite.config.js'

const OUT_DIR = 'dist-standalone'
const FILE_NAME = 'vsm-workshop.html'

// The standalone file references nothing outside itself, so the icon links
// and web manifest become a blank inline icon.
const inlineHeadLinks = () => ({
  name: 'inline-head-links',
  transformIndexHtml(html) {
    return html
      .replace(
        /\s*<link\b[^>]*\brel="(?:icon|apple-touch-icon|manifest)"[^>]*>/g,
        ''
      )
      .replace('</head>', '    <link rel="icon" href="data:," />\n  </head>')
  },
})

// The single-file plugin emits index.html; the download is named for the app.
const nameStandaloneFile = () => ({
  name: 'name-standalone-file',
  apply: 'build',
  enforce: 'post',
  generateBundle(_options, bundle) {
    const page = bundle['index.html']
    if (page) page.fileName = FILE_NAME
  },
})

export default defineConfig(
  mergeConfig(createBaseConfig({ splitVendorChunks: false }), {
    plugins: [inlineHeadLinks(), viteSingleFile(), nameStandaloneFile()],
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
