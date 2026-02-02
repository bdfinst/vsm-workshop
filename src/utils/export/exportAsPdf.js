import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

const PDF_ORIENTATION = 'landscape'

/**
 * Sanitize filename for safe download
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'download.pdf'
  }

  // Remove or replace unsafe characters
  const sanitized = filename
    .replace(/[^a-z0-9.-]/gi, '_')
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, '') // Remove trailing dots
    .substring(0, 255) // Limit length

  // Ensure it has .pdf extension
  if (!sanitized.endsWith('.pdf')) {
    return sanitized.replace(/\.[^.]*$/, '') + '.pdf'
  }

  return sanitized || 'download.pdf'
}

/**
 * Export canvas element as PDF file
 * @param {HTMLElement} element - DOM element to capture
 * @param {string} filename - Name for the downloaded file
 * @param {Object} options - Additional options for image generation
 * @returns {Promise<void>}
 */
export async function exportAsPdf(
  element,
  filename = 'vsm.pdf',
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
    const pdf = new jsPDF({
      orientation: PDF_ORIENTATION,
      unit: 'px',
    })
    const imgProps = pdf.getImageProperties(dataUrl)
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(safeFilename)
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('Failed to export PDF:', err)
    }
    throw new Error('Failed to export PDF')
  }
}
