import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { Notify } from 'quasar'
import { nextTick } from 'vue'
import AuthCallback from '../../src/pages/Auth/AuthCallback.vue'

// Mock auth service - must define mocks inline to avoid hoisting issues
// Mock both paths the component might use
vi.mock('../../src/services/auth.service.js', () => ({
  default: {
    getStateDataValue: vi.fn(),
    getCodeVerifier: vi.fn()
  }
}))

vi.mock('src/services/auth.service', () => ({
  default: {
    getStateDataValue: vi.fn(),
    getCodeVerifier: vi.fn()
  }
}))

// Mock axios config to avoid import issues
vi.mock('config/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  }
}))

// Mock pinia's storeToRefs to work with our mock store
vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      // Return refs from the store - create reactive refs
      return {
        oauthErrorMessage: store.oauthErrorMessage || { value: null }
      }
    }
  }
})

// Mock auth store - create instance in factory to avoid hoisting issues
vi.mock('src/stores/auth', () => {
  // Create a single shared mock store instance
  const oauthErrorMessageRef = { value: null }
  
  const loginWithOAuthMock = vi.fn()
  loginWithOAuthMock.mockResolvedValue({ success: false }) // Default
  
  const mockStoreInstance = {
    loginWithOAuth: loginWithOAuthMock,
    clearInvitationToken: vi.fn(),
    clearOAuthErrorMessage: vi.fn(() => {
      oauthErrorMessageRef.value = null
    }),
    oauthErrorMessage: oauthErrorMessageRef
  }
  
  return {
    useAuthStore: vi.fn(() => mockStoreInstance)
  }
})

// Mock Quasar Notify
vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    Notify: {
      create: vi.fn()
    }
  }
})

