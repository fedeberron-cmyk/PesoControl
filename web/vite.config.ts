import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/PesoControl/app/',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      selfDestroying: true,
      manifest: {
        name: 'PesoControl',
        short_name: 'PesoControl',
        description: 'Tu deuda calórica, a tu ritmo.',
        theme_color: '#3c6b4a',
        background_color: '#f3ede3',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
})
