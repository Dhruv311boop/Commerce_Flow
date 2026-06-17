import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // ── Dev server ─────────────────────────────────────────────────
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },

  // ── Production build — CDN-optimised ──────────────────────────
  build: {
    outDir      : 'dist',
    sourcemap   : false,
    // NOTE: Vite 8 uses Rolldown/OXC — do NOT set minify:'esbuild'
    // Vite 8 minifies automatically with OXC (faster than esbuild)
    target      : 'es2020',
    chunkSizeWarningLimit: 900,

    rollupOptions: {
      output: {
        // ── Content-hash filenames ──────────────────────────────
        // When code changes, hash changes → new URL → CDN fetches fresh.
        // When code is unchanged, hash is same → CDN serves from cache forever.
        entryFileNames : 'assets/[name]-[hash].js',
        chunkFileNames : 'assets/chunks/[name]-[hash].js',
        assetFileNames : (assetInfo) => {
          const ext = assetInfo.name?.split('.').pop() ?? ''
          if (['png','jpg','jpeg','gif','webp','avif','svg'].includes(ext))
            return 'assets/images/[name]-[hash][extname]'
          if (['woff','woff2','ttf','otf','eot'].includes(ext))
            return 'assets/fonts/[name]-[hash][extname]'
          if (ext === 'css')
            return 'assets/css/[name]-[hash][extname]'
          return 'assets/[name]-[hash][extname]'
        },

        // ── Manual chunk splitting ──────────────────────────────
        manualChunks(id) {
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom'))
            return 'vendor-react'

          if (id.includes('node_modules/framer-motion'))
            return 'vendor-motion'

          if (id.includes('node_modules/xlsx') ||
              id.includes('node_modules/read-excel-file'))
            return 'vendor-xlsx'

          if (id.includes('node_modules/lucide-react'))
            return 'vendor-ui'

          if (id.includes('node_modules/lenis'))
            return 'vendor-lenis'

          if (id.includes('node_modules/web-vitals'))
            return 'web-vitals'

          // All other node_modules → one shared vendor chunk
          if (id.includes('node_modules'))
            return 'vendor-misc'
        },
      },
    },

    // ── CSS code splitting ──────────────────────────────────────
    cssCodeSplit: true,

    // ── Asset inlining threshold ────────────────────────────────
    // Files < 4KB are inlined as base64 (saves a round-trip)
    assetsInlineLimit: 4096,
  },

  resolve: {
    alias: { '@': '/src' },
  },
})
