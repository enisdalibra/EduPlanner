import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { applyContentSecurityPolicy } from './scripts/content-security-policy.mjs';
import { resolveDeploymentBase } from './scripts/deployment-base.mjs';

export default defineConfig(({ command }) => ({
  base: resolveDeploymentBase(),
  plugins: [
    {
      name: 'eduplanner-content-security-policy',
      enforce: 'pre',
      transformIndexHtml: {
        order: 'pre',
        handler: (html) => applyContentSecurityPolicy(html, command),
      },
    },
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'EduPlanner Local',
        short_name: 'EduPlanner',
        description: 'Offline-First Teacher Command Center',
        theme_color: '#2563EB',
        icons: [
          {
            src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect y="0" x="0" width="100" height="100" fill="%232563EB"/><text y="65" x="25" fill="white" font-size="50" font-family="Arial">EP</text></svg>',
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/read-excel-file')) return 'excel-reader';
          if (id.includes('node_modules/write-excel-file')) return 'excel-writer';
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router')) return 'react-vendor';
          if (id.includes('node_modules/dexie') || id.includes('node_modules/zustand')) return 'data-vendor';
        },
      },
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
}));
