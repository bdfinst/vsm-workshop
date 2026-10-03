import { describe, it, expect } from 'vitest'
import { createConfirmThenUndo } from '../../../src/utils/ui/confirmThenUndo.js'

const setup = () => {
  const calls = []
  const flow = createConfirmThenUndo({
    ask: () => calls.push('ask'),
    close: () => calls.push('close'),
    run: () => calls.push('run'),
    restoreFocus: () => calls.push('restoreFocus'),
  })
  return { flow, calls }
}

describe('createConfirmThenUndo', () => {
  it('asks first and deletes nothing until confirmed', () => {
    const { flow, calls } = setup()

    flow.request()

    expect(calls).toEqual(['ask'])
  })

  it('closes the question, then deletes, when confirmed', () => {
    const { flow, calls } = setup()
    flow.request()

    flow.confirm()

    expect(calls).toEqual(['ask', 'close', 'run'])
  })

  it('closes the question and gives focus back when cancelled, deleting nothing', () => {
    const { flow, calls } = setup()
    flow.request()

    flow.cancel()

    expect(calls).toEqual(['ask', 'close', 'restoreFocus'])
  })

  it('deletes at once, with no question, when the delete needs none', () => {
    const { flow, calls } = setup()

    flow.request(false)

    expect(calls).toEqual(['run'])
  })
})
