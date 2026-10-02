import { describe, it, expect, afterEach, vi } from 'vitest'
import { isToastHeld } from '../../../src/utils/ui/toastHold.js'

const toastWithButtons = () => {
  const toast = document.createElement('div')
  toast.appendChild(document.createElement('button'))
  const second = toast.appendChild(document.createElement('button'))
  document.body.append(toast)
  return { toast, second }
}

describe('isToastHeld', () => {
  afterEach(() => document.body.replaceChildren())

  it('holds while focus moves to another control in the toast', () => {
    const { toast, second } = toastWithButtons()

    expect(isToastHeld(toast, second)).toBe(true)
  })

  it('releases when focus moves outside the toast', () => {
    const { toast } = toastWithButtons()
    const outside = document.body.appendChild(document.createElement('input'))

    expect(isToastHeld(toast, outside)).toBe(false)
  })

  it('holds while the pointer is over the toast, wherever focus is', () => {
    const { toast } = toastWithButtons()
    vi.spyOn(toast, 'matches').mockImplementation(
      (selector) => selector === ':hover'
    )

    expect(isToastHeld(toast, null)).toBe(true)
  })

  it('releases when focus leaves the page', () => {
    const { toast } = toastWithButtons()

    expect(isToastHeld(toast, null)).toBe(false)
  })
})
