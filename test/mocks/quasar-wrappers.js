// Mock #q-app/wrappers for test environment
// This file replaces .quasar/wrappers.js which doesn't exist in CI

export function defineRouter(fn) {
  return fn
}

export function defineSsrMiddleware(fn) {
  return fn
}

export function defineStore(fn) {
  return fn
}

export function defineBoot(fn) {
  return fn
}

export function definePreFetch(fn) {
  return fn
}
