import { describe, it, expect } from 'vitest'
import {
  isTextEntry,
  menuActionFor,
  menuIndexFor,
  shortcutFor,
} from '../../../src/utils/ui/keymap.js'

const press = (key, modifiers = {}) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...modifiers,
})

describe('shortcutFor', () => {
  it.each([
    { name: 'Ctrl+Z', event: press('z', { ctrlKey: true }), action: 'undo' },
    { name: 'Cmd+Z', event: press('z', { metaKey: true }), action: 'undo' },
    {
      name: 'Ctrl+Shift+Z',
      event: press('z', { ctrlKey: true, shiftKey: true }),
      action: 'redo',
    },
    {
      name: 'Cmd+Shift+Z',
      event: press('z', { metaKey: true, shiftKey: true }),
      action: 'redo',
    },
    // Shift makes browsers report the capital letter.
    {
      name: 'Ctrl+Shift+Z as a capital',
      event: press('Z', { ctrlKey: true, shiftKey: true }),
      action: 'redo',
    },
  ])('$name is $action', ({ event, action }) => {
    expect(shortcutFor(event)).toBe(action)
  })

  it.each([
    ['Z with no modifier', press('z')],
    ['Shift+Z with no Ctrl or Cmd', press('Z', { shiftKey: true })],
    ['Ctrl+Alt+Z', press('z', { ctrlKey: true, altKey: true })],
    ['Ctrl+Y', press('y', { ctrlKey: true })],
    ['Ctrl+X', press('x', { ctrlKey: true })],
  ])('%s is not a shortcut', (_name, event) => {
    expect(shortcutFor(event)).toBeNull()
  })

  it.each([
    ['Ctrl+Z', press('z', { ctrlKey: true })],
    ['Cmd+Z', press('z', { metaKey: true })],
    ['Ctrl+Shift+Z', press('z', { ctrlKey: true, shiftKey: true })],
  ])(
    '%s is left to the browser while a text field has focus',
    (_name, event) => {
      expect(shortcutFor(event, { inTextField: true })).toBeNull()
    }
  )
})

describe('isTextEntry', () => {
  it.each([
    ['a text input', { tagName: 'INPUT', type: 'text' }],
    ['a search input', { tagName: 'INPUT', type: 'search' }],
    ['a number input', { tagName: 'INPUT', type: 'number' }],
    ['an input with no type', { tagName: 'INPUT' }],
    ['a textarea', { tagName: 'TEXTAREA' }],
    ['editable content', { tagName: 'DIV', isContentEditable: true }],
  ])('%s takes text', (_name, element) => {
    expect(isTextEntry(element)).toBe(true)
  })

  it.each([
    ['a button', { tagName: 'BUTTON' }],
    ['a checkbox', { tagName: 'INPUT', type: 'checkbox' }],
    ['a radio', { tagName: 'INPUT', type: 'radio' }],
    ['a range', { tagName: 'INPUT', type: 'range' }],
    ['plain content', { tagName: 'DIV', isContentEditable: false }],
    ['nothing focused', null],
  ])('%s does not take text', (_name, element) => {
    expect(isTextEntry(element)).toBe(false)
  })
})

describe('menuActionFor', () => {
  it.each([
    ['ArrowDown', 'next'],
    ['ArrowUp', 'previous'],
    ['Home', 'first'],
    ['End', 'last'],
    ['Escape', 'close'],
    ['Tab', 'leave'],
  ])('%s is %s', (key, action) => {
    expect(menuActionFor(press(key))).toBe(action)
  })

  it.each([
    ['a letter', press('a')],
    ['Enter, which activates the item itself', press('Enter')],
    ['Ctrl+ArrowDown', press('ArrowDown', { ctrlKey: true })],
    ['Alt+ArrowUp', press('ArrowUp', { altKey: true })],
  ])('%s is not for the menu', (_name, event) => {
    expect(menuActionFor(event)).toBeNull()
  })
})

describe('menuActionFor leaving', () => {
  it('Shift+Tab leaves the menu too', () => {
    expect(menuActionFor(press('Tab', { shiftKey: true }))).toBe('leave')
  })
})

describe('menuIndexFor', () => {
  it('moves down and up, wrapping at the ends', () => {
    expect(menuIndexFor('next', 0, 4)).toBe(1)
    expect(menuIndexFor('next', 3, 4)).toBe(0)
    expect(menuIndexFor('previous', 2, 4)).toBe(1)
    expect(menuIndexFor('previous', 0, 4)).toBe(3)
  })

  it('jumps to the first and last items', () => {
    expect(menuIndexFor('first', 2, 4)).toBe(0)
    expect(menuIndexFor('last', 1, 4)).toBe(3)
  })

  it('starts from the first item when none has focus', () => {
    expect(menuIndexFor('next', -1, 4)).toBe(0)
    expect(menuIndexFor('previous', -1, 4)).toBe(3)
  })

  it('stays put for actions that do not move', () => {
    expect(menuIndexFor('close', 2, 4)).toBe(2)
  })
})
