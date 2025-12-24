const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: 'dashboard',
        component: () => import('pages/dashboard/IndexPage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'tasks',
        component: () => import('pages/tasks/TasksPage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'profile',
        component: () => import('pages/profile/EditProfilePage.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },

  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: 'signup',
        component: () => import('pages/Auth/SignupPage.vue'),
        meta: { requiresAuth: false },
      },
      {
        path: 'login',
        component: () => import('pages/Auth/LoginPage.vue'),
        meta: { requiresAuth: false },
      },
      {
        path: 'forgot-password',
        component: () => import('pages/Auth/ForgotPasswordPage.vue'),
        meta: { requiresAuth: false },
      },
      {
        path: '/set-password/:token/:uidb64',
        component: () => import('pages/Auth/SetPasswordPage.vue'),
        meta: { requiresAuth: false },
      },
      {
        path: 'auth/callback',
        component: () => import('pages/Auth/AuthCallback.vue'),
        meta: { requiresAuth: false },
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/error/ErrorNotFound.vue'),
  },
]

export default routes
