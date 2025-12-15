import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserManager, WebStorageStateStore } from 'oidc-client-ts'

// Mock oidc-client-ts before importing the service
vi.mock('oidc-client-ts', () => ({
  UserManager: vi.fn(),
  WebStorageStateStore: vi.fn()
}))

// Import after mocking
const authService = await import('../../src/services/auth.service.js')

describe('auth.service.js', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset globalThis.location
    globalThis.location = {
      origin: 'http://localhost:3000',
      search: '?state=test-state-key&code=test-code'
    }
    
    // Reset localStorage mock
    globalThis.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    }
  })

  describe('signIn', () => {
    it('should sign in with Microsoft provider', async () => {
      const mockSigninRedirect = vi.fn().mockResolvedValue(undefined)
      UserManager.mockImplementation(() => ({
        signinRedirect: mockSigninRedirect
      }))

      await authService.default.signIn('microsoft', 'test-invitation-token')

      expect(UserManager).toHaveBeenCalled()
      const callArgs = UserManager.mock.calls[0][0]
      expect(callArgs.authority).toBe('https://login.microsoftonline.com/common/v2.0')
      expect(callArgs.scope).toBe('User.Read')
      // client_id comes from import.meta.env, may be undefined in test environment
      // Just verify the config structure is correct
      expect(callArgs).toHaveProperty('client_id')
      expect(mockSigninRedirect).toHaveBeenCalledWith({
        state: { provider: 'microsoft', invitation_token: 'test-invitation-token' }
      })
    })

    it('should sign in with Google provider', async () => {
      const mockSigninRedirect = vi.fn().mockResolvedValue(undefined)
      UserManager.mockImplementation(() => ({
        signinRedirect: mockSigninRedirect
      }))

      await authService.default.signIn('google', null)

      expect(UserManager).toHaveBeenCalled()
      const callArgs = UserManager.mock.calls[0][0]
      expect(callArgs.authority).toBe('https://accounts.google.com')
      expect(callArgs.scope).toBe('openid profile email')
      // client_id comes from import.meta.env, may be undefined in test environment
      // Just verify the config structure is correct
      expect(callArgs).toHaveProperty('client_id')
      expect(mockSigninRedirect).toHaveBeenCalledWith({
        state: { provider: 'google', invitation_token: null }
      })
    })

    it('should throw error for unsupported provider', async () => {
      expect(() => authService.default.signIn('unsupported', null)).rejects.toThrow('Unsupported provider')
    })
  })

  describe('handleCallback', () => {
    it('should handle callback and return user data', async () => {
      const mockUser = {
        profile: { name: 'Test User', email: 'test@example.com' },
        id_token: 'test-id-token',
        access_token: 'test-access-token'
      }

      const mockSigninRedirectCallback = vi.fn().mockResolvedValue(mockUser)
      UserManager.mockImplementation(() => ({
        signinRedirectCallback: mockSigninRedirectCallback
      }))

      const result = await authService.default.handleCallback('microsoft')

      expect(result).toEqual({
        provider: 'microsoft',
        profile: mockUser.profile,
        idToken: mockUser.id_token,
        accessToken: mockUser.access_token
      })
      expect(mockSigninRedirectCallback).toHaveBeenCalled()
    })
  })

  describe('getCodeVerifier', () => {
    it('should retrieve code verifier from storage', async () => {
      globalThis.location.search = '?state=test-state-key'
      
      const mockStateData = {
        code_verifier: 'test-code-verifier-123'
      }
      
      const mockGet = vi.fn().mockResolvedValue(JSON.stringify(mockStateData))
      WebStorageStateStore.mockImplementation(() => ({
        get: mockGet
      }))

      const codeVerifier = await authService.default.getCodeVerifier()

      expect(codeVerifier).toBe('test-code-verifier-123')
      expect(mockGet).toHaveBeenCalledWith('test-state-key')
    })

    it('should throw error when state param is missing', async () => {
      globalThis.location.search = ''

      await expect(authService.default.getCodeVerifier()).rejects.toThrow('Missing state param in URL')
    })

    it('should throw error when code_verifier not found', async () => {
      globalThis.location.search = '?state=test-state-key'
      
      const mockGet = vi.fn().mockResolvedValue(JSON.stringify({}))
      WebStorageStateStore.mockImplementation(() => ({
        get: mockGet
      }))

      await expect(authService.default.getCodeVerifier()).rejects.toThrow('PKCE code_verifier not found in storage')
    })
  })

  describe('getStateDataValue', () => {
    it('should retrieve state data value in strict mode', async () => {
      globalThis.location.search = '?state=test-state-key'
      
      const mockStateData = {
        data: {
          provider: 'microsoft',
          invitation_token: 'test-token'
        }
      }
      
      const mockGet = vi.fn().mockResolvedValue(JSON.stringify(mockStateData))
      WebStorageStateStore.mockImplementation(() => ({
        get: mockGet
      }))

      const provider = await authService.default.getStateDataValue('provider')
      expect(provider).toBe('microsoft')

      const token = await authService.default.getStateDataValue('invitation_token')
      expect(token).toBe('test-token')
    })

    it('should return null in non-strict mode when value not found', async () => {
      globalThis.location.search = '?state=test-state-key'
      
      const mockStateData = {
        data: {
          provider: 'google'
        }
      }
      
      const mockGet = vi.fn().mockResolvedValue(JSON.stringify(mockStateData))
      WebStorageStateStore.mockImplementation(() => ({
        get: mockGet
      }))

      const token = await authService.default.getStateDataValue('invitation_token', false)
      expect(token).toBeNull()
    })

    it('should throw error in strict mode when value not found', async () => {
      globalThis.location.search = '?state=test-state-key'
      
      const mockStateData = {
        data: {}
      }
      
      const mockGet = vi.fn().mockResolvedValue(JSON.stringify(mockStateData))
      WebStorageStateStore.mockImplementation(() => ({
        get: mockGet
      }))

      await expect(authService.default.getStateDataValue('missing_key', true)).rejects.toThrow('PKCE missing_key not found in storage')
    })

    it('should throw error when state param is missing', async () => {
      globalThis.location.search = ''

      await expect(authService.default.getStateDataValue('provider')).rejects.toThrow('Missing state param in URL')
    })
  })
})

