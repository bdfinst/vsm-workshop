/**
 * Kaizen-burst annotations
 *
 * Pure helpers for tagging improvement opportunities ("kaizen bursts") on steps
 * and connections, then rolling them up into an improvement backlog grouped by
 * waste type.
 */

import { WASTE_TYPES, isWasteType } from '../data/wasteTypes.js'

/**
 * Create a kaizen annotation.
 * @param {'step'|'connection'} targetType
 * @param {string} targetId
 * @param {string} wasteType - One of WASTE_TYPES (unrecognized → practice_gap)
 * @param {string} [note]
 * @returns {{id:string, targetType:string, targetId:string, wasteType:string, note:string, createdAt:string}}
 */
export function createAnnotation(targetType, targetId, wasteType, note = '') {
  return {
    id: crypto.randomUUID(),
    targetType,
    targetId,
    wasteType: isWasteType(wasteType) ? wasteType : WASTE_TYPES.PRACTICE_GAP,
    note,
    createdAt: new Date().toISOString(),
  }
}

/**
 * Group annotations by waste type.
 * @param {Array} annotations
 * @returns {Object} waste type -> annotation[]
 */
export function groupAnnotationsByWaste(annotations = []) {
  return annotations.reduce((acc, a) => {
    if (!acc[a.wasteType]) acc[a.wasteType] = []
    acc[a.wasteType].push(a)
    return acc
  }, {})
}

/**
 * Summarize the improvement backlog.
 * @param {Array} annotations
 * @returns {{total:number, byWaste:Object}}
 */
export function summarizeAnnotations(annotations = []) {
  const byWaste = annotations.reduce((acc, a) => {
    acc[a.wasteType] = (acc[a.wasteType] || 0) + 1
    return acc
  }, {})
  return { total: annotations.length, byWaste }
}
