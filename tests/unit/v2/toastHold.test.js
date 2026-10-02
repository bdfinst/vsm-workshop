import { describe, it, expect } from 'vitest'
import { isToastHeld } from '../../../src/utils/ui/toastHold.js'

const toastWithButtons = () => {
  const toast = document.createElement('div')
  const first = toast.appendChild(document.createElement('button'))
  const second = toast.appendChild(document.createElement('button'))
  document.body.append(toast)
  return { toast, first, second }
}

describe('isToastHeld', () => {
  it('holds while focus moves to another control in the toast', () => {
    const { toast, second } = toastWithButtons()

    expect(isToastHeld(toast, second)).toBe(true)
  })

  it('releases when focus moves outside the toast', () => {
    const { toast } = toastWithButtons()
    const outside = document.body.appendChild(document.createElement('input'))

    expect(isToastHeld(toast, outside)).toBe(false)
  })

  it('releases when focus leaves the page', () => {
    const { toast } = toastWithButtons()

    expect(isToastHeld(toast, null)).toBe(false)
  })
})
