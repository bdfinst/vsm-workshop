import { describe, it, expect } from 'vitest'
import { createReactiveStore } from '../../../src/utils/createReactiveStore.svelte.js'

describe('createReactiveStore (spike)', () => {
  it('creates a store with reactive getters', () => {
    const store = createReactiveStore({
      count: 0,
      name: 'default',
    })

    expect(store.count).toBe(0)
    expect(store.name).toBe('default')
  })

  it('creates setters for each field', () => {
    const store = createReactiveStore({
      count: 0,
      name: 'default',
    })

    store.setCount(42)
    store.setName('updated')

    expect(store.count).toBe(42)
    expect(store.name).toBe('updated')
  })

  it('resets to defaults', () => {
    const store = createReactiveStore({
      count: 0,
      name: 'default',
    })

    store.setCount(99)
    store.setName('changed')
    store.reset()

    expect(store.count).toBe(0)
    expect(store.name).toBe('default')
  })

  it('supports custom actions', () => {
    const store = createReactiveStore(
      { count: 0 },
      {
        actions: (state) => ({
          increment() {
            state.count++
          },
          decrement() {
            state.count--
          },
        }),
      }
    )

    store.increment()
    store.increment()
    store.decrement()

    expect(store.count).toBe(1)
  })

  it('custom actions override generated setters of the same name', () => {
    const store = createReactiveStore(
      { count: 0 },
      {
        actions: (state) => ({
          setCount(value) {
            state.count = value * 2
          },
        }),
      }
    )

    store.setCount(5)

    expect(store.count).toBe(10)
  })
})
