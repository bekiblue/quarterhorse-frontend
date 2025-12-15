import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { Notify } from 'quasar'
import axios from 'config/axios'
import localStorageService from 'services/localStorage.service'
import { handleAuthRequest, handleOAuthRequest } from '@/utils/apiHelper'
import { useAuthStore } from 'stores/auth'

// Mock all dependencies
vi.mock('quasar', () => ({
  Notify: {
    create: vi.fn(),
  },
}))

vi.mock('config/axios', () => ({
  default: {
    post: vi.fn(),
  },
}))

vi.mock('services/localStorage.service', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
}))

vi.mock('@/utils/apiHelper', () => ({
  handleAuthRequest: vi.fn(),
  handleOAuthRequest: vi.fn(),
}))

describe('auth.store.js - Pinia Store', () => {
  // Helper factories
  const createMockUser = (overrides = {}) => ({
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    ...overrides,
  })

  const createValidExpiry = (minutesFromNow = 60) => {
    return Math.floor(Date.now() / 1000) + minutesFromNow * 60
  }

  const createExpiredExpiry = () => {
    return Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
  }

  beforeEach(() => {
    // Setup Pinia
    setActivePinia(createPinia())

    // Clear all mocks
    vi.clearAllMocks()

    // Reset localStorage mock
    localStorageService.getItem.mockReturnValue(null)
    localStorageService.setItem.mockImplementation(() => {})
    localStorageService.removeItem.mockImplementation(() => {})
    localStorageService.clear.mockImplementation(() => {})

    // Use fake timers for consistent time testing
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('State Initialization', () => {
    it('should initialize with default state when localStorage empty', () => {
      const store = useAuthStore()

      expect(store.user).toBeNull()
      expect(store.accessToken).toBeNull()
      expect(store.accessTokenExpiry).toBeNull()
      expect(store.invitationToken).toBeNull()
      expect(store.oauthErrorMessage).toBeNull()
    })

    it('should initialize from localStorage when data exists', () => {
      const mockUser = createMockUser()
      const mockToken = 'stored-token'
      const mockExpiry = createValidExpiry()

      localStorageService.getItem.mockImplementation((key) => {
        const values = {
          user: mockUser,
          accessToken: mockToken,
          accessTokenExpiry: mockExpiry,
          invitationToken: null,
          oauthErrorMessage: null,
        }
        return values[key] || null
      })

      const store = useAuthStore()

      expect(store.user).toEqual(mockUser)
      expect(store.accessToken).toBe(mockToken)
      expect(store.accessTokenExpiry).toBe(mockExpiry)
    })

    it('should handle all 5 state properties from localStorage', () => {
      const mockUser = createMockUser()
      const mockToken = 'token-abc'
      const mockExpiry = createValidExpiry()
      const mockInvitation = 'invitation-123'
      const mockError = 'OAuth error'

      localStorageService.getItem.mockImplementation((key) => {
        const values = {
          user: mockUser,
          accessToken: mockToken,
          accessTokenExpiry: mockExpiry,
          invitationToken: mockInvitation,
          oauthErrorMessage: mockError,
        }
        return values[key] || null
      })

      const store = useAuthStore()

      expect(store.user).toEqual(mockUser)
      expect(store.accessToken).toBe(mockToken)
      expect(store.accessTokenExpiry).toBe(mockExpiry)
      expect(store.invitationToken).toBe(mockInvitation)
      expect(store.oauthErrorMessage).toBe(mockError)
    })

    it('should default to null for missing localStorage values', () => {
      localStorageService.getItem.mockReturnValue(null)

      const store = useAuthStore()

      expect(store.user).toBeNull()
      expect(store.accessToken).toBeNull()
      expect(store.accessTokenExpiry).toBeNull()
    })
  })

  describe('Getters', () => {
    describe('isAuthenticated', () => {
      it('should return true when token exists and not expired', () => {
        const store = useAuthStore()
        store.accessToken = 'valid-token'
        store.accessTokenExpiry = createValidExpiry(10) // 10 mins from now

        expect(store.isAuthenticated).toBe(true)
      })

      it('should return false when no accessToken', () => {
        const store = useAuthStore()
        store.accessToken = null
        store.accessTokenExpiry = createValidExpiry()

        expect(store.isAuthenticated).toBe(false)
      })

      it('should return false when no accessTokenExpiry', () => {
        const store = useAuthStore()
        store.accessToken = 'token'
        store.accessTokenExpiry = null

        expect(store.isAuthenticated).toBe(false)
      })

      it('should return false when token is expired', () => {
        const store = useAuthStore()
        store.accessToken = 'expired-token'
        store.accessTokenExpiry = createExpiredExpiry()

        expect(store.isAuthenticated).toBe(false)
      })

      it('should return false when current time equals expiry', () => {
        const store = useAuthStore()
        store.accessToken = 'token'
        store.accessTokenExpiry = Math.floor(Date.now() / 1000) // Exactly now

        expect(store.isAuthenticated).toBe(false)
      })
    })

    describe('isTokenExpired', () => {
      it('should return true when no accessTokenExpiry', () => {
        const store = useAuthStore()
        store.accessTokenExpiry = null

        expect(store.isTokenExpired).toBe(true)
      })

      it('should return true when current time >= expiry', () => {
        const store = useAuthStore()
        store.accessTokenExpiry = createExpiredExpiry()

        expect(store.isTokenExpired).toBe(true)
      })

      it('should return false when token valid', () => {
        const store = useAuthStore()
        store.accessTokenExpiry = createValidExpiry(30)

        expect(store.isTokenExpired).toBe(false)
      })
    })

    describe('userRole', () => {
      it('should return user role when user exists', () => {
        const store = useAuthStore()
        store.user = createMockUser({ role: 'admin' })

        expect(store.userRole).toBe('admin')
      })

      it('should return null when user is null', () => {
        const store = useAuthStore()
        store.user = null

        expect(store.userRole).toBeNull()
      })

      it('should return null when role property missing', () => {
        const store = useAuthStore()
        store.user = { id: 1, name: 'Test' }

        expect(store.userRole).toBeNull()
      })
    })

    describe('userName', () => {
      it('should return user name when user exists', () => {
        const store = useAuthStore()
        store.user = createMockUser({ name: 'John Doe' })

        expect(store.userName).toBe('John Doe')
      })

      it('should return null when user is null', () => {
        const store = useAuthStore()
        store.user = null

        expect(store.userName).toBeNull()
      })

      it('should return null when name property missing', () => {
        const store = useAuthStore()
        store.user = { id: 1, role: 'user' }

        expect(store.userName).toBeNull()
      })
    })
  })

  describe('Actions - State Management', () => {
    describe('setAuthData()', () => {
      it('should update all state properties', () => {
        const store = useAuthStore()
        const mockUser = createMockUser()
        const mockToken = 'new-token'
        const mockExpiry = createValidExpiry()

        store.setAuthData({
          user: mockUser,
          accessToken: mockToken,
          accessTokenExpiry: mockExpiry,
        })

        expect(store.user).toEqual(mockUser)
        expect(store.accessToken).toBe(mockToken)
        expect(store.accessTokenExpiry).toBe(mockExpiry)
      })

      it('should persist to localStorage via service', () => {
        const store = useAuthStore()
        const mockUser = createMockUser()
        const mockToken = 'token-123'
        const mockExpiry = createValidExpiry()

        store.setAuthData({
          user: mockUser,
          accessToken: mockToken,
          accessTokenExpiry: mockExpiry,
        })

        expect(localStorageService.setItem).toHaveBeenCalledWith('user', mockUser)
        expect(localStorageService.setItem).toHaveBeenCalledWith('accessToken', mockToken)
        expect(localStorageService.setItem).toHaveBeenCalledWith('accessTokenExpiry', mockExpiry)
      })

      it('should handle partial user object', () => {
        const store = useAuthStore()
        const partialUser = { id: 5, name: 'Partial' }

        store.setAuthData({
          user: partialUser,
          accessToken: 'token',
          accessTokenExpiry: createValidExpiry(),
        })

        expect(store.user).toEqual(partialUser)
      })

      it('should verify localStorage.setItem called 3 times', () => {
        const store = useAuthStore()

        store.setAuthData({
          user: createMockUser(),
          accessToken: 'token',
          accessTokenExpiry: createValidExpiry(),
        })

        expect(localStorageService.setItem).toHaveBeenCalledTimes(3)
      })
    })

    describe('clearAuthData()', () => {
      it('should reset all auth state to null', () => {
        const store = useAuthStore()
        store.user = createMockUser()
        store.accessToken = 'token'
        store.accessTokenExpiry = createValidExpiry()

        store.clearAuthData()

        expect(store.user).toBeNull()
        expect(store.accessToken).toBeNull()
        expect(store.accessTokenExpiry).toBeNull()
      })

      it('should remove items from localStorage', () => {
        const store = useAuthStore()
        store.user = createMockUser()
        store.accessToken = 'token'
        store.accessTokenExpiry = createValidExpiry()

        store.clearAuthData()

        expect(localStorageService.removeItem).toHaveBeenCalledWith('user')
        expect(localStorageService.removeItem).toHaveBeenCalledWith('accessToken')
        expect(localStorageService.removeItem).toHaveBeenCalledWith('accessTokenExpiry')
      })

      it('should verify localStorage.removeItem called 3 times', () => {
        const store = useAuthStore()

        store.clearAuthData()

        expect(localStorageService.removeItem).toHaveBeenCalledTimes(3)
      })
    })

    describe('updateUser()', () => {
      it('should merge new data with existing user', () => {
        const store = useAuthStore()
        store.user = createMockUser({ name: 'Old Name', email: 'old@example.com' })

        store.updateUser({ name: 'New Name' })

        expect(store.user.name).toBe('New Name')
        expect(store.user.email).toBe('old@example.com')
      })

      it('should preserve unmodified properties', () => {
        const store = useAuthStore()
        store.user = createMockUser({ id: 5, name: 'Test', role: 'admin' })

        store.updateUser({ email: 'newemail@example.com' })

        expect(store.user.id).toBe(5)
        expect(store.user.name).toBe('Test')
        expect(store.user.role).toBe('admin')
        expect(store.user.email).toBe('newemail@example.com')
      })

      it('should persist merged user to localStorage', () => {
        const store = useAuthStore()
        store.user = createMockUser()

        store.updateUser({ name: 'Updated' })

        expect(localStorageService.setItem).toHaveBeenCalledWith('user', expect.objectContaining({ name: 'Updated' }))
      })

      it('should handle null user gracefully', () => {
        const store = useAuthStore()
        store.user = null

        store.updateUser({ name: 'New' })

        expect(store.user).toEqual({ name: 'New' })
      })
    })
  })

  describe('Actions - Token Management', () => {
    describe('setInvitationToken()', () => {
      it('should set state and localStorage', () => {
        const store = useAuthStore()

        store.setInvitationToken('invite-123')

        expect(store.invitationToken).toBe('invite-123')
        expect(localStorageService.setItem).toHaveBeenCalledWith('invitationToken', 'invite-123')
      })

      it('should handle string token', () => {
        const store = useAuthStore()

        store.setInvitationToken('test-token')

        expect(store.invitationToken).toBe('test-token')
      })
    })

    describe('clearInvitationToken()', () => {
      it('should clear state and localStorage', () => {
        const store = useAuthStore()
        store.invitationToken = 'existing-token'

        store.clearInvitationToken()

        expect(store.invitationToken).toBeNull()
        expect(localStorageService.removeItem).toHaveBeenCalledWith('invitationToken')
      })
    })

    describe('setOAuthErrorMessage()', () => {
      it('should set state and localStorage', () => {
        const store = useAuthStore()

        store.setOAuthErrorMessage('OAuth failed')

        expect(store.oauthErrorMessage).toBe('OAuth failed')
        expect(localStorageService.setItem).toHaveBeenCalledWith('oauthErrorMessage', 'OAuth failed')
      })
    })

    describe('clearOAuthErrorMessage()', () => {
      it('should clear state and localStorage', () => {
        const store = useAuthStore()
        store.oauthErrorMessage = 'Existing error'

        store.clearOAuthErrorMessage()

        expect(store.oauthErrorMessage).toBeNull()
        expect(localStorageService.removeItem).toHaveBeenCalledWith('oauthErrorMessage')
      })
    })
  })

  describe('Actions - Initialization', () => {
    describe('initialize()', () => {
      it('should load all 5 properties from localStorage', () => {
        const mockUser = createMockUser()
        const mockToken = 'token-abc'
        const mockExpiry = createValidExpiry()
        const mockInvitation = 'invite-xyz'
        const mockError = 'error-msg'

        localStorageService.getItem.mockImplementation((key) => {
          const values = {
            user: mockUser,
            accessToken: mockToken,
            accessTokenExpiry: mockExpiry,
            invitationToken: mockInvitation,
            oauthErrorMessage: mockError,
          }
          return values[key] || null
        })

        const store = useAuthStore()
        store.initialize()

        expect(store.user).toEqual(mockUser)
        expect(store.accessToken).toBe(mockToken)
        expect(store.accessTokenExpiry).toBe(mockExpiry)
        expect(store.invitationToken).toBe(mockInvitation)
        expect(store.oauthErrorMessage).toBe(mockError)
      })

      it('should handle partial localStorage data', () => {
        localStorageService.getItem.mockImplementation((key) => {
          if (key === 'user') return createMockUser()
          if (key === 'accessToken') return 'token-123'
          return null
        })

        const store = useAuthStore()
        store.initialize()

        expect(store.user).toEqual(expect.any(Object))
        expect(store.accessToken).toBe('token-123')
        expect(store.accessTokenExpiry).toBeNull()
      })

      it('should set state to null when localStorage empty', () => {
        localStorageService.getItem.mockReturnValue(null)

        const store = useAuthStore()
        store.initialize()

        expect(store.user).toBeNull()
        expect(store.accessToken).toBeNull()
        expect(store.accessTokenExpiry).toBeNull()
      })
    })
  })

  describe('Actions - Authentication Flow', () => {
    describe('signup()', () => {
      it('should show success notification on success', async () => {
        const store = useAuthStore()
        axios.post.mockResolvedValue({
          data: { success: true, message: 'Account created' },
        })

        await store.signup({ email: 'new@example.com', password: 'pass123' })

        expect(Notify.create).toHaveBeenCalledWith({
          message: 'Account created successfully!',
          color: 'positive',
          position: 'top',
          timeout: 3000,
        })
      })

      it('should return true on successful signup', async () => {
        const store = useAuthStore()
        axios.post.mockResolvedValue({
          data: { success: true },
        })

        const result = await store.signup({ email: 'test@example.com' })

        expect(result).toBe(true)
      })

      it('should show error notification on failure', async () => {
        const store = useAuthStore()
        axios.post.mockResolvedValue({
          data: { success: false, message: 'Email already exists' },
        })

        await store.signup({ email: 'existing@example.com' })

        expect(Notify.create).toHaveBeenCalledWith({
          message: 'Email already exists',
          color: 'negative',
          position: 'top',
          timeout: 5000,
        })
      })

      it('should return false on failure', async () => {
        const store = useAuthStore()
        axios.post.mockResolvedValue({
          data: { success: false },
        })

        const result = await store.signup({ email: 'test@example.com' })

        expect(result).toBe(false)
      })

      it('should handle API error with custom message', async () => {
        const store = useAuthStore()
        axios.post.mockRejectedValue({
          response: { data: { message: 'Invalid email format' } },
        })

        const result = await store.signup({ email: 'bad-email' })

        expect(result).toBe(false)
        expect(Notify.create).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Invalid email format' })
        )
      })

      it('should handle API error with default message', async () => {
        const store = useAuthStore()
        axios.post.mockRejectedValue(new Error('Network error'))

        const result = await store.signup({ email: 'test@example.com' })

        expect(result).toBe(false)
      })

      it('should handle network error', async () => {
        const store = useAuthStore()
        axios.post.mockRejectedValue(new Error('ECONNREFUSED'))

        const result = await store.signup({ email: 'test@example.com' })

        expect(result).toBe(false)
        expect(Notify.create).toHaveBeenCalled()
      })
    })

    describe('login()', () => {
      it('should call handleAuthRequest with correct params', async () => {
        const store = useAuthStore()
        store.router = { push: vi.fn() }
        handleAuthRequest.mockResolvedValue(true)

        const payload = { email: 'test@example.com', password: 'pass123' }
        await store.login(payload)

        expect(handleAuthRequest).toHaveBeenCalledWith(
          store,
          expect.any(Function),
          store.router
        )
      })

      it('should return result from handleAuthRequest', async () => {
        const store = useAuthStore()
        store.router = { push: vi.fn() }
        handleAuthRequest.mockResolvedValue(true)

        const result = await store.login({ email: 'test@example.com', password: 'pass' })

        expect(result).toBe(true)
      })

      it('should pass axios instance and router', async () => {
        const store = useAuthStore()
        const mockRouter = { push: vi.fn() }
        store.router = mockRouter
        handleAuthRequest.mockResolvedValue(true)

        await store.login({ email: 'test@example.com' })

        expect(handleAuthRequest).toHaveBeenCalledWith(
          store,
          expect.any(Function),
          mockRouter
        )
      })

      it('should handle API errors via handleApiError', async () => {
        const store = useAuthStore()
        store.router = { push: vi.fn() }
        handleAuthRequest.mockRejectedValue(new Error('Login failed'))

        const result = await store.login({ email: 'test@example.com' })

        expect(result).toBe(false)
        expect(Notify.create).toHaveBeenCalled()
      })

      it('should show error notification on failure', async () => {
        const store = useAuthStore()
        store.router = { push: vi.fn() }
        handleAuthRequest.mockRejectedValue({
          response: { data: { message: 'Invalid credentials' } },
        })

        await store.login({ email: 'test@example.com' })

        expect(Notify.create).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Invalid credentials' })
        )
      })
    })

    describe('setPassword()', () => {
      it('should call handleAuthRequest with token and uidb64', async () => {
        const store = useAuthStore()
        store.router = { push: vi.fn() }
        handleAuthRequest.mockResolvedValue(true)

        await store.setPassword('token-abc', 'uid-123', { password: 'newpass' })

        expect(handleAuthRequest).toHaveBeenCalled()
      })

      it('should construct correct API URL', async () => {
        const store = useAuthStore()
        store.router = { push: vi.fn() }
        handleAuthRequest.mockResolvedValue(true)
        axios.post.mockResolvedValue({ data: { success: true } })

        await store.setPassword('reset-token', 'user-id', { password: 'pass' })

        // Verify the axios call would be made with correct URL
        const requestFn = handleAuthRequest.mock.calls[0][1]
        await requestFn()

        expect(axios.post).toHaveBeenCalledWith(
          '/auth/reset_password/reset-token/user-id',
          { password: 'pass' }
        )
      })

      it('should handle success', async () => {
        const store = useAuthStore()
        store.router = { push: vi.fn() }
        handleAuthRequest.mockResolvedValue(true)

        const result = await store.setPassword('token', 'uid', { password: 'newpass' })

        expect(result).toBe(true)
      })

      it('should handle failure', async () => {
        const store = useAuthStore()
        store.router = { push: vi.fn() }
        handleAuthRequest.mockRejectedValue(new Error('Invalid token'))

        const result = await store.setPassword('bad-token', 'uid', { password: 'pass' })

        expect(result).toBe(false)
      })
    })

    describe('requestPasswordReset()', () => {
      it('should show success notification on success', async () => {
        const store = useAuthStore()
        axios.post.mockResolvedValue({
          data: { success: true },
        })

        await store.requestPasswordReset('test@example.com')

        expect(Notify.create).toHaveBeenCalledWith({
          message: 'Password reset email sent!',
          color: 'positive',
          position: 'top',
          timeout: 5000,
        })
      })

      it('should return true on success', async () => {
        const store = useAuthStore()
        axios.post.mockResolvedValue({
          data: { success: true },
        })

        const result = await store.requestPasswordReset('test@example.com')

        expect(result).toBe(true)
      })

      it('should show error notification on failure', async () => {
        const store = useAuthStore()
        axios.post.mockResolvedValue({
          data: { success: false, message: 'Email not found' },
        })

        await store.requestPasswordReset('notfound@example.com')

        expect(Notify.create).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Email not found', color: 'negative' })
        )
      })

      it('should handle API errors', async () => {
        const store = useAuthStore()
        axios.post.mockRejectedValue(new Error('Server error'))

        const result = await store.requestPasswordReset('test@example.com')

        expect(result).toBe(false)
        expect(Notify.create).toHaveBeenCalled()
      })

      it('should use email parameter', async () => {
        const store = useAuthStore()
        axios.post.mockResolvedValue({
          data: { success: true },
        })

        await store.requestPasswordReset('user@example.com')

        expect(axios.post).toHaveBeenCalledWith('/auth/request_password_reset', {
          email: 'user@example.com',
        })
      })
    })

    describe('loginWithOAuth()', () => {
      it('should call handleOAuthRequest with provider', async () => {
        const store = useAuthStore()
        handleOAuthRequest.mockResolvedValue({ success: true })

        await store.loginWithOAuth('google', { code: 'auth-code' })

        expect(handleOAuthRequest).toHaveBeenCalledWith(store, expect.any(Function), undefined)
      })

      it('should support microsoft provider', async () => {
        const store = useAuthStore()
        handleOAuthRequest.mockResolvedValue({ success: true })

        await store.loginWithOAuth('microsoft', { code: 'ms-code' })

        const requestFn = handleOAuthRequest.mock.calls[0][1]
        await requestFn()

        expect(axios.post).toHaveBeenCalledWith('/auth/microsoft/exchange', { code: 'ms-code' })
      })

      it('should support google provider', async () => {
        const store = useAuthStore()
        handleOAuthRequest.mockResolvedValue({ success: true })

        await store.loginWithOAuth('google', { code: 'google-code' })

        const requestFn = handleOAuthRequest.mock.calls[0][1]
        await requestFn()

        expect(axios.post).toHaveBeenCalledWith('/auth/google/exchange', { code: 'google-code' })
      })

      it('should return result from handleOAuthRequest', async () => {
        const store = useAuthStore()
        const mockResult = { success: true, user: createMockUser() }
        handleOAuthRequest.mockResolvedValue(mockResult)

        const result = await store.loginWithOAuth('google', { code: 'code' })

        expect(result).toEqual(mockResult)
      })

      it('should handle errors', async () => {
        const store = useAuthStore()
        handleOAuthRequest.mockRejectedValue(new Error('OAuth failed'))

        const result = await store.loginWithOAuth('google', { code: 'bad-code' })

        expect(result).toBe(false)
        expect(Notify.create).toHaveBeenCalled()
      })
    })
  })

  describe('Actions - Token Refresh', () => {
    describe('refreshToken()', () => {
      it('should update tokens on successful refresh', async () => {
        const store = useAuthStore()
        store.user = createMockUser()
        const newToken = 'refreshed-token'
        const newExpiry = createValidExpiry(60)

        axios.post.mockResolvedValue({
          data: {
            success: true,
            accessToken: newToken,
            accessTokenExpiry: newExpiry,
          },
        })

        const result = await store.refreshToken()

        expect(result).toBe(true)
        expect(store.accessToken).toBe(newToken)
        expect(store.accessTokenExpiry).toBe(newExpiry)
      })

      it('should preserve existing user data', async () => {
        const store = useAuthStore()
        const mockUser = createMockUser({ id: 5, name: 'Preserved User' })
        store.user = mockUser

        axios.post.mockResolvedValue({
          data: {
            success: true,
            accessToken: 'new-token',
            accessTokenExpiry: createValidExpiry(),
          },
        })

        await store.refreshToken()

        expect(store.user).toEqual(mockUser)
      })

      it('should return true on success', async () => {
        const store = useAuthStore()
        store.user = createMockUser()
        axios.post.mockResolvedValue({
          data: {
            success: true,
            accessToken: 'token',
            accessTokenExpiry: createValidExpiry(),
          },
        })

        const result = await store.refreshToken()

        expect(result).toBe(true)
      })

      it('should return false when response.success is false', async () => {
        const store = useAuthStore()
        axios.post.mockResolvedValue({
          data: { success: false },
        })

        const result = await store.refreshToken()

        expect(result).toBe(false)
      })

      it('should call logout on error', async () => {
        const store = useAuthStore()
        store.router = { push: vi.fn() }
        axios.post.mockRejectedValue(new Error('Refresh failed'))

        const logoutSpy = vi.spyOn(store, 'logout').mockImplementation(() => {})

        await store.refreshToken()

        expect(logoutSpy).toHaveBeenCalled()

        logoutSpy.mockRestore()
      })

      it('should return false on error', async () => {
        const store = useAuthStore()
        store.router = { push: vi.fn() }
        axios.post.mockRejectedValue(new Error('Network error'))

        const logoutSpy = vi.spyOn(store, 'logout').mockImplementation(() => {})

        const result = await store.refreshToken()

        expect(result).toBe(false)

        logoutSpy.mockRestore()
      })

      it('should not throw exception', async () => {
        const store = useAuthStore()
        store.router = { push: vi.fn() }
        axios.post.mockRejectedValue(new Error('Fatal error'))

        const logoutSpy = vi.spyOn(store, 'logout').mockImplementation(() => {})

        await expect(store.refreshToken()).resolves.toBeDefined()

        logoutSpy.mockRestore()
      })
    })

    describe('checkAndRefreshToken()', () => {
      it('should return false when no accessToken', async () => {
        const store = useAuthStore()
        store.accessToken = null
        store.accessTokenExpiry = createValidExpiry()

        const result = await store.checkAndRefreshToken()

        expect(result).toBe(false)
      })

      it('should return false when no accessTokenExpiry', async () => {
        const store = useAuthStore()
        store.accessToken = 'token'
        store.accessTokenExpiry = null

        const result = await store.checkAndRefreshToken()

        expect(result).toBe(false)
      })

      it('should refresh when expires in < 5 minutes', async () => {
        const store = useAuthStore()
        store.accessToken = 'token'
        store.accessTokenExpiry = Math.floor(Date.now() / 1000) + 240 // 4 mins

        const refreshSpy = vi.spyOn(store, 'refreshToken').mockResolvedValue(true)

        const result = await store.checkAndRefreshToken()

        expect(refreshSpy).toHaveBeenCalled()
        expect(result).toBe(true)

        refreshSpy.mockRestore()
      })

      it('should not refresh when expires in > 5 minutes', async () => {
        const store = useAuthStore()
        store.accessToken = 'token'
        store.accessTokenExpiry = Math.floor(Date.now() / 1000) + 600 // 10 mins

        const refreshSpy = vi.spyOn(store, 'refreshToken')

        const result = await store.checkAndRefreshToken()

        expect(refreshSpy).not.toHaveBeenCalled()
        expect(result).toBe(true)

        refreshSpy.mockRestore()
      })

      it('should not refresh when already expired', async () => {
        const store = useAuthStore()
        store.accessToken = 'token'
        store.accessTokenExpiry = createExpiredExpiry()

        const refreshSpy = vi.spyOn(store, 'refreshToken')

        const result = await store.checkAndRefreshToken()

        expect(refreshSpy).not.toHaveBeenCalled()
        expect(result).toBe(true)

        refreshSpy.mockRestore()
      })

      it('should return true when no refresh needed', async () => {
        const store = useAuthStore()
        store.accessToken = 'token'
        store.accessTokenExpiry = createValidExpiry(30)

        const result = await store.checkAndRefreshToken()

        expect(result).toBe(true)
      })

      it('should return result of refreshToken when called', async () => {
        const store = useAuthStore()
        store.accessToken = 'token'
        store.accessTokenExpiry = Math.floor(Date.now() / 1000) + 200 // < 5 mins

        const refreshSpy = vi.spyOn(store, 'refreshToken').mockResolvedValue(true)

        const result = await store.checkAndRefreshToken()

        expect(result).toBe(true)

        refreshSpy.mockRestore()
      })
    })
  })

  describe('Actions - Logout', () => {
    describe('logout()', () => {
      it('should clear auth data', async () => {
        const store = useAuthStore()
        store.router = { push: vi.fn() }
        store.user = createMockUser()
        store.accessToken = 'token'

        await store.logout()

        expect(store.user).toBeNull()
        expect(store.accessToken).toBeNull()
        expect(store.accessTokenExpiry).toBeNull()
      })

      it('should show info notification by default', async () => {
        const store = useAuthStore()
        store.router = { push: vi.fn() }

        await store.logout()

        expect(Notify.create).toHaveBeenCalledWith({
          message: 'Logged out successfully',
          color: 'info',
          position: 'top',
          timeout: 2000,
        })
      })

      it('should not show notification when showNotification=false', async () => {
        const store = useAuthStore()
        store.router = { push: vi.fn() }

        await store.logout(false)

        expect(Notify.create).not.toHaveBeenCalled()
      })

      it('should navigate to login page', async () => {
        const store = useAuthStore()
        const mockRouter = { push: vi.fn() }
        store.router = mockRouter

        await store.logout()

        expect(mockRouter.push).toHaveBeenCalledWith('/login')
      })

      it('should clear data even if API call fails', async () => {
        const store = useAuthStore()
        store.router = { push: vi.fn() }
        store.user = createMockUser()
        store.accessToken = 'token'

        axios.post.mockRejectedValue(new Error('Server error'))

        await store.logout()

        expect(store.user).toBeNull()
        expect(store.accessToken).toBeNull()
      })

      it('should handle missing router gracefully', async () => {
        const store = useAuthStore()
        store.router = null

        await expect(store.logout()).resolves.toBeUndefined()
      })

      it('should call axios.post to /auth/logout', async () => {
        const store = useAuthStore()
        store.router = { push: vi.fn() }

        await store.logout()

        expect(axios.post).toHaveBeenCalledWith('/auth/logout')
      })

      it('should ignore server logout errors', async () => {
        const store = useAuthStore()
        store.router = { push: vi.fn() }

        axios.post.mockRejectedValue(new Error('Logout endpoint failed'))

        await expect(store.logout()).resolves.toBeUndefined()
      })
    })
  })

  describe('Error Handling', () => {
    describe('showErrorNotification()', () => {
      it('should show negative notification with message', () => {
        const store = useAuthStore()

        store.showErrorNotification('Custom error message')

        expect(Notify.create).toHaveBeenCalledWith({
          message: 'Custom error message',
          color: 'negative',
          position: 'top',
          timeout: 5000,
        })
      })

      it('should use default message when none provided', () => {
        const store = useAuthStore()

        store.showErrorNotification()

        expect(Notify.create).toHaveBeenCalledWith({
          message: 'An unknown error occurred',
          color: 'negative',
          position: 'top',
          timeout: 5000,
        })
      })

      it('should set timeout to 5000ms', () => {
        const store = useAuthStore()

        store.showErrorNotification('Error')

        expect(Notify.create).toHaveBeenCalledWith(
          expect.objectContaining({ timeout: 5000 })
        )
      })

      it('should set position to top', () => {
        const store = useAuthStore()

        store.showErrorNotification('Error')

        expect(Notify.create).toHaveBeenCalledWith(
          expect.objectContaining({ position: 'top' })
        )
      })
    })

    describe('handleApiError()', () => {
      it('should extract message from response.data.message', () => {
        const store = useAuthStore()
        const error = {
          response: {
            data: { message: 'Invalid request' },
          },
        }

        store.handleApiError(error)

        expect(Notify.create).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Invalid request' })
        )
      })

      it('should extract message from error.message', () => {
        const store = useAuthStore()
        const error = new Error('Connection timeout')

        store.handleApiError(error)

        expect(Notify.create).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Connection timeout' })
        )
      })

      it('should use default message when none available', () => {
        const store = useAuthStore()
        const error = {}

        store.handleApiError(error, 'Default error')

        expect(Notify.create).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Default error' })
        )
      })

      it('should call showErrorNotification', () => {
        const store = useAuthStore()
        const showErrorSpy = vi.spyOn(store, 'showErrorNotification')

        store.handleApiError(new Error('Test'))

        expect(showErrorSpy).toHaveBeenCalled()

        showErrorSpy.mockRestore()
      })

      it('should return false', () => {
        const store = useAuthStore()

        const result = store.handleApiError(new Error('Test'))

        expect(result).toBe(false)
      })
    })
  })

  describe('Integration Tests', () => {
    it('should maintain state persistence across actions', () => {
      const store = useAuthStore()
      const mockUser = createMockUser()
      const mockToken = 'integration-token'
      const mockExpiry = createValidExpiry()

      store.setAuthData({
        user: mockUser,
        accessToken: mockToken,
        accessTokenExpiry: mockExpiry,
      })

      expect(localStorageService.setItem).toHaveBeenCalledTimes(3)

      store.clearAuthData()

      expect(localStorageService.removeItem).toHaveBeenCalledTimes(3)
    })

    it('should handle full login flow (setAuthData -> isAuthenticated)', () => {
      const store = useAuthStore()

      expect(store.isAuthenticated).toBe(false)

      store.setAuthData({
        user: createMockUser(),
        accessToken: 'login-token',
        accessTokenExpiry: createValidExpiry(30),
      })

      expect(store.isAuthenticated).toBe(true)
    })

    it('should handle full logout flow (clearAuthData -> !isAuthenticated)', () => {
      const store = useAuthStore()
      store.setAuthData({
        user: createMockUser(),
        accessToken: 'token',
        accessTokenExpiry: createValidExpiry(),
      })

      expect(store.isAuthenticated).toBe(true)

      store.clearAuthData()

      expect(store.isAuthenticated).toBe(false)
    })

    it('should handle token refresh maintaining authentication', async () => {
      const store = useAuthStore()
      store.user = createMockUser()
      store.accessToken = 'old-token'
      store.accessTokenExpiry = createValidExpiry(2) // 2 mins

      axios.post.mockResolvedValue({
        data: {
          success: true,
          accessToken: 'refreshed-token',
          accessTokenExpiry: createValidExpiry(60),
        },
      })

      expect(store.isAuthenticated).toBe(true)

      await store.refreshToken()

      expect(store.isAuthenticated).toBe(true)
      expect(store.accessToken).toBe('refreshed-token')
    })
  })
})
