import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'Claudio - AI 音乐电台',
        short_name: 'Claudio',
        description: '个人化 AI 音乐电台',
        theme_color: '#1a1a2e',
        background_color: '#16213e',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/cache': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/stream': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
});
