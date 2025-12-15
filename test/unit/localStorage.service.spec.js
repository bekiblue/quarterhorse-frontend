import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import localStorageService from 'services/localStorage.service'

describe('localStorage.service.js', () => {
  let originalConsoleError

  beforeEach(() => {
    // Mock console.error to verify error logging without polluting test output
    originalConsoleError = console.error
    console.error = vi.fn()

    // Reset localStorage mock with default implementations
    globalThis.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }
  })

  afterEach(() => {
    // Restore original console.error
    console.error = originalConsoleError
  })

  describe('getItem()', () => {
    it('should return parsed JSON object when valid JSON object stored', () => {
      const mockObject = { name: 'John', age: 30 }
      globalThis.localStorage.getItem.mockReturnValue(JSON.stringify(mockObject))

      const result = localStorageService.getItem('user')

      expect(result).toEqual(mockObject)
      expect(globalThis.localStorage.getItem).toHaveBeenCalledWith('user')
    })

    it('should return parsed JSON array when valid JSON array stored', () => {
      const mockArray = ['item1', 'item2', 'item3']
      globalThis.localStorage.getItem.mockReturnValue(JSON.stringify(mockArray))

      const result = localStorageService.getItem('items')

      expect(result).toEqual(mockArray)
    })

    it('should return string when non-JSON string stored', () => {
      globalThis.localStorage.getItem.mockReturnValue('plain string')

      const result = localStorageService.getItem('key')

      expect(result).toBe('plain string')
    })

    it('should return null when key does not exist', () => {
      globalThis.localStorage.getItem.mockReturnValue(null)

      const result = localStorageService.getItem('nonexistent')

      expect(result).toBeNull()
    })

    it('should return null when localStorage.getItem throws error', () => {
      const error = new Error('Storage error')
      globalThis.localStorage.getItem.mockImplementation(() => {
        throw error
      })

      const result = localStorageService.getItem('key')

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error getting item from localStorage'),
        error
      )
    })

    it('should log error and return null on SecurityError', () => {
      const securityError = new DOMException('SecurityError', 'SecurityError')
      globalThis.localStorage.getItem.mockImplementation(() => {
        throw securityError
      })

      const result = localStorageService.getItem('key')

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalled()
    })

    it('should handle nested JSON objects correctly', () => {
      const complexObj = {
        user: {
          name: 'John',
          roles: ['admin', 'user'],
          settings: { theme: 'dark' },
        },
      }
      globalThis.localStorage.getItem.mockReturnValue(JSON.stringify(complexObj))

      const result = localStorageService.getItem('complex')

      expect(result).toEqual(complexObj)
    })

    it('should handle empty string value', () => {
      globalThis.localStorage.getItem.mockReturnValue('')

      const result = localStorageService.getItem('key')

      expect(result).toBe('')
    })

    it('should return string when JSON parse fails on malformed JSON', () => {
      globalThis.localStorage.getItem.mockReturnValue('{invalid json}')

      const result = localStorageService.getItem('key')

      expect(result).toBe('{invalid json}')
    })
  })

  describe('setItem()', () => {
    it('should store string value as-is', () => {
      localStorageService.setItem('key', 'string value')

      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith('key', 'string value')
    })

    it('should stringify object before storing', () => {
      const obj = { name: 'Test', value: 123 }
      localStorageService.setItem('key', obj)

      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith('key', JSON.stringify(obj))
    })

    it('should stringify array before storing', () => {
      const arr = [1, 2, 3]
      localStorageService.setItem('key', arr)

      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith('key', JSON.stringify(arr))
    })

    it('should stringify boolean value', () => {
      localStorageService.setItem('key', true)

      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith('key', 'true')
    })

    it('should stringify null value', () => {
      localStorageService.setItem('key', null)

      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith('key', 'null')
    })

    it('should stringify number value', () => {
      localStorageService.setItem('key', 42)

      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith('key', '42')
    })

    it('should handle QuotaExceededError gracefully (log but not throw)', () => {
      const quotaError = new DOMException('QuotaExceededError', 'QuotaExceededError')
      globalThis.localStorage.setItem.mockImplementation(() => {
        throw quotaError
      })

      expect(() => localStorageService.setItem('key', 'value')).not.toThrow()

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error setting item in localStorage'),
        quotaError
      )
    })

    it('should handle SecurityError gracefully', () => {
      const securityError = new DOMException('SecurityError', 'SecurityError')
      globalThis.localStorage.setItem.mockImplementation(() => {
        throw securityError
      })

      expect(() => localStorageService.setItem('key', 'value')).not.toThrow()

      expect(console.error).toHaveBeenCalled()
    })

    it('should call localStorage.setItem with correct parameters', () => {
      const mockData = { test: 'data' }
      localStorageService.setItem('testKey', mockData)

      expect(globalThis.localStorage.setItem).toHaveBeenCalledTimes(1)
      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith('testKey', JSON.stringify(mockData))
    })
  })

  describe('removeItem()', () => {
    it('should call localStorage.removeItem with correct key', () => {
      localStorageService.removeItem('keyToRemove')

      expect(globalThis.localStorage.removeItem).toHaveBeenCalledWith('keyToRemove')
      expect(globalThis.localStorage.removeItem).toHaveBeenCalledTimes(1)
    })

    it('should handle error gracefully when remove fails', () => {
      const error = new Error('Remove error')
      globalThis.localStorage.removeItem.mockImplementation(() => {
        throw error
      })

      expect(() => localStorageService.removeItem('key')).not.toThrow()

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error removing item from localStorage'),
        error
      )
    })

    it('should log error when SecurityError occurs', () => {
      const securityError = new DOMException('SecurityError', 'SecurityError')
      globalThis.localStorage.removeItem.mockImplementation(() => {
        throw securityError
      })

      localStorageService.removeItem('key')

      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('clear()', () => {
    it('should call localStorage.clear', () => {
      localStorageService.clear()

      expect(globalThis.localStorage.clear).toHaveBeenCalled()
      expect(globalThis.localStorage.clear).toHaveBeenCalledTimes(1)
    })

    it('should handle error gracefully when clear fails', () => {
      const error = new Error('Clear error')
      globalThis.localStorage.clear.mockImplementation(() => {
        throw error
      })

      expect(() => localStorageService.clear()).not.toThrow()

      expect(console.error).toHaveBeenCalledWith('Error clearing localStorage', error)
    })

    it('should log error on exception', () => {
      const error = new DOMException('SecurityError', 'SecurityError')
      globalThis.localStorage.clear.mockImplementation(() => {
        throw error
      })

      localStorageService.clear()

      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('isAvailable()', () => {
    it('should return true when localStorage is available', () => {
      globalThis.localStorage.setItem.mockImplementation(() => {})
      globalThis.localStorage.removeItem.mockImplementation(() => {})

      const result = localStorageService.isAvailable()

      expect(result).toBe(true)
      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith(
        '__localStorage_test__',
        'test'
      )
      expect(globalThis.localStorage.removeItem).toHaveBeenCalledWith('__localStorage_test__')
    })

    it('should return false when localStorage throws error', () => {
      globalThis.localStorage.setItem.mockImplementation(() => {
        throw new Error('Not available')
      })

      const result = localStorageService.isAvailable()

      expect(result).toBe(false)
    })

    it('should cleanup test key after checking', () => {
      globalThis.localStorage.setItem.mockImplementation(() => {})
      globalThis.localStorage.removeItem.mockImplementation(() => {})

      localStorageService.isAvailable()

      expect(globalThis.localStorage.removeItem).toHaveBeenCalledWith('__localStorage_test__')
    })

    it('should return false on QuotaExceededError', () => {
      const quotaError = new DOMException('QuotaExceededError', 'QuotaExceededError')
      globalThis.localStorage.setItem.mockImplementation(() => {
        throw quotaError
      })

      const result = localStorageService.isAvailable()

      expect(result).toBe(false)
    })

    it('should return false on SecurityError', () => {
      const securityError = new DOMException('SecurityError', 'SecurityError')
      globalThis.localStorage.setItem.mockImplementation(() => {
        throw securityError
      })

      const result = localStorageService.isAvailable()

      expect(result).toBe(false)
    })
  })
})
