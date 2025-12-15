import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('showFuture.js', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset environment variable
    vi.stubEnv('VITE_SHOW_FUTURE', 'false')
    
    // Reset globalThis.window and location
    globalThis.window = globalThis
    globalThis.location = {
      search: ''
    }
  })

  it('should return true when URL query parameter is "true"', async () => {
    globalThis.location.search = '?show_future=true'
    
    // Re-import to get fresh evaluation
    const module = await import('../../src/showFuture.js?t=' + Date.now())
    
    expect(module.getShowFutureValue()).toBe(true)
  })

  it('should return false when URL query parameter is "false"', async () => {
    globalThis.location.search = '?show_future=false'
    
    const module = await import('../../src/showFuture.js?t=' + Date.now())
    
    expect(module.getShowFutureValue()).toBe(false)
  })

  it('should fall back to environment variable when no query parameter', async () => {
    globalThis.location.search = ''
    vi.stubEnv('VITE_SHOW_FUTURE', 'true')
    
    const module = await import('../../src/showFuture.js?t=' + Date.now())
    
    expect(module.getShowFutureValue()).toBe(true)
  })

  it('should prioritize URL query parameter over environment variable', async () => {
    globalThis.location.search = '?show_future=true'
    vi.stubEnv('VITE_SHOW_FUTURE', 'false')
    
    const module = await import('../../src/showFuture.js?t=' + Date.now())
    
    expect(module.getShowFutureValue()).toBe(true)
  })

  it('should export showFuture constant', async () => {
    globalThis.location.search = '?show_future=true'
    
    const module = await import('../../src/showFuture.js?t=' + Date.now())
    
    expect(module.showFuture).toBeDefined()
    expect(typeof module.showFuture).toBe('boolean')
  })

  it('should handle missing query parameter gracefully', async () => {
    globalThis.location.search = '?other_param=value'
    vi.stubEnv('VITE_SHOW_FUTURE', 'false')
    
    const module = await import('../../src/showFuture.js?t=' + Date.now())
    
    expect(module.getShowFutureValue()).toBe(false)
  })

  it('should handle window undefined scenario', async () => {
    const originalWindow = globalThis.window
    globalThis.window = undefined
    
    vi.stubEnv('VITE_SHOW_FUTURE', 'true')
    
    const module = await import('../../src/showFuture.js?t=' + Date.now())
    
    expect(module.getShowFutureValue()).toBe(true)
    
    // Restore
    globalThis.window = originalWindow
  })
})

