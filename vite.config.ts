import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Tells the plugin to generate sw.js and inject the precache manifest
      injectRegister: 'auto',
      devOptions: {
        enabled: true,       // ← enables SW in dev mode
        type: 'module',
      },
      workbox: {
        // Precache ALL build output — JS, CSS, HTML, images
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // Don't require a fetch handler for the install prompt to fire
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        // Cache jsQR and other large assets
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      },
      manifest: {
        name: 'AnyPay — Offline UPI Payments',
        short_name: 'AnyPay',
        description: 'Scan UPI QR codes and pay offline using USSD',
        start_url: '/',
        display: 'standalone',

        background_color: '#0a0a0b',
        theme_color: '#6c63ff',
        orientation: 'portrait',
        icons: [
          { src: '/public/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/public/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})