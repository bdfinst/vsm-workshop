/**
 * The one download helper: hand the browser some text to save as a file. The
 * unreadable-data screen, the home screen, the export menu and download-mode
 * save all use it.
 * @param {string} name - The file name to save as
 * @param {string} text - The file content
 * @param {Object} [deps] - Browser objects, replaceable in tests
 * @param {Document} [deps.document] - Where the link is made
 * @param {Pick<URL, 'createObjectURL' | 'revokeObjectURL'>} [deps.url] - The URL API
 */
export const browserDownload = (
  name,
  text,
  { document = globalThis.document, url = globalThis.URL } = {}
) => {
  const href = url.createObjectURL(
    new Blob([text], { type: 'application/json' })
  )
  const link = document.createElement('a')
  link.href = href
  link.download = name
  // Some browsers only act on a link that is in the page.
  document.body.appendChild(link)
  link.click()
  link.remove()
  url.revokeObjectURL(href)
}
