import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined

export default defineConfig({
  base: isTauri ? '/' : '/gibran-os/',
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  plugins: [
    react(),
    !isTauri && VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Gibran OS',
        short_name: 'GibranOS',
        theme_color: '#00d4aa',
        background_color: '#0a0c0f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/gibran-os/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,mjs}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: { maxEntries: 10, maxAgeSeconds: 31536000 }
          }
        }]
      }
    }),
  ].filter(Boolean),
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
  build: {
    target: isTauri ? ['es2021', 'chrome100', 'safari13'] : 'modules',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      external: isTauri ? [] : ['@tauri-apps/plugin-notification'],
    },
  },
})
