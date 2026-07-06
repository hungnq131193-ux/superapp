/// <reference types="vitest/config" />
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      // 'prompt': người dùng chủ động bấm cập nhật qua UpdateToast, không tự reload.
      registerType: 'prompt',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'],
      manifest: {
        name: 'Xưởng Thiết Kế Mặt Bằng Việt',
        short_name: 'Mặt Bằng Việt',
        description: 'Sinh mặt bằng nhà ở 2D theo ràng buộc, chạy hoàn toàn trên trình duyệt.',
        lang: 'vi',
        display: 'standalone',
        start_url: '/',
        theme_color: '#0f766e',
        background_color: '#ffffff',
        icons: [
          {src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png'},
          {src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png'},
          {src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'}
        ]
      },
      workbox: {
        // Chỉ precache asset build tĩnh; dữ liệu người dùng nằm trong localStorage,
        // service worker không bao giờ đụng tới.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: '/index.html',
        runtimeCaching: []
      }
    })
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
