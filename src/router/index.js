import { defineRouter } from '#q-app/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

/**
 * Returns the appropriate history creation function based on environment.
 * Exported for testing purposes.
 */
export function getHistoryMode() {
  if (process.env.SERVER) {
    return createMemoryHistory
  } else if (process.env.VUE_ROUTER_MODE === 'history') {
    return createWebHistory
  } else {
    return createWebHashHistory
  }
}

export default defineRouter(function () {
  const createHistory = getHistoryMode()

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  // Add navigation guard
  Router.beforeEach(async (to, from, next) => {
    // Import here to avoid circular dependency
    const { useAuthStore } = await import('src/stores/auth')
    const authStore = useAuthStore()

    // Initialize auth store if needed
    if (!authStore.accessToken) {
      authStore.initialize()
    }

    // Check and refresh token if needed
    if (authStore.accessToken && authStore.isTokenExpired) {
      await authStore.checkAndRefreshToken()
    }

    const isAuthenticated = authStore.isAuthenticated
    const requiresAuth = to.meta?.requiresAuth

    // Redirect authenticated users away from auth pages (login, signup, etc.)
    // This prevents authenticated users from accessing login/signup forms
    if (isAuthenticated && (to.path === '/login' || to.path === '/signup' || to.path === '/forgot-password' || to.path.startsWith('/set-password'))) {
      next({ path: '/dashboard' })
      return
    }

    if (requiresAuth && !isAuthenticated) {
      next({ path: '/login' })
    } else if (to.path === '/' && isAuthenticated) {
      next({ path: '/dashboard' })
    } else if (to.path === '/' && !isAuthenticated) {
      next({ path: '/login' })
    } else {
      next()
    }
  })

  return Router
})
