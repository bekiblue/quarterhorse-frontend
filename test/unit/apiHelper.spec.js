import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Notify } from 'quasar'
import { handleAuthRequest, handleOAuthRequest } from '@/utils/apiHelper'

// Mock Quasar Notify
vi.mock('quasar', () => ({
  Notify: {
    create: vi.fn(),
  },
}))

describe('apiHelper.js', () => {
  // Helper factories
  const createMockStore = () => ({
    setAuthData: vi.fn(),
  })

  const createMockRouter = () => ({
    push: vi.fn(),
  })

  const createSuccessResponse = (overrides = {}) => ({
    data: {
      success: true,
      person: { id: 1, name: 'Test User', email: 'test@example.com', role: 'user' },
      access_token: 'test-access-token',
      expiry: Math.floor(Date.now() / 1000) + 3600,
      ...overrides,
    },
  })

  const createFailureResponse = (message = 'Authentication failed') => ({
    data: {
      success: false,
      message,
    },
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleAuthRequest()', () => {
    describe('Success scenarios', () => {
      it('should set auth data on success', async () => {
        const store = createMockStore()
        const router = createMockRouter()
        const requestFn = vi.fn().mockResolvedValue(createSuccessResponse())

        const result = await handleAuthRequest(store, requestFn, router)

        expect(result).toBe(true)
        expect(store.setAuthData).toHaveBeenCalledWith({
          user: expect.objectContaining({ id: 1, name: 'Test User' }),
          accessToken: 'test-access-token',
          accessTokenExpiry: expect.any(Number),
        })
      })

      it('should navigate to dashboard on success', async () => {
        const store = createMockStore()
        const router = createMockRouter()
        const requestFn = vi.fn().mockResolvedValue(createSuccessResponse())

        await handleAuthRequest(store, requestFn, router)

        expect(router.push).toHaveBeenCalledWith('/dashboard')
      })

      it('should return true on success', async () => {
        const store = createMockStore()
        const router = createMockRouter()
        const requestFn = vi.fn().mockResolvedValue(createSuccessResponse())

        const result = await handleAuthRequest(store, requestFn, router)

        expect(result).toBe(true)
      })

      it('should call store.setAuthData with correct structure', async () => {
        const store = createMockStore()
        const router = createMockRouter()
        const mockPerson = { id: 5, name: 'John Doe', email: 'john@example.com', role: 'admin' }
        const mockToken = 'custom-token-123'
        const mockExpiry = Math.floor(Date.now() / 1000) + 7200

        const requestFn = vi.fn().mockResolvedValue(
          createSuccessResponse({
            person: mockPerson,
            access_token: mockToken,
            expiry: mockExpiry,
          })
        )

        await handleAuthRequest(store, requestFn, router)

        expect(store.setAuthData).toHaveBeenCalledWith({
          user: mockPerson,
          accessToken: mockToken,
          accessTokenExpiry: mockExpiry,
        })
      })

      it('should not show notification on success', async () => {
        const store = createMockStore()
        const router = createMockRouter()
        const requestFn = vi.fn().mockResolvedValue(createSuccessResponse())

        await handleAuthRequest(store, requestFn, router)

        expect(Notify.create).not.toHaveBeenCalled()
      })
    })

    describe('Failure scenarios', () => {
      it('should show error notification when response.data.success is false', async () => {
        const store = createMockStore()
        const router = createMockRouter()
        const requestFn = vi.fn().mockResolvedValue(createFailureResponse('Invalid credentials'))

        await handleAuthRequest(store, requestFn, router)

        expect(Notify.create).toHaveBeenCalledWith({
          message: 'Invalid credentials',
          color: 'negative',
        })
      })

      it('should return false when response.data.success is false', async () => {
        const store = createMockStore()
        const router = createMockRouter()
        const requestFn = vi.fn().mockResolvedValue(createFailureResponse())

        const result = await handleAuthRequest(store, requestFn, router)

        expect(result).toBe(false)
      })

      it('should not call setAuthData when authentication fails', async () => {
        const store = createMockStore()
        const router = createMockRouter()
        const requestFn = vi.fn().mockResolvedValue(createFailureResponse())

        await handleAuthRequest(store, requestFn, router)

        expect(store.setAuthData).not.toHaveBeenCalled()
      })

      it('should not navigate when authentication fails', async () => {
        const store = createMockStore()
        const router = createMockRouter()
        const requestFn = vi.fn().mockResolvedValue(createFailureResponse())

        await handleAuthRequest(store, requestFn, router)

        expect(router.push).not.toHaveBeenCalled()
      })

      it('should show notification with undefined message when message is missing', async () => {
        const store = createMockStore()
        const router = createMockRouter()
        const requestFn = vi.fn().mockResolvedValue({
          data: {
            success: false,
          },
        })

        await handleAuthRequest(store, requestFn, router)

        expect(Notify.create).toHaveBeenCalledWith({
          message: undefined,
          color: 'negative',
        })
      })
    })

    describe('Request error scenarios', () => {
      it('should show generic error notification when request throws', async () => {
        const store = createMockStore()
        const router = createMockRouter()
        const requestFn = vi.fn().mockRejectedValue(new Error('Network error'))

        await handleAuthRequest(store, requestFn, router)

        expect(Notify.create).toHaveBeenCalledWith({
          message: 'An unknown error occurred',
          color: 'negative',
        })
      })

      it('should return false when request throws', async () => {
        const store = createMockStore()
        const router = createMockRouter()
        const requestFn = vi.fn().mockRejectedValue(new Error('Network error'))

        const result = await handleAuthRequest(store, requestFn, router)

        expect(result).toBe(false)
      })

      it('should handle network errors gracefully', async () => {
        const store = createMockStore()
        const router = createMockRouter()
        const networkError = new Error('ECONNREFUSED')
        const requestFn = vi.fn().mockRejectedValue(networkError)

        const result = await handleAuthRequest(store, requestFn, router)

        expect(result).toBe(false)
        expect(store.setAuthData).not.toHaveBeenCalled()
        expect(router.push).not.toHaveBeenCalled()
      })

      it('should handle timeout errors gracefully', async () => {
        const store = createMockStore()
        const router = createMockRouter()
        const timeoutError = new Error('timeout')
        const requestFn = vi.fn().mockRejectedValue(timeoutError)

        const result = await handleAuthRequest(store, requestFn, router)

        expect(result).toBe(false)
      })
    })

    describe('Edge cases', () => {
      it('should handle missing response.data', async () => {
        const store = createMockStore()
        const router = createMockRouter()
        const requestFn = vi.fn().mockResolvedValue({})

        const result = await handleAuthRequest(store, requestFn, router)

        expect(result).toBe(false)
        expect(Notify.create).toHaveBeenCalled()
      })

      it('should handle malformed response structure', async () => {
        const store = createMockStore()
        const router = createMockRouter()
        const requestFn = vi.fn().mockResolvedValue({
          data: {
            success: true,
            // Missing person, access_token, expiry
          },
        })

        const result = await handleAuthRequest(store, requestFn, router)

        expect(result).toBe(true)
        expect(store.setAuthData).toHaveBeenCalledWith({
          user: undefined,
          accessToken: undefined,
          accessTokenExpiry: undefined,
        })
      })
    })
  })

  describe('handleOAuthRequest()', () => {
    describe('Success scenarios', () => {
      it('should set auth data on success', async () => {
        const store = createMockStore()
        const requestFn = vi.fn().mockResolvedValue(createSuccessResponse())

        const result = await handleOAuthRequest(store, requestFn)

        expect(result.success).toBe(true)
        expect(store.setAuthData).toHaveBeenCalledWith({
          user: expect.objectContaining({ id: 1, name: 'Test User' }),
          accessToken: 'test-access-token',
          accessTokenExpiry: expect.any(Number),
        })
      })

      it('should return success object with user data', async () => {
        const store = createMockStore()
        const mockPerson = { id: 2, name: 'OAuth User', email: 'oauth@example.com', role: 'user' }
        const requestFn = vi.fn().mockResolvedValue(
          createSuccessResponse({
            person: mockPerson,
          })
        )

        const result = await handleOAuthRequest(store, requestFn)

        expect(result).toEqual({
          success: true,
          user: mockPerson,
        })
      })

      it('should return true success field', async () => {
        const store = createMockStore()
        const requestFn = vi.fn().mockResolvedValue(createSuccessResponse())

        const result = await handleOAuthRequest(store, requestFn)

        expect(result.success).toBe(true)
      })

      it('should call store.setAuthData with correct structure', async () => {
        const store = createMockStore()
        const mockToken = 'oauth-token-abc'
        const mockExpiry = Math.floor(Date.now() / 1000) + 3600
        const requestFn = vi.fn().mockResolvedValue(
          createSuccessResponse({
            access_token: mockToken,
            expiry: mockExpiry,
          })
        )

        await handleOAuthRequest(store, requestFn)

        expect(store.setAuthData).toHaveBeenCalledWith({
          user: expect.any(Object),
          accessToken: mockToken,
          accessTokenExpiry: mockExpiry,
        })
      })

      it('should not navigate (OAuth has different flow)', async () => {
        const store = createMockStore()
        const router = createMockRouter()
        const requestFn = vi.fn().mockResolvedValue(createSuccessResponse())

        await handleOAuthRequest(store, requestFn)

        // Router should not be passed or used in OAuth flow
        expect(router.push).not.toHaveBeenCalled()
      })
    })

    describe('Failure scenarios', () => {
      it('should return error object when response.data.success is false', async () => {
        const store = createMockStore()
        const requestFn = vi.fn().mockResolvedValue(createFailureResponse('OAuth failed'))

        const result = await handleOAuthRequest(store, requestFn)

        expect(result).toEqual({
          success: false,
          error: 'OAuth failed',
        })
      })

      it('should not call setAuthData when OAuth fails', async () => {
        const store = createMockStore()
        const requestFn = vi.fn().mockResolvedValue(createFailureResponse())

        await handleOAuthRequest(store, requestFn)

        expect(store.setAuthData).not.toHaveBeenCalled()
      })

      it('should include error message in return object', async () => {
        const store = createMockStore()
        const errorMessage = 'Access denied by user'
        const requestFn = vi.fn().mockResolvedValue(createFailureResponse(errorMessage))

        const result = await handleOAuthRequest(store, requestFn)

        expect(result.error).toBe(errorMessage)
      })

      it('should use default error message when none provided', async () => {
        const store = createMockStore()
        const requestFn = vi.fn().mockResolvedValue({
          data: {
            success: false,
          },
        })

        const result = await handleOAuthRequest(store, requestFn)

        expect(result.error).toBe('OAuth authentication failed')
      })
    })

    describe('Request error scenarios', () => {
      it('should log error and return error object when request throws', async () => {
        const store = createMockStore()
        const error = new Error('Connection failed')
        const requestFn = vi.fn().mockRejectedValue(error)

        // Mock console.error to verify logging
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        const result = await handleOAuthRequest(store, requestFn)

        expect(consoleErrorSpy).toHaveBeenCalledWith('OAuth request error:', error)
        expect(result).toEqual({
          success: false,
          error: 'Connection failed',
        })

        consoleErrorSpy.mockRestore()
      })

      it('should include error.message in return object', async () => {
        const store = createMockStore()
        const errorMessage = 'Timeout exceeded'
        const requestFn = vi.fn().mockRejectedValue(new Error(errorMessage))

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        const result = await handleOAuthRequest(store, requestFn)

        expect(result.error).toBe(errorMessage)

        consoleErrorSpy.mockRestore()
      })

      it('should use default error message when error.message missing', async () => {
        const store = createMockStore()
        const requestFn = vi.fn().mockRejectedValue({})

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        const result = await handleOAuthRequest(store, requestFn)

        expect(result.error).toBe('OAuth request failed')

        consoleErrorSpy.mockRestore()
      })

      it('should not throw exception on request failure', async () => {
        const store = createMockStore()
        const requestFn = vi.fn().mockRejectedValue(new Error('Fatal error'))

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        await expect(handleOAuthRequest(store, requestFn)).resolves.toBeDefined()

        consoleErrorSpy.mockRestore()
      })
    })

    describe('Edge cases', () => {
      it('should handle missing response.data', async () => {
        const store = createMockStore()
        const requestFn = vi.fn().mockResolvedValue({})

        const result = await handleOAuthRequest(store, requestFn)

        expect(result.success).toBe(false)
        expect(result.error).toBe('OAuth authentication failed')
      })

      it('should handle empty error object', async () => {
        const store = createMockStore()
        const requestFn = vi.fn().mockRejectedValue({})

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        const result = await handleOAuthRequest(store, requestFn)

        expect(result).toEqual({
          success: false,
          error: 'OAuth request failed',
        })

        consoleErrorSpy.mockRestore()
      })
    })
  })
})
