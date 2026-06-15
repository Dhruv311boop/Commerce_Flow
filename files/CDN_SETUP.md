# CommerceFlow — Vercel CDN Setup & Validation

Vercel has a built-in global edge CDN. No external CDN is needed.
This document explains exactly how it's configured and how to verify it.

---

## How It Works

```
User request
     │
     ▼
Vercel Edge Network (100+ locations worldwide)
     │
     ├── Cache HIT?  → Return instantly from edge (no origin hit)
     │
     └── Cache MISS? → Forward to Vercel origin → cache → return
```

---

## Cache Strategy by Asset Type

| Asset | File Pattern | TTL | Header | Why |
|---|---|---|---|---|
| JS chunks | `/assets/*.hash.js` | **1 year** | `immutable` | Hash changes when content changes |
| CSS chunks | `/assets/css/*.hash.css` | **1 year** | `immutable` | Same — hash guarantees freshness |
| Images (hashed) | `/assets/images/*.hash.webp` | **1 year** | `immutable` | Hash changes with content |
| Images (public) | `/images/*.png` | **30 days** | `stale-while-revalidate` | No hash — shorter TTL |
| Fonts | `/assets/fonts/*.woff2` | **1 year** | `immutable` | Fonts never change |
| HTML shell | `/` `index.html` | **60 seconds** | `stale-while-revalidate=3600` | Must deploy new versions fast |
| API routes | `/api/*` | **Never** | `no-store` | Dynamic — never cache |
| Favicon | `/favicon.*` | **24 hours** | — | Rarely changes |

---

## Why Content-Hash Filenames Are Critical

Vite outputs filenames like:
```
assets/vendor-react.a3f9c2b1.js
assets/index.7d4e8f2a.js
assets/css/index.1c3b5a7e.css
```

The hash (`a3f9c2b1`) is generated from the file content.

- **If the file changes** → hash changes → new URL → CDN fetches fresh copy
- **If the file is unchanged** → same hash → same URL → CDN serves from cache

This means we can safely set `max-age=31536000, immutable` — the URL itself acts as a cache-busting mechanism.

---

## Vercel CDN Cache Headers Explained

### `Cache-Control`
Browser cache instruction. Also read by Vercel edge.

### `CDN-Cache-Control`
Vercel-specific. Overrides `Cache-Control` **at the edge only**.
Browser still sees the `Cache-Control` value.

### `Vercel-CDN-Cache-Control`
Most specific. Only applies to Vercel's edge network.
Takes priority over `CDN-Cache-Control` and `Cache-Control`.

### `stale-while-revalidate`
Edge serves the stale (old) cached version instantly, then fetches a fresh copy in the background.
Result: zero latency for the user, always-fresh content.

---

## How to Verify CDN is Working

### Method 1 — API endpoint (simplest)

Visit in your browser:
```
https://commerce-flow-beige.vercel.app/api/validate-cdn
```

Returns a JSON report showing cache status for all asset types.

### Method 2 — Chrome DevTools

1. Open **https://commerce-flow-beige.vercel.app**
2. Open DevTools → **Network** tab
3. Hard reload: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
4. Click any `.js` or `.css` file
5. Look at **Response Headers**:

**First load (MISS — normal):**
```
cache-control: public, max-age=31536000, immutable
x-vercel-cache: MISS
```

**Second load (HIT — CDN working correctly):**
```
cache-control: public, max-age=31536000, immutable
x-vercel-cache: HIT
age: 42
x-vercel-id: iad1::abc123  ← edge region that served it
```

### Method 3 — Browser console (after deploy)

```js
// Paste into DevTools console on your live site
const { validateCDN } = await import('/src/utils/cdnValidator.js')
await validateCDN()
```

### Method 4 — curl

```bash
# First request — will be MISS
curl -I https://commerce-flow-beige.vercel.app/assets/vendor-react.HASH.js

# Second request — should be HIT
curl -I https://commerce-flow-beige.vercel.app/assets/vendor-react.HASH.js

# Look for:
# x-vercel-cache: HIT
# cache-control: public, max-age=31536000, immutable
# age: <seconds since cached>
```

---

## Expected Response Headers Reference

### Hashed JS/CSS file
```http
HTTP/2 200
cache-control: public, max-age=31536000, immutable
cdn-cache-control: public, max-age=31536000, immutable
vercel-cdn-cache-control: public, max-age=31536000, immutable
content-type: application/javascript; charset=utf-8
x-vercel-cache: HIT
age: 3600
x-content-type-options: nosniff
```

### HTML page
```http
HTTP/2 200
cache-control: public, max-age=0, must-revalidate
cdn-cache-control: public, max-age=60, stale-while-revalidate=3600
x-vercel-cache: HIT
x-frame-options: DENY
strict-transport-security: max-age=63072000; includeSubDomains; preload
```

### API route
```http
HTTP/2 200
cache-control: no-store, no-cache, must-revalidate
cdn-cache-control: no-store
x-vercel-cache: MISS
access-control-allow-origin: *
```

---

## Chunk Sizes After Optimisation

Vite splits output into these cacheable chunks:

| Chunk | Contains | Cached separately |
|---|---|---|
| `vendor-react` | react + react-dom | Yes — changes rarely |
| `vendor-motion` | framer-motion | Yes — changes rarely |
| `vendor-xlsx` | xlsx + read-excel-file | Yes — changes rarely |
| `vendor-ui` | lucide-react | Yes — changes rarely |
| `vendor-lenis` | lenis scroll | Yes — changes rarely |
| `vendor-misc` | other npm packages | Yes |
| `index` | your app code | Yes — changes most often |

When you update your app code, only `index.HASH.js` changes.
All vendor chunks stay cached at the edge — users re-download only the changed file.

---

## Image Optimization

Vercel optimizes images automatically via `/_vercel/image`:
- Converts PNG/JPG → WebP or AVIF (based on browser support)
- Resizes to requested width
- Cached at the edge after first request
- Zero config required

Use the `VercelImage` component from `src/utils/imageOptimizer.js`:
```jsx
import VercelImage from '@/utils/imageOptimizer'

// Replaces <img src="..." />
<VercelImage src="/hero.png" width={1200} alt="Hero" priority />
```

---

## Files Modified for CDN Optimisation

| File | Change |
|---|---|
| `vercel.json` | Added fine-grained cache headers per asset type |
| `vite.config.js` | Asset sub-folders, fine chunk splitting, 4KB inline threshold |
| `api/validate-cdn.js` | New endpoint to check CDN status |
| `src/utils/cdnValidator.js` | Browser-side CDN validation tool |
| `src/utils/imageOptimizer.js` | Vercel image optimization helpers |
| `public/robots.txt` | Added Disallow for /api/ |
