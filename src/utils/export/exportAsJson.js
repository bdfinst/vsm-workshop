/**
 * Export VSM data as JSON file
 * @param {string} jsonData - JSON string to export
 * @param {string} filename - Name for the downloaded file
 */
export function exportAsJson(jsonData, filename = 'vsm.json') {
  const blob = new Blob([jsonData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
