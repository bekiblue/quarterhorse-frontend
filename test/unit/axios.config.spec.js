import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock axios module
vi.mock('axios', async () => {
  const actual = await vi.importActual('axios')
  
  return {
    default: {
      ...actual.default,
      create: (config) => {
        // Create a real axios instance but mock its request method
        const instance = actual.default.create(config)
        const originalRequest = instance.request.bind(instance)
        
        // Make instance callable (axios instances are functions)
        const callableInstance = function(config) {
          return callableInstance.request(config)
        }
        
        // Copy all properties from instance to callable function
        Object.setPrototypeOf(callableInstance, instance)
        Object.assign(callableInstance, instance)
        
        // Mock request to prevent real HTTP calls
        callableInstance.request = vi.fn().mockImplementation((config) => {
          // Return a resolved promise to simulate success
          return Promise.resolve({ data: 'mocked', status: 200, config })
        })
        
        return callableInstance
      }
    }
  }
})

// Mock the auth store
const mockAuthStore = {
  isAuthenticated: false,
  accessToken: null,
  refreshToken: vi.fn(),
  logout: vi.fn(),
  router: {
    push: vi.fn()
  }
}

vi.mock('stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore)
}))

describe('axios.config.js', () => {
  let apiClient

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Reset mock auth store
    mockAuthStore.isAuthenticated = false
    mockAuthStore.accessToken = null
    mockAuthStore.refreshToken = vi.fn()
    mockAuthStore.logout = vi.fn()
    
    // Re-import apiClient to get fresh instance
    const module = await import('../../src/config/axios.js')
    apiClient = module.default
    
    // Ensure apiClient.request is mocked for retry tests
    apiClient.request = vi.fn().mockResolvedValue({ data: 'success', status: 200 })
  })

  describe('Request Interceptor', () => {
    it('should add Authorization header when authenticated', async () => {
      mockAuthStore.isAuthenticated = true
      mockAuthStore.accessToken = 'test-access-token'

      // Mock axios request
      const config = { headers: {} }
      const requestInterceptor = apiClient.interceptors.request.handlers[0]
      
      const result = requestInterceptor.fulfilled(config)

      expect(result.headers.Authorization).toBe('Bearer test-access-token')
    })

    it('should not add Authorization header when not authenticated', async () => {
      mockAuthStore.isAuthenticated = false
      mockAuthStore.accessToken = null

      const config = { headers: {} }
      const requestInterceptor = apiClient.interceptors.request.handlers[0]
      
      const result = requestInterceptor.fulfilled(config)

      expect(result.headers.Authorization).toBeUndefined()
    })
  })

  describe('Response Interceptor - 401 Handling', () => {
    it('should refresh token on 401 and retry request', async () => {
      mockAuthStore.isAuthenticated = true
      mockAuthStore.accessToken = 'new-token'
      mockAuthStore.refreshToken.mockResolvedValue(true)

      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: false }
      }

      const responseInterceptor = apiClient.interceptors.response.handlers[0]

      // Ensure apiClient.request is mocked
      apiClient.request = vi.fn().mockResolvedValue({ data: 'success' })

      const result = await responseInterceptor.rejected(error)

      expect(mockAuthStore.refreshToken).toHaveBeenCalled()
      expect(apiClient.request).toHaveBeenCalled()
    })

    it('should logout when refresh token fails', async () => {
      mockAuthStore.isAuthenticated = true
      mockAuthStore.refreshToken.mockRejectedValue(new Error('Refresh failed'))

      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: false }
      }

      const responseInterceptor = apiClient.interceptors.response.handlers[0]

      try {
        await responseInterceptor.rejected(error)
      } catch (e) {
        // Expected to throw
      }

      expect(mockAuthStore.logout).toHaveBeenCalledWith(false)
      expect(mockAuthStore.router.push).toHaveBeenCalledWith('/login')
    })
  })

  describe('Response Interceptor - 429 Rate Limiting', () => {
    it('should retry after delay on 429 status', async () => {
      vi.useFakeTimers()

      const error = {
        response: { 
          status: 429,
          headers: { 'retry-after': '2' }
        },
        config: { headers: {} }
      }

      const responseInterceptor = apiClient.interceptors.response.handlers[0]
      
      apiClient.request = vi.fn().mockResolvedValue({ data: 'success' })

      const promise = responseInterceptor.rejected(error)
      
      // Fast-forward time
      await vi.advanceTimersByTimeAsync(2000)
      
      await promise

      expect(error.config._retryCount).toBe(1)
      expect(apiClient.request).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('should not retry 429 more than once', async () => {
      const error = {
        response: { 
          status: 429,
          headers: { 'retry-after': '1' }
        },
        config: { headers: {}, _retryCount: 1 }
      }

      const responseInterceptor = apiClient.interceptors.response.handlers[0]

      await expect(responseInterceptor.rejected(error)).rejects.toEqual(error)
    })
  })

  describe('Response Interceptor - 5xx Server Errors', () => {
    it('should retry on 500 server error with exponential backoff', async () => {
      vi.useFakeTimers()

      const error = {
        response: { status: 500 },
        config: { headers: {} }
      }

      const responseInterceptor = apiClient.interceptors.response.handlers[0]
      
      apiClient.request = vi.fn().mockResolvedValue({ data: 'success' })

      const promise = responseInterceptor.rejected(error)
      
      // Fast-forward time (2^1 * 1000 = 2000ms)
      await vi.advanceTimersByTimeAsync(2000)
      
      await promise

      expect(error.config._retryCount).toBe(1)
      expect(apiClient.request).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('should not retry 5xx errors more than twice', async () => {
      const error = {
        response: { status: 503 },
        config: { headers: {}, _retryCount: 2 }
      }

      const responseInterceptor = apiClient.interceptors.response.handlers[0]

      await expect(responseInterceptor.rejected(error)).rejects.toEqual(error)
    })
  })

  describe('Response Interceptor - Other Errors', () => {
    it('should throw error for non-retryable status codes', async () => {
      const error = {
        response: { status: 400 },
        config: { headers: {} }
      }

      const responseInterceptor = apiClient.interceptors.response.handlers[0]

      await expect(responseInterceptor.rejected(error)).rejects.toEqual(error)
    })
  })
})