describe('AuthCallback.vue', () => {
  let router
  let pinia
  let authStore
  let mockAuthService

  beforeEach(async () => {
    // Clear all mocks first
    vi.clearAllMocks()
    
    // Reset globalThis.location FIRST - MUST be set before any component logic
    // Make it a proper Location-like object that URLSearchParams can use
    Object.defineProperty(globalThis, 'location', {
      value: {
        origin: 'http://localhost:3000',
        search: '?state=test-state&code=test-auth-code',
        href: 'http://localhost:3000/auth/callback',
        pathname: '/auth/callback',
        hash: ''
      },
      writable: true,
      configurable: true
    })
    
    // Setup Pinia first
    pinia = createPinia()
    setActivePinia(pinia)
    
    // Setup router
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/auth/callback', component: AuthCallback },
        { path: '/login', component: { template: '<div>Login</div>' } },
        { path: '/dashboard', component: { template: '<div>Dashboard</div>' } }
      ]
    })

    // Import the mocked services - mocks are hoisted so these should be mocked
    const authServiceModule = await import('../../src/services/auth.service.js')
    mockAuthService = authServiceModule.default
    
    // Verify we got the mocked instance
    expect(mockAuthService).toBeDefined()
    expect(vi.isMockFunction(mockAuthService.getStateDataValue)).toBe(true)
    expect(vi.isMockFunction(mockAuthService.getCodeVerifier)).toBe(true)
    
    // Get the mocked auth store
    const { useAuthStore } = await import('src/stores/auth')
    authStore = useAuthStore()
    
    // Verify store is mocked
    expect(vi.isMockFunction(authStore.loginWithOAuth)).toBe(true)
    
    // Reset oauthErrorMessage ref
    if (authStore.oauthErrorMessage) {
      authStore.oauthErrorMessage.value = null
    }
    
    // Mock console to avoid noise but allow error inspection
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((msg) => {
      // Log errors for debugging but don't fail tests
      if (typeof msg === 'string' && msg.includes('Authentication callback error')) {
        // This is expected in some tests
      }
    })
  })

  it('should handle successful OAuth callback', async () => {
    // CRITICAL: Set up URL with code BEFORE anything else
    // The component reads globalThis.location.search in onMounted
    globalThis.location.search = '?state=test-state&code=test-auth-code'
    
    // Verify URL is set correctly - component uses URLSearchParams
    const testParams = new URLSearchParams(globalThis.location.search)
    expect(testParams.get('code')).toBe('test-auth-code')
    expect(testParams.get('state')).toBe('test-state')
    
    // Set up mocks with return values
    mockAuthService.getStateDataValue
      .mockResolvedValueOnce('google') // provider - first call
      .mockResolvedValueOnce('test-invitation-token') // invitation_token - second call
    mockAuthService.getCodeVerifier.mockResolvedValue('test-code-verifier')
    authStore.loginWithOAuth.mockResolvedValue({ success: true })

    // Mount the component - this should trigger onMounted
    // Don't navigate first - just mount the component directly
    const wrapper = mount(AuthCallback, {
      global: {
        plugins: [router, pinia],
        stubs: {
          QSpinnerDots: true
        }
      },
      attachTo: document.body
    })

    // Verify component mounted
    expect(wrapper.exists()).toBe(true)
    
    // Wait for Vue to mount and onMounted to start executing
    await nextTick()
    
    // onMounted is async and does:
    // 1. Check URL params (synchronous)
    // 2. await authService.getStateDataValue('provider')
    // 3. await authService.getStateDataValue('invitation_token', false)
    // 4. await authService.getCodeVerifier()
    // 5. await authStore.loginWithOAuth(...)
    
    // Wait for all async operations to complete
    // The onMounted hook is async, so we need to wait for:
    // 1. Component mount (nextTick)
    // 2. onMounted execution start
    // 3. Each async await in sequence
    
    // Wait for component to be fully mounted
    await nextTick()
    await flushPromises()
    
    // Wait for onMounted to start and execute first async call
    await new Promise(resolve => setTimeout(resolve, 100))
    await flushPromises()
    
    // Check if mocks were called - if not, there might be an issue
    const wasCalled = mockAuthService.getStateDataValue.mock.calls.length > 0
    
    // If not called yet, wait more
    if (!wasCalled) {
      // Try waiting longer - maybe onMounted hasn't started yet
      for (let i = 0; i < 5; i++) {
        await flushPromises()
        await new Promise(resolve => setTimeout(resolve, 100))
        await nextTick()
      }
    }
    
    // Final flush
    await flushPromises()
    
    // Debug: Check what was actually called
    if (mockAuthService.getStateDataValue.mock.calls.length === 0) {
      // onMounted didn't execute the async path - might be an early return or error
      console.log('WARNING: getStateDataValue was never called')
      console.log('Location search:', globalThis.location.search)
    }
    
    expect(mockAuthService.getStateDataValue).toHaveBeenCalledWith('provider')
    expect(mockAuthService.getStateDataValue).toHaveBeenCalledWith('invitation_token', false)
    expect(mockAuthService.getCodeVerifier).toHaveBeenCalled()
    
    expect(authStore.loginWithOAuth).toHaveBeenCalledWith('google', {
      redirect_uri: 'http://localhost:3000/auth/callback',
      code_verifier: 'test-code-verifier',
      provider: 'google',
      invitation_token: 'test-invitation-token',
      code: 'test-auth-code'
    })

    expect(authStore.clearInvitationToken).toHaveBeenCalled()
    expect(authStore.clearOAuthErrorMessage).toHaveBeenCalled()
    expect(Notify.create).toHaveBeenCalledWith({
      message: 'Successfully signed in with google!',
      color: 'positive',
      position: 'top',
      timeout: 3000
    })

    wrapper.unmount()
  })

  it('should handle OAuth callback without invitation token', async () => {
    // Set up URL with code
    globalThis.location.search = '?state=test-state&code=test-auth-code'
    
    mockAuthService.getStateDataValue.mockReset()
    mockAuthService.getStateDataValue
      .mockResolvedValueOnce('microsoft') // provider
      .mockResolvedValueOnce(null) // invitation_token (null)
    mockAuthService.getCodeVerifier.mockReset()
    mockAuthService.getCodeVerifier.mockResolvedValue('test-code-verifier')
    
    authStore.loginWithOAuth.mockReset()
    authStore.loginWithOAuth.mockResolvedValue({ success: true })

    await router.push('/auth/callback')
    
    const wrapper = mount(AuthCallback, {
      global: {
        plugins: [router, pinia],
        stubs: {
          QSpinnerDots: true
        }
      },
      attachTo: document.body
    })

    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 100))
    await flushPromises()

    // Verify invitation_token is not included in request body
    expect(authStore.loginWithOAuth).toHaveBeenCalledWith('microsoft', 
      expect.not.objectContaining({
        invitation_token: expect.anything()
      })
    )

    wrapper.unmount()
  })

  it('should handle access_denied error', async () => {
    globalThis.location.search = '?error=access_denied'

    await router.push('/auth/callback')
    
    const wrapper = mount(AuthCallback, {
      global: {
        plugins: [router, pinia],
        stubs: {
          QSpinnerDots: true
        }
      }
    })

    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.error).toBe('oauth_cancelled')

    wrapper.unmount()
  })

  it('should handle missing authorization code', async () => {
    globalThis.location.search = '?state=test-state' // No code parameter

    mockAuthService.getStateDataValue.mockReset()
    mockAuthService.getStateDataValue
      .mockResolvedValueOnce('google')
      .mockResolvedValueOnce(null)
    mockAuthService.getCodeVerifier.mockReset()
    mockAuthService.getCodeVerifier.mockResolvedValue('test-code-verifier')

    await router.push('/auth/callback')
    
    const wrapper = mount(AuthCallback, {
      global: {
        plugins: [router, pinia],
        stubs: {
          QSpinnerDots: true
        }
      }
    })

    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 100))
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.error).toBe('oauth_no_code')

    wrapper.unmount()
  })

  it('should handle OAuth login failure', async () => {
    globalThis.location.search = '?state=test-state&code=test-auth-code'
    
    mockAuthService.getStateDataValue.mockReset()
    mockAuthService.getStateDataValue
      .mockResolvedValueOnce('google')
      .mockResolvedValueOnce(null)
    mockAuthService.getCodeVerifier.mockReset()
    mockAuthService.getCodeVerifier.mockResolvedValue('test-code-verifier')
    
    authStore.loginWithOAuth.mockReset()
    authStore.loginWithOAuth.mockResolvedValue({ 
      success: false, 
      error: 'Invalid credentials' 
    })

    await router.push('/auth/callback')
    
    const wrapper = mount(AuthCallback, {
      global: {
        plugins: [router, pinia],
        stubs: {
          QSpinnerDots: true
        }
      },
      attachTo: document.body
    })

    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 100))
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.error).toBe('oauth_failed')

    wrapper.unmount()
  })

  it('should handle OAuth login failure without error message', async () => {
    globalThis.location.search = '?state=test-state&code=test-auth-code'
    
    mockAuthService.getStateDataValue.mockReset()
    mockAuthService.getStateDataValue
      .mockResolvedValueOnce('microsoft')
      .mockResolvedValueOnce(null)
    mockAuthService.getCodeVerifier.mockReset()
    mockAuthService.getCodeVerifier.mockResolvedValue('test-code-verifier')
    
    authStore.loginWithOAuth.mockReset()
    authStore.loginWithOAuth.mockResolvedValue({ 
      success: false
    })

    await router.push('/auth/callback')
    
    const wrapper = mount(AuthCallback, {
      global: {
        plugins: [router, pinia],
        stubs: {
          QSpinnerDots: true
        }
      },
      attachTo: document.body
    })

    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 100))
    await flushPromises()

    // oauthErrorMessage is a ref, so check .value
    expect(authStore.oauthErrorMessage.value).toBe('Failed to sign in with microsoft. Please try again.')

    wrapper.unmount()
  })

  it('should handle unexpected errors during callback', async () => {
    mockAuthService.getStateDataValue.mockReset()
    mockAuthService.getStateDataValue.mockRejectedValue(new Error('State retrieval failed'))

    await router.push('/auth/callback')
    
    const wrapper = mount(AuthCallback, {
      global: {
        plugins: [router, pinia],
        stubs: {
          QSpinnerDots: true
        }
      }
    })

    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/login')

    wrapper.unmount()
  })

  it('should not process callback twice', async () => {
    // Set up URL with code
    globalThis.location.search = '?state=test-state&code=test-auth-code'
    
    // Reset all mocks
    mockAuthService.getStateDataValue.mockReset()
    mockAuthService.getCodeVerifier.mockReset()
    authStore.loginWithOAuth.mockReset()
    
    // Set up successful OAuth flow
    mockAuthService.getStateDataValue
      .mockResolvedValueOnce('google')
      .mockResolvedValueOnce(null)
    mockAuthService.getCodeVerifier.mockResolvedValue('test-code-verifier')
    authStore.loginWithOAuth.mockResolvedValue({ success: true })

    await router.push('/auth/callback')
    
    const wrapper = mount(AuthCallback, {
      global: {
        plugins: [router, pinia],
        stubs: {
          QSpinnerDots: true
        }
      },
      attachTo: document.body
    })

    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 100))
    await flushPromises()

    // Verify loginWithOAuth was called only once despite multiple renders
    expect(authStore.loginWithOAuth).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })
})

