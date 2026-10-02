import { describe, it, expect } from 'vitest'
import { isTextEntry, shortcutFor } from '../../../src/utils/ui/keymap.js'

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
    ['Ctrl+Z', press('z', { ctrlKey: true }), 'undo'],
    ['Cmd+Z', press('z', { metaKey: true }), 'undo'],
    ['Ctrl+Shift+Z', press('z', { ctrlKey: true, shiftKey: true }), 'redo'],
    ['Cmd+Shift+Z', press('z', { metaKey: true, shiftKey: true }), 'redo'],
    // Shift makes browsers report the capital letter.
    [
      'Ctrl+Shift+Z as a capital',
      press('Z', { ctrlKey: true, shiftKey: true }),
      'redo',
    ],
  ])('%s is %s', (_name, event, action) => {
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
