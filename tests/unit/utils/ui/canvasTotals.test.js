import { describe, it, expect } from 'vitest'
import { selectCanvasTotals } from '../../../../src/utils/ui/canvasTotals'

const metrics = (overrides = {}) => ({
  totalLeadTime: 240,
  totalProcessTime: 60,
  flowEfficiency: { displayValue: '25.0%', status: 'good' },
  stepCount: 4,
  ...overrides,
})

describe('selectCanvasTotals', () => {
  it('returns the key totals in display order', () => {
    const totals = selectCanvasTotals(metrics())
    expect(totals.map((t) => t.label)).toEqual([
      'Lead Time',
      'Process Time',
      'Flow Eff.',
      'Steps',
    ])
  })

  it('formats durations and passes through the flow-efficiency display value', () => {
    const byLabel = Object.fromEntries(selectCanvasTotals(metrics()).map((t) => [t.label, t.value]))
    expect(byLabel['Lead Time']).toBe('4h')
    expect(byLabel['Process Time']).toBe('1h')
    expect(byLabel['Flow Eff.']).toBe('25.0%')
    expect(byLabel['Steps']).toBe('4')
  })

  it('carries the flow-efficiency status for color coding', () => {
    const eff = selectCanvasTotals(metrics()).find((t) => t.label === 'Flow Eff.')
    expect(eff.status).toBe('good')
  })

  it('handles an empty map safely', () => {
    const totals = selectCanvasTotals(
      metrics({
        totalLeadTime: 0,
        totalProcessTime: 0,
        stepCount: 0,
        flowEfficiency: { displayValue: 'N/A', status: 'neutral' },
      })
    )
    const byLabel = Object.fromEntries(totals.map((t) => [t.label, t.value]))
    expect(byLabel['Steps']).toBe('0')
    expect(byLabel['Flow Eff.']).toBe('N/A')
    expect(byLabel['Lead Time']).toBe('0m')
  })
})
