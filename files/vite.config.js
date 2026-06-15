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
    minify      : 'esbuild',
    target      : 'es2020',
    // Raise limit — we split chunks so individual files stay small
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // ── Content-hash filenames ──────────────────────────────
        // Every file name contains a hash of its content.
        // When code changes, hash changes → new URL → CDN fetches fresh.
        // When code is unchanged, hash is same → CDN serves from cache forever.
        entryFileNames : 'assets/[name].[hash].js',
        chunkFileNames : 'assets/chunks/[name].[hash].js',
        assetFileNames : (assetInfo) => {
          // Route assets into typed sub-folders for cleaner cache rules
          const ext = assetInfo.name?.split('.').pop() ?? ''
          if (['png','jpg','jpeg','gif','webp','avif','svg'].includes(ext))
            return 'assets/images/[name].[hash][extname]'
          if (['woff','woff2','ttf','otf','eot'].includes(ext))
            return 'assets/fonts/[name].[hash][extname]'
          if (ext === 'css')
            return 'assets/css/[name].[hash][extname]'
          return 'assets/[name].[hash][extname]'
        },

        // ── Manual chunk splitting ──────────────────────────────
        // Each vendor chunk has its own cache lifetime.
        // If you update your app code, only your chunk re-downloads —
        // the vendor chunks stay cached at the edge.
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

          // All other node_modules → one shared vendor chunk
          if (id.includes('node_modules'))
            return 'vendor-misc'
        },
      },
    },

    // ── CSS code splitting ──────────────────────────────────────
    // Each async chunk gets its own CSS file → smaller payloads per route
    cssCodeSplit: true,

    // ── Asset inlining threshold ────────────────────────────────
    // Files < 4KB are inlined as base64 (saves a round-trip)
    // Files ≥ 4KB get their own hashed URL (cached at CDN)
    assetsInlineLimit: 4096,
  },

  resolve: {
    alias: { '@': '/src' },
  },
})
