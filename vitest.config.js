import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    vue({
      template: { transformAssetUrls }
    }),
    quasar({
      sassVariables: 'src/css/quasar.variables.scss'
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'test/**',
        'tests/**',
        '**/*.spec.js',
        '**/*.test.js',
        '**/dist/**',
        'quasar.config.js',
        'postcss.config.js',
        'eslint.config.js',
        '.quasar/**'
      ]
    },
    env: {
      VITE_API_BASE_URL: 'http://localhost:5001',
      VITE_MICROSOFT_CLIENT_ID: 'test-microsoft-client-id',
      VITE_GOOGLE_CLIENT_ID: 'test-google-client-id',
      VITE_SHOW_FUTURE: 'false'
    }
  },
  resolve: {
    alias: [
      { find: 'src', replacement: path.resolve(__dirname, './src') },
      { find: 'stores', replacement: path.resolve(__dirname, './src/stores') },
      { find: 'config', replacement: path.resolve(__dirname, './src/config') },
      { find: 'services', replacement: path.resolve(__dirname, './src/services') },
      { find: 'layouts', replacement: path.resolve(__dirname, './src/layouts') },
      { find: 'pages', replacement: path.resolve(__dirname, './src/pages') },
      { find: 'components', replacement: path.resolve(__dirname, './src/components') },
      { find: 'assets', replacement: path.resolve(__dirname, './src/assets') },
      // Use test mock for #q-app/wrappers since .quasar directory doesn't exist in CI
      { find: '#q-app/wrappers', replacement: path.resolve(__dirname, './test/mocks/quasar-wrappers.js') },
      { find: '#q-app', replacement: path.resolve(__dirname, './.quasar') },
      { find: '@', replacement: path.resolve(__dirname, './src') }
    ]
  }
})

