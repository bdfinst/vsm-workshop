import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

const PDF_ORIENTATION = 'landscape'

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
    pdf.save(filename)
  } catch (err) {
    console.error('Failed to export PDF:', err)
    throw err
  }
}
