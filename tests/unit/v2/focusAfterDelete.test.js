import { describe, it, expect } from 'vitest'
import { indexAfterDelete } from '../../../src/utils/ui/focusAfterDelete.js'

describe('indexAfterDelete', () => {
  it("takes the item now in the deleted one's position", () => {
    expect(indexAfterDelete(0, 3)).toBe(0)
    expect(indexAfterDelete(1, 3)).toBe(1)
  })

  it('takes the previous item when the deleted one was last', () => {
    expect(indexAfterDelete(2, 2)).toBe(1)
    expect(indexAfterDelete(4, 4)).toBe(3)
  })

  it('has nothing to take when none remain', () => {
    expect(indexAfterDelete(0, 0)).toBeNull()
  })
})
