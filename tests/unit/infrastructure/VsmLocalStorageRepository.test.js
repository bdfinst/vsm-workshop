import { describe, it, expect, beforeEach } from 'vitest'
import { createVsmLocalStorageRepository } from '../../../src/infrastructure/VsmLocalStorageRepository.js'

const TEST_KEY = 'test-vsm-storage'

describe('VsmLocalStorageRepository', () => {
  let repo

  beforeEach(() => {
    localStorage.clear()
    repo = createVsmLocalStorageRepository(TEST_KEY)
  })

  describe('save', () => {
    it('persists data to localStorage', () => {
      const data = { id: '1', name: 'Test Map', steps: [], connections: [] }

      repo.save(data)

      const stored = JSON.parse(localStorage.getItem(TEST_KEY))
      expect(stored.id).toBe('1')
      expect(stored.name).toBe('Test Map')
    })

    it('overwrites previous data', () => {
      repo.save({ id: '1', name: 'First' })
      repo.save({ id: '2', name: 'Second' })

      const stored = JSON.parse(localStorage.getItem(TEST_KEY))
      expect(stored.id).toBe('2')
      expect(stored.name).toBe('Second')
    })
  })

  describe('load', () => {
    it('returns default when nothing stored', () => {
      const defaults = { id: null, name: '', steps: [] }
      const result = repo.load(defaults)

      expect(result).toEqual(defaults)
    })

    it('returns stored data', () => {
      const data = { id: '1', name: 'Stored Map', steps: [{ id: 's1' }] }
      localStorage.setItem(TEST_KEY, JSON.stringify(data))

      const result = repo.load({ id: null })

      expect(result.id).toBe('1')
      expect(result.name).toBe('Stored Map')
    })

    it('applies sanitize function when provided', () => {
      const data = { id: '1', name: 'Raw', extra: 'junk' }
      localStorage.setItem(TEST_KEY, JSON.stringify(data))

      const sanitize = (raw) => ({ id: raw.id, name: raw.name.toUpperCase() })
      const result = repo.load({ id: null }, sanitize)

      expect(result.name).toBe('RAW')
      expect(result.extra).toBeUndefined()
    })

    it('returns default for corrupted JSON', () => {
      localStorage.setItem(TEST_KEY, '{bad json')
      const defaults = { id: null, name: '' }

      const result = repo.load(defaults)

      expect(result).toEqual(defaults)
    })
  })

  describe('clear', () => {
    it('removes data from localStorage', () => {
      repo.save({ id: '1' })
      expect(localStorage.getItem(TEST_KEY)).not.toBeNull()

      repo.clear()

      expect(localStorage.getItem(TEST_KEY)).toBeNull()
    })
  })

  describe('unavailable localStorage', () => {
    it('gracefully handles save when localStorage throws', () => {
      const throwingRepo = createVsmLocalStorageRepository(TEST_KEY)
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = () => {
        throw new Error('QuotaExceeded')
      }

      expect(() => throwingRepo.save({ id: '1' })).not.toThrow()

      Storage.prototype.setItem = original
    })

    it('returns default on load when localStorage throws', () => {
      const throwingRepo = createVsmLocalStorageRepository(TEST_KEY)
      const original = Storage.prototype.getItem
      Storage.prototype.getItem = () => {
        throw new Error('SecurityError')
      }

      const defaults = { id: null }
      const result = throwingRepo.load(defaults)
      expect(result).toEqual(defaults)

      Storage.prototype.getItem = original
    })
  })
})
