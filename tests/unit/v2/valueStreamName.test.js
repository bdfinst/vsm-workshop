import { describe, it, expect } from 'vitest'
import { openStream, refused } from './fixtures.js'
import { createValueStream } from '../../../src/models/v2/valueStream.js'

describe('valueStreamStore: value stream name', () => {
  it('renames the value stream and saves once', () => {
    const { store, persist } = openStream()

    const result = store.setName('Checkout v2')

    expect(result).toMatchObject({ ok: true })
    expect(store.stream.name).toBe('Checkout v2')
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it.each(['', '   ', '\t \n'])(
    'refuses %j as a name: "Add a name", nothing saved, nothing to undo',
    (blank) => {
      const { store, persist } = openStream()

      expect(store.setName(blank)).toEqual({
        ok: false,
        error: 'Add a name',
      })

      expect(store.stream.name).toBe('Checkout delivery')
      expect(store.canUndo).toBe(false)
      expect(persist).not.toHaveBeenCalled()
    }
  )

  it('refuses a blank name for a stream that has none yet, which stays unnamed', () => {
    const { store, persist } = openStream(createValueStream())

    expect(store.setName('  ')).toEqual({ ok: false, error: 'Add a name' })

    expect(store.stream.name).toBe('')
    expect(persist).not.toHaveBeenCalled()
  })

  it('names a stream that had none', () => {
    const { store } = openStream(createValueStream())

    expect(store.setName('Onboarding')).toMatchObject({ ok: true })

    expect(store.stream.name).toBe('Onboarding')
  })

  it('keeps the name trimmed, as the home rename does', () => {
    const { store } = openStream()

    store.setName('  Checkout v2  ')

    expect(store.stream.name).toBe('Checkout v2')
  })

  it('leaves history and storage alone when only the space around the name changed', () => {
    const { store, persist } = openStream()

    expect(store.setName('  Checkout delivery ')).toMatchObject({ ok: true })

    expect(store.canUndo).toBe(false)
    expect(persist).not.toHaveBeenCalled()
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

  it('names the value stream name in the undo and redo announcements', () => {
    const { store } = openStream()
    store.setName('Checkout v2')

    const undone = store.undo().announcement
    const redone = store.redo().announcement

    expect(undone).toMatch(/value stream name/i)
    expect(redone).toMatch(/value stream name/i)
    expect(undone).not.toBe(redone)
  })

  it('still says which stage a name edit came from when undone elsewhere', () => {
    const { store } = openStream()
    store.setName('Checkout v2')
    store.goToStage(2)

    const announcement = store.undo().announcement

    expect(announcement).toMatch(/value stream name/i)
    expect(announcement).toMatch(/Scope/)
  })
})
