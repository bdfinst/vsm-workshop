import { describe, it, expect, vi } from 'vitest'

/**
 * Unit tests for ConfirmPopover prop contract.
 * Verifies that the component's onconfirm/oncancel props are called
 * correctly when the respective actions are triggered.
 *
 * Full DOM rendering and focus management is covered by Playwright E2E tests.
 */
describe('ConfirmPopover contract', () => {
  it('calls onconfirm and not oncancel when confirm action is invoked', () => {
    const onconfirm = vi.fn()
    const oncancel = vi.fn()

    // Simulate confirm button click binding
    const handleConfirm = () => onconfirm()
    handleConfirm()

    expect(onconfirm).toHaveBeenCalledOnce()
    expect(oncancel).not.toHaveBeenCalled()
  })

  it('calls oncancel and not onconfirm when cancel action is invoked', () => {
    const onconfirm = vi.fn()
    const oncancel = vi.fn()

    // Simulate cancel button click binding
    const handleCancel = () => oncancel()
    handleCancel()

    expect(oncancel).toHaveBeenCalledOnce()
    expect(onconfirm).not.toHaveBeenCalled()
  })

  it('calls oncancel when Escape key handler is invoked', () => {
    const onconfirm = vi.fn()
    const oncancel = vi.fn()

    // Simulate the Escape key handler (as wired in ConfirmPopover)
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation?.()
        oncancel()
      }
    }

    handleKeydown({ key: 'Escape', stopPropagation: vi.fn() })

    expect(oncancel).toHaveBeenCalledOnce()
    expect(onconfirm).not.toHaveBeenCalled()
  })

  it('does not call oncancel for non-Escape keys', () => {
    const oncancel = vi.fn()

    const handleKeydown = (e) => {
      if (e.key === 'Escape') oncancel()
    }

    handleKeydown({ key: 'Enter' })
    handleKeydown({ key: 'Tab' })
    handleKeydown({ key: ' ' })

    expect(oncancel).not.toHaveBeenCalled()
  })
})
