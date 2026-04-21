import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  envDir: '.',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@turon/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react'
          }

          if (id.includes('/@tanstack/')) {
            return 'vendor-query'
          }

          if (id.includes('/@supabase/')) {
            return 'vendor-supabase'
          }

          if (id.includes('/lucide-react/')) {
            return 'vendor-icons'
          }

          if (id.includes('/axios/') || id.includes('/zustand/')) {
            return 'vendor-utils'
          }

          return undefined
        }
      }
    }
  },
  server: {
    port: 5173,
    allowedHosts: true,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } }
  }
})


