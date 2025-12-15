import { vi } from 'vitest'
import { config } from '@vue/test-utils'

// Mock Quasar
config.global.mocks = {
  $q: {
    notify: vi.fn()
  }
}

// Mock globalThis properties
globalThis.location = {
  origin: 'http://localhost:3000',
  search: '',
  href: 'http://localhost:3000'
}

globalThis.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

// Mock import.meta.env - use define to set it properly
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_BASE_URL: 'http://localhost:5001',
        VITE_MICROSOFT_CLIENT_ID: 'test-microsoft-client-id',
        VITE_GOOGLE_CLIENT_ID: 'test-google-client-id',
        VITE_SHOW_FUTURE: 'false'
      }
    }
  },
  writable: true
})

// Also use stubEnv as backup
vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:5001')
vi.stubEnv('VITE_MICROSOFT_CLIENT_ID', 'test-microsoft-client-id')
vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-google-client-id')
vi.stubEnv('VITE_SHOW_FUTURE', 'false')

// Mock process.env for router tests
if (!globalThis.process) {
  globalThis.process = {}
}
if (!globalThis.process.env) {
  globalThis.process.env = {}
}
// Set default values
globalThis.process.env.SERVER = globalThis.process.env.SERVER || false
globalThis.process.env.VUE_ROUTER_MODE = globalThis.process.env.VUE_ROUTER_MODE || 'history'
globalThis.process.env.VUE_ROUTER_BASE = globalThis.process.env.VUE_ROUTER_BASE || '/'

// Mock window.scrollTo for router tests
globalThis.window.scrollTo = vi.fn()

