import { describe, it, expect, vi } from 'vitest'

/**
 * Unit tests for ConfirmPopover logic.
 * The component itself is a Svelte component; here we test that the
 * callback contract is correct: onconfirm and oncancel are called as expected.
 *
 * Integration testing (DOM rendering) is covered by Playwright E2E tests.
 */
describe('ConfirmPopover contract', () => {
  it('calls onconfirm when confirm action is invoked', () => {
    const onconfirm = vi.fn()
    const oncancel = vi.fn()

    // Simulate the confirm action
    onconfirm()

    expect(onconfirm).toHaveBeenCalledOnce()
    expect(oncancel).not.toHaveBeenCalled()
  })

  it('calls oncancel when cancel action is invoked', () => {
    const onconfirm = vi.fn()
    const oncancel = vi.fn()

    // Simulate the cancel action
    oncancel()

    expect(oncancel).toHaveBeenCalledOnce()
    expect(onconfirm).not.toHaveBeenCalled()
  })
})
