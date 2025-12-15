import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'

// Mock #q-app/wrappers - must be hoisted before imports
// This ensures the mock works even if .quasar directory doesn't exist
vi.mock('#q-app/wrappers', () => ({
  defineRouter: (fn) => fn
}))

// Mock auth store
const mockAuthStore = {
  accessToken: null,
  isAuthenticated: false,
  isTokenExpired: false,
  initialize: vi.fn(),
  checkAndRefreshToken: vi.fn()
}

vi.mock('src/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore)
}))

describe('router/index.js', () => {
  let router
  let pinia

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Setup Pinia
    pinia = createPinia()
    setActivePinia(pinia)
    
    // Reset mock auth store
    mockAuthStore.accessToken = null
    mockAuthStore.isAuthenticated = false
    mockAuthStore.isTokenExpired = false
    mockAuthStore.initialize = vi.fn()
    mockAuthStore.checkAndRefreshToken = vi.fn()

    // Ensure process.env is set (from setup.js, but ensure VUE_ROUTER_BASE is always defined)
    if (!globalThis.process?.env?.VUE_ROUTER_BASE) {
      globalThis.process.env.VUE_ROUTER_BASE = '/'
    }
    if (!globalThis.process?.env?.VUE_ROUTER_MODE) {
      globalThis.process.env.VUE_ROUTER_MODE = 'history'
    }
    if (globalThis.process?.env?.SERVER === undefined) {
      globalThis.process.env.SERVER = false
    }

    // Import router factory
    const routerModule = await import('../../src/router/index.js')
    router = routerModule.default()
  })

  it('should create router instance with routes', () => {
    expect(router).toBeDefined()
    expect(router.options.routes).toBeDefined()
    expect(router.options.routes.length).toBeGreaterThan(0)
  })

  it('should have scroll behavior configured', () => {
    expect(router.options.scrollBehavior).toBeDefined()
    
    const scrollResult = router.options.scrollBehavior()
    expect(scrollResult).toEqual({ left: 0, top: 0 })
  })

  // Test history mode using the default history mode from beforeEach
  it('should use history mode when VUE_ROUTER_MODE is history', () => {
    // The beforeEach sets VUE_ROUTER_MODE = 'history' by default
    expect(router.options.history).toBeDefined()
  })

  describe('getHistoryMode', () => {
    it('should return createMemoryHistory when SERVER is true', async () => {
      // Import the function directly
      const { getHistoryMode } = await import('../../src/router/index.js')
      const { createMemoryHistory } = await import('vue-router')
      
      // Save original values
      const originalServer = globalThis.process.env.SERVER
      
      // Set SERVER to true
      globalThis.process.env.SERVER = true
      
      const result = getHistoryMode()
      expect(result).toBe(createMemoryHistory)
      
      // Restore original values
      globalThis.process.env.SERVER = originalServer
    })

    it('should return createWebHistory when VUE_ROUTER_MODE is history', async () => {
      const { getHistoryMode } = await import('../../src/router/index.js')
      const { createWebHistory } = await import('vue-router')
      
      // Save original values
      const originalServer = globalThis.process.env.SERVER
      const originalMode = globalThis.process.env.VUE_ROUTER_MODE
      
      // Set conditions for history mode - delete SERVER to make it falsy
      delete globalThis.process.env.SERVER
      globalThis.process.env.VUE_ROUTER_MODE = 'history'
      
      const result = getHistoryMode()
      expect(result).toBe(createWebHistory)
      
      // Restore original values
      if (originalServer !== undefined) {
        globalThis.process.env.SERVER = originalServer
      }
      globalThis.process.env.VUE_ROUTER_MODE = originalMode
    })

    it('should return createWebHashHistory when VUE_ROUTER_MODE is not history', async () => {
      const { getHistoryMode } = await import('../../src/router/index.js')
      const { createWebHashHistory } = await import('vue-router')
      
      // Save original values
      const originalServer = globalThis.process.env.SERVER
      const originalMode = globalThis.process.env.VUE_ROUTER_MODE
      
      // Set conditions for hash mode - delete SERVER to make it falsy
      delete globalThis.process.env.SERVER
      globalThis.process.env.VUE_ROUTER_MODE = 'hash'
      
      const result = getHistoryMode()
      expect(result).toBe(createWebHashHistory)
      
      // Restore original values
      if (originalServer !== undefined) {
        globalThis.process.env.SERVER = originalServer
      }
      globalThis.process.env.VUE_ROUTER_MODE = originalMode
    })
  })

  describe('Navigation Guards', () => {
    it('should initialize auth store if no access token', async () => {
      mockAuthStore.accessToken = null

      await router.push('/')

      expect(mockAuthStore.initialize).toHaveBeenCalled()
    })

    it('should not initialize auth store if access token exists', async () => {
      mockAuthStore.accessToken = 'existing-token'
      mockAuthStore.isTokenExpired = false
      mockAuthStore.isAuthenticated = true

      await router.push('/dashboard')

      expect(mockAuthStore.initialize).not.toHaveBeenCalled()
    })

    it('should check and refresh token if expired', async () => {
      mockAuthStore.accessToken = 'test-token'
      mockAuthStore.isTokenExpired = true

      await router.push('/')

      expect(mockAuthStore.checkAndRefreshToken).toHaveBeenCalled()
    })

    it('should not refresh token if not expired', async () => {
      mockAuthStore.accessToken = 'test-token'
      mockAuthStore.isTokenExpired = false
      mockAuthStore.isAuthenticated = true

      await router.push('/dashboard')

      expect(mockAuthStore.checkAndRefreshToken).not.toHaveBeenCalled()
    })

    it('should redirect authenticated users from login to dashboard', async () => {
      mockAuthStore.isAuthenticated = true

      await router.push('/login')

      expect(router.currentRoute.value.path).toBe('/dashboard')
    })

    it('should redirect authenticated users from signup to dashboard', async () => {
      mockAuthStore.isAuthenticated = true

      await router.push('/signup')

      expect(router.currentRoute.value.path).toBe('/dashboard')
    })

    it('should redirect authenticated users from forgot-password to dashboard', async () => {
      mockAuthStore.isAuthenticated = true

      await router.push('/forgot-password')

      expect(router.currentRoute.value.path).toBe('/dashboard')
    })

    it('should redirect authenticated users from set-password to dashboard', async () => {
      mockAuthStore.isAuthenticated = true

      await router.push('/set-password/token123')

      expect(router.currentRoute.value.path).toBe('/dashboard')
    })

    it('should redirect unauthenticated users to login when accessing protected route', async () => {
      mockAuthStore.isAuthenticated = false

      // Try to access a protected route (assuming dashboard requires auth)
      await router.push({ 
        path: '/dashboard', 
        meta: { requiresAuth: true } 
      })

      expect(router.currentRoute.value.path).toBe('/login')
    })

    it('should redirect root path to dashboard for authenticated users', async () => {
      mockAuthStore.isAuthenticated = true

      await router.push('/')

      expect(router.currentRoute.value.path).toBe('/dashboard')
    })

    it('should redirect root path to login for unauthenticated users', async () => {
      mockAuthStore.isAuthenticated = false

      await router.push('/')

      expect(router.currentRoute.value.path).toBe('/login')
    })

    it('should allow navigation to public routes', async () => {
      mockAuthStore.isAuthenticated = false

      await router.push('/login')

      expect(router.currentRoute.value.path).toBe('/login')
    })
  })

  describe('Scroll Behavior', () => {
    it('should have scroll behavior configured', () => {
      expect(router.options.scrollBehavior).toBeDefined()
      
      const scrollResult = router.options.scrollBehavior()
      expect(scrollResult).toEqual({ left: 0, top: 0 })
    })
  })
})

