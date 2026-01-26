import { toPng } from 'html-to-image'

/**
 * Export canvas element as PNG file
 * @param {HTMLElement} element - DOM element to capture
 * @param {string} filename - Name for the downloaded file
 * @param {Object} options - Additional options for image generation
 * @returns {Promise<void>}
 */
export async function exportAsPng(
  element,
  filename = 'vsm.png',
  options = {}
) {
  if (!element) {
    throw new Error('Element not found')
  }

  const defaultOptions = {
    backgroundColor: '#f3f4f6',
    quality: 1,
    ...options,
  }

  try {
    const dataUrl = await toPng(element, defaultOptions)
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    a.click()
  } catch (err) {
    console.error('Failed to export PNG:', err)
    throw err
  }
}
