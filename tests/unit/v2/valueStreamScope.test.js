import { describe, it, expect } from 'vitest'
import { openStream, refused } from './fixtures.js'
import { createValueStream } from '../../../src/models/v2/valueStream.js'

const blankStore = () => openStream(createValueStream())

describe('valueStreamStore: scope', () => {
  it('sets a scope field and saves once', () => {
    const { store, persist } = blankStore()

    const result = store.setScope({ trigger: 'A customer asks' })

    expect(result).toMatchObject({ ok: true })
    expect(store.stream.trigger).toBe('A customer asks')
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('sets several fields as one edit', () => {
    const { store } = blankStore()

    store.setScope({ trigger: 'A customer asks', endPoint: 'It is live' })
    store.undo()

    expect(store.stream.trigger).toBe('')
    expect(store.stream.endPoint).toBe('')
    expect(store.canUndo).toBe(false)
  })

  it('leaves the other fields alone', () => {
    const { store } = openStream()

    store.setScope({ endPoint: 'It is live' })

    expect(store.stream.name).toBe('Checkout delivery')
  })

  it('refuses a blank name inside any scope edit, whole, as setName does', () => {
    const { store, persist } = blankStore()

    const result = store.setScope({ name: '   ', trigger: 'A customer asks' })

    expect(result).toEqual({ ok: false, error: 'Add a name' })

    expect(store.stream.name).toBe('')
    expect(store.stream.trigger).toBe('')
    expect(persist).not.toHaveBeenCalled()
  })

  it('trims a name set with the other scope fields', () => {
    const { store } = blankStore()

    store.setScope({ name: '  Checkout v2 ', trigger: 'A customer asks' })

    expect(store.stream.name).toBe('Checkout v2')
  })

  it.each(['story', 'feature', 'defect'])(
    'accepts %s as the unit of work',
    (unit) => {
      const { store } = blankStore()

      expect(store.setScope({ unitOfWork: unit })).toMatchObject({ ok: true })

      expect(store.stream.unitOfWork).toBe(unit)
    }
  )

  it('starts with no unit of work', () => {
    expect(blankStore().store.stream.unitOfWork).toBeNull()
  })

  it.each([['epic'], [''], [null], [5]])(
    'refuses %j as the unit of work',
    (unit) => {
      const { store, persist } = blankStore()

      expect(store.setScope({ unitOfWork: unit })).toEqual(refused)

      expect(store.stream.unitOfWork).toBeNull()
      expect(persist).not.toHaveBeenCalled()
    }
  )

  it.each([[1], [7.5], [24]])('accepts a working day of %s hours', (hours) => {
    const { store } = blankStore()

    expect(store.setScope({ workdayHours: hours })).toMatchObject({ ok: true })

    expect(store.stream.workdayHours).toBe(hours)
  })

  it.each([[0], [25], [-3], [NaN], [Infinity], ['8'], [null]])(
    'refuses a working day of %j',
    (hours) => {
      const { store, persist } = blankStore()

      expect(store.setScope({ workdayHours: hours })).toEqual(refused)

      expect(store.stream.workdayHours).toBe(8)
      expect(persist).not.toHaveBeenCalled()
    }
  )

  it.each([['trigger'], ['endPoint']])(
    'refuses a %s that is not text',
    (field) => {
      const { store, persist } = blankStore()

      expect(store.setScope({ [field]: undefined })).toEqual(refused)

      expect(persist).not.toHaveBeenCalled()
    }
  )

  it('refuses a field that is not part of scope', () => {
    const { store, persist } = blankStore()

    expect(store.setScope({ id: 'other' })).toEqual(refused)

    expect(store.stream.id).not.toBe('other')
    expect(persist).not.toHaveBeenCalled()
  })

  it('refuses the whole edit when one field is invalid', () => {
    const { store } = blankStore()

    store.setScope({ trigger: 'A customer asks', workdayHours: 30 })

    expect(store.stream.trigger).toBe('')
  })

  it('leaves history and storage alone when nothing changes', () => {
    const { store, persist } = openStream()

    expect(store.setScope({ name: 'Checkout delivery' })).toMatchObject({
      ok: true,
    })
    expect(store.setScope({})).toMatchObject({ ok: true })

    expect(store.canUndo).toBe(false)
    expect(persist).not.toHaveBeenCalled()
  })

  it('undo and redo move each field back and forth', () => {
    const { store } = blankStore()
    store.setScope({ unitOfWork: 'story' })

    store.undo()
    expect(store.stream.unitOfWork).toBeNull()

    store.redo()
    expect(store.stream.unitOfWork).toBe('story')
  })

  it.each([
    ['name', 'Checkout v2', /value stream name/i],
    ['trigger', 'A customer asks', /trigger/i],
    ['endPoint', 'It is live', /end point/i],
    ['unitOfWork', 'story', /unit of work/i],
    ['workdayHours', 7.5, /working day/i],
  ])('names the %s in the undo announcement', (field, value, label) => {
    const { store } = blankStore()
    store.setScope({ [field]: value })

    expect(store.undo().announcement).toMatch(label)
    expect(store.redo().announcement).toMatch(label)
  })

  it('names the scope when several fields change together', () => {
    const { store } = blankStore()
    store.setScope({ trigger: 'A customer asks', endPoint: 'It is live' })

    expect(store.undo().announcement).toMatch(/scope/i)
  })
})
