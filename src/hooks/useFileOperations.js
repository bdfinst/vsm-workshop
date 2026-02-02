import { useCallback, useRef } from 'react'
import { useVsmStore } from '../stores/vsmStore'
import { exportAsJson, exportAsPng, exportAsPdf } from '../utils/export'

/**
 * Custom hook for file operations (import/export)
 * @returns {Object} File operation handlers and refs
 */
function useFileOperations() {
  const { name, exportToJson, importFromJson, clearMap } = useVsmStore()
  const fileInputRef = useRef(null)

  const handleExportJson = useCallback(() => {
    const json = exportToJson()
    exportAsJson(json, `${name || 'vsm'}.json`)
  }, [exportToJson, name])

  const handleExportPng = useCallback(async () => {
    const canvas = document.querySelector('.react-flow')
    if (!canvas) return

    try {
      await exportAsPng(canvas, `${name || 'vsm'}.png`)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to export PNG:', err)
      }
    }
  }, [name])

  const handleExportPdf = useCallback(async () => {
    const canvas = document.querySelector('.react-flow')
    if (!canvas) return

    try {
      await exportAsPdf(canvas, `${name || 'vsm'}.pdf`)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to export PDF:', err)
      }
    }
  }, [name])

  const handleImport = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        const result = importFromJson(event.target.result)
        if (!result) {
          alert('Failed to import file. Please check the format.')
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    [importFromJson]
  )

  const handleNewMap = useCallback(() => {
    if (confirm('Create a new map? This will clear the current map.')) {
      clearMap()
    }
  }, [clearMap])

  return {
    fileInputRef,
    handleExportJson,
    handleExportPng,
    handleExportPdf,
    handleImport,
    handleFileChange,
    handleNewMap,
  }
}

export default useFileOperations
