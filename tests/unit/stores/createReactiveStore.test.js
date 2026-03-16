import { describe, it, expect } from 'vitest'
import { createReactiveStore } from '../../../src/stores/createReactiveStore.svelte.js'

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

  describe('proof: migrate simulationControlStore shape', () => {
    it('reproduces simulationControlStore behavior', () => {
      const store = createReactiveStore(
        {
          isRunning: false,
          isPaused: false,
          speed: 1.0,
        },
        {
          actions: (state) => ({
            setRunning(running) {
              state.isRunning = running
              if (running) state.isPaused = false
            },
            setPaused(paused) {
              state.isPaused = paused
              if (paused) state.isRunning = false
            },
            setSpeed(newSpeed) {
              state.speed = Math.min(4.0, Math.max(0.25, newSpeed))
            },
            reset() {
              state.isRunning = false
              state.isPaused = false
              // Keep speed setting
            },
          }),
        }
      )

      // Start
      store.setRunning(true)
      expect(store.isRunning).toBe(true)
      expect(store.isPaused).toBe(false)

      // Pause
      store.setPaused(true)
      expect(store.isPaused).toBe(true)
      expect(store.isRunning).toBe(false)

      // Speed clamping
      store.setSpeed(0.1)
      expect(store.speed).toBe(0.25)
      store.setSpeed(10)
      expect(store.speed).toBe(4.0)

      // Reset keeps speed
      store.setSpeed(2.0)
      store.setRunning(true)
      store.reset()
      expect(store.isRunning).toBe(false)
      expect(store.isPaused).toBe(false)
      expect(store.speed).toBe(2.0)
    })
  })
})
