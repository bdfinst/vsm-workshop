import { describe, it, expect } from 'vitest'
import { openStream, refused } from './fixtures.js'

describe('valueStreamStore: map name', () => {
  it('renames the map and saves once', () => {
    const { store, persist } = openStream()

    const result = store.setName('Checkout v2')

    expect(result).toMatchObject({ ok: true })
    expect(store.stream.name).toBe('Checkout v2')
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('accepts an empty name, so a new map can start without one', () => {
    const { store } = openStream()

    expect(store.setName('')).toMatchObject({ ok: true })

    expect(store.stream.name).toBe('')
  })

  it('refuses a name that is not text', () => {
    const { store, persist } = openStream()

    expect(store.setName(undefined)).toEqual(refused)

    expect(store.stream.name).toBe('Checkout delivery')
    expect(persist).not.toHaveBeenCalled()
  })

  it('leaves history and storage alone when the name is unchanged', () => {
    const { store, persist } = openStream()

    expect(store.setName('Checkout delivery')).toMatchObject({ ok: true })

    expect(store.canUndo).toBe(false)
    expect(persist).not.toHaveBeenCalled()
  })

  it('undo and redo move the name back and forth', () => {
    const { store } = openStream()
    store.setName('Checkout v2')

    store.undo()
    expect(store.stream.name).toBe('Checkout delivery')
    expect(store.canRedo).toBe(true)

    store.redo()
    expect(store.stream.name).toBe('Checkout v2')
    expect(store.canRedo).toBe(false)
  })

  it('a new name after an undo clears redo', () => {
    const { store } = openStream()
    store.setName('Checkout v2')
    store.undo()

    store.setName('Checkout v3')

    expect(store.canRedo).toBe(false)
  })

  it('names the map in the undo and redo announcements', () => {
    const { store } = openStream()
    store.setName('Checkout v2')

    const undone = store.undo().announcement
    const redone = store.redo().announcement

    expect(undone).toMatch(/map name/i)
    expect(redone).toMatch(/map name/i)
    expect(undone).not.toBe(redone)
  })

  it('still says which stage a name edit came from when undone elsewhere', () => {
    const { store } = openStream()
    store.setName('Checkout v2')
    store.goToStage(2)

    const announcement = store.undo().announcement

    expect(announcement).toMatch(/map name/i)
    expect(announcement).toMatch(/Scope/)
  })
})
