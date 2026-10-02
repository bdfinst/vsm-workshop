import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import { toStore } from 'svelte/store'
import { createReactiveStore } from '../../../src/utils/createReactiveStore.svelte.js'

describe('Rune loader', () => {
  it('compiles a $state module and reacts to changes under Vitest', () => {
    const counter = createReactiveStore({ count: 0 })
    const seen = []
    const unsubscribe = toStore(() => counter.count).subscribe((count) =>
      seen.push(count)
    )

    counter.setCount(1)
    flushSync()
    counter.setCount(2)
    flushSync()
    unsubscribe()

    expect(counter.count).toBe(2)
    expect(seen).toEqual([0, 1, 2])
  })
})
