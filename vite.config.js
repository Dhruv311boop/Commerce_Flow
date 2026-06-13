import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },

  build: {
    // Warn only for chunks > 900 KB
    chunkSizeWarningLimit: 900,

    // No sourcemaps in production (saves ~30% bundle size)
    sourcemap: false,

    // Inline assets smaller than 4 KB as base64 (avoids extra HTTP round-trips)
    assetsInlineLimit: 4096,

    // Split CSS per chunk for better parallel loading
    cssCodeSplit: true,

    // Target modern browsers — smaller, faster output
    target: 'es2020',

    rollupOptions: {
      output: {
        // Content-hashed filenames → safe for immutable CDN caching
        entryFileNames:  'assets/[name]-[hash].js',
        chunkFileNames:  'assets/[name]-[hash].js',
        assetFileNames:  'assets/[name]-[hash][extname]',

        manualChunks(id) {
          if (id.includes('node_modules')) {
            // React core — smallest, most-shared chunk
            if (id.includes('react-dom') || id.includes('react/')) {
              return 'vendor';
            }
            // Heavy animation library — separate so it can be lazy-loaded later
            if (id.includes('framer-motion')) {
              return 'framer';
            }
            // Spreadsheet + icon libs — grouped together
            if (
              id.includes('xlsx') ||
              id.includes('read-excel-file') ||
              id.includes('lenis') ||
              id.includes('lucide-react')
            ) {
              return 'libs';
            }
          }
        }
      }
    }
  }
})
