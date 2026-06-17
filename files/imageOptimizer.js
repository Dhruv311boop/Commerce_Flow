// src/utils/imageOptimizer.js
// Helpers that use Vercel's built-in Image Optimization API
// Docs: https://vercel.com/docs/image-optimization
//
// Vercel auto-converts images to WebP/AVIF, resizes them,
// and serves them from the edge CDN — zero config needed.
// Just use the <VercelImage> component or buildImageURL() below.

// ── Build a Vercel-optimised image URL ───────────────────────────
//
// Vercel's /_next/image endpoint accepts:
//   url    = absolute URL or path to source image
//   w      = desired width in pixels
//   q      = quality 1-100 (default 75)
//
// It will:
//   • Resize to the requested width
//   • Convert to WebP or AVIF (based on browser Accept header)
//   • Cache at the edge for 60 seconds → re-serve until TTL expires
//   • Return the smallest possible file
//
export function buildImageURL(src, width = 800, quality = 80) {
  // Already an optimised URL — pass through
  if (src.includes('/_vercel/image')) return src

  // External URL — let Vercel proxy and optimise it
  const encoded = encodeURIComponent(src.startsWith('http') ? src : `${window.location.origin}${src}`)
  return `/_vercel/image?url=${encoded}&w=${width}&q=${quality}`
}

// ── Responsive srcSet builder ────────────────────────────────────
// Returns a srcset string covering common breakpoints.
// Browser picks the right size automatically.
export function buildSrcSet(src, quality = 80) {
  const widths = [320, 480, 640, 750, 828, 1080, 1200, 1920]
  return widths
    .map(w => `${buildImageURL(src, w, quality)} ${w}w`)
    .join(', ')
}

// ── React component — drop-in replacement for <img> ─────────────
// Usage:
//   import VercelImage from '@/utils/imageOptimizer'
//   <VercelImage src="/hero.png" width={800} alt="Hero" priority />
//
export default function VercelImage({
  src,
  width    = 800,
  height,
  alt      = '',
  quality  = 80,
  priority = false,   // true → no lazy loading (above-the-fold images)
  className,
  style,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
}) {
  const optimisedSrc = buildImageURL(src, width, quality)
  const srcSet       = buildSrcSet(src, quality)

  return (
    <img
      src={optimisedSrc}
      srcSet={srcSet}
      sizes={sizes}
      width={width}
      height={height}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      className={className}
      style={style}
    />
  )
}

// ── Preload hint for critical images ────────────────────────────
// Call this for hero images / LCP candidates to trigger edge prefetch.
// Add to your app's <head> or call in a useEffect before the image mounts.
export function preloadImage(src, width = 1200) {
  if (typeof document === 'undefined') return
  const link = document.createElement('link')
  link.rel          = 'preload'
  link.as           = 'image'
  link.href         = buildImageURL(src, width)
  link.imageSrcset  = buildSrcSet(src)
  link.imageSizes   = '100vw'
  link.fetchPriority = 'high'
  document.head.appendChild(link)
}
