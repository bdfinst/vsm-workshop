import { toPng } from 'html-to-image'

/**
 * Sanitize filename for safe download
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'download.png'
  }

  // Remove or replace unsafe characters
  const sanitized = filename
    .replace(/[^a-z0-9.-]/gi, '_')
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, '') // Remove trailing dots
    .substring(0, 255) // Limit length

  // Ensure it has an extension
  if (!sanitized.includes('.')) {
    return sanitized + '.png'
  }

  return sanitized || 'download.png'
}

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

  const safeFilename = sanitizeFilename(filename)
  const defaultOptions = {
    backgroundColor: '#f3f4f6',
    quality: 1,
    ...options,
  }

  try {
    const dataUrl = await toPng(element, defaultOptions)
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = safeFilename
    link.click()
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('Failed to export PNG:', err)
    }
    throw new Error('Failed to export PNG')
  }
}
