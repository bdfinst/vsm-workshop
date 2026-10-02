// @vitest-environment node
import { describe, it, expect } from 'vitest'
import config, { createBaseConfig } from '../../../vite.config.js'

const manualChunks = (options) =>
  options.build.rollupOptions.output.manualChunks

describe('createBaseConfig', () => {
  it('splits vendor code into chunks for the normal build', () => {
    const chunk = manualChunks(config)
    expect(chunk('/app/node_modules/@xyflow/svelte/index.js')).toBe(
      'vendor_xyflow'
    )
    expect(chunk('/app/node_modules/layerchart/index.js')).toBe('vendor_charts')
    expect(chunk('/app/node_modules/svelte/src/index.js')).toBe('vendor_svelte')
  })

  it('leaves everything in one chunk when vendor splitting is off', () => {
    const options = createBaseConfig({ splitVendorChunks: false })
    expect(manualChunks(options)).toBeUndefined()
  })

  it('adds the single-file plugin without a second svelte plugin', async () => {
    const { default: standalone } =
      await import('../../../vite.standalone.config.js')
    const names = standalone.plugins.flat().map((plugin) => plugin.name)
    expect(names.filter((name) => name === 'vite-plugin-svelte')).toHaveLength(
      1
    )
    expect(names).toContain('vite:singlefile')
  })
})
