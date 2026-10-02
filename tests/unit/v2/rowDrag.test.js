import { describe, it, expect, vi } from 'vitest'
import { createRowDrag } from '../../../src/utils/session/rowDrag.svelte.js'

describe('createRowDrag', () => {
  it('starts with no row being dragged', () => {
    expect(createRowDrag(vi.fn()).isAnyRowDragged).toBe(false)
  })

  it('reports a drag from start until end', () => {
    const drag = createRowDrag(vi.fn())

    drag.start('a')
    expect(drag.isAnyRowDragged).toBe(true)

    drag.end()
    expect(drag.isAnyRowDragged).toBe(false)
  })

  it('moves the dragged step to the row it is dropped on, then stops dragging', () => {
    const onMove = vi.fn()
    const drag = createRowDrag(onMove)

    drag.start('a')
    drag.drop('b')

    expect(onMove).toHaveBeenCalledWith('a', 'b')
    expect(drag.isAnyRowDragged).toBe(false)
  })

  it('does not move a step dropped on itself', () => {
    const onMove = vi.fn()
    const drag = createRowDrag(onMove)

    drag.start('a')
    drag.drop('a')

    expect(onMove).not.toHaveBeenCalled()
    expect(drag.isAnyRowDragged).toBe(false)
  })

  it('ignores a drop when nothing is being dragged', () => {
    const onMove = vi.fn()

    createRowDrag(onMove).drop('b')

    expect(onMove).not.toHaveBeenCalled()
  })
})
