// src/utils/cdnValidator.js
// Run this in browser DevTools console OR as a Node script to verify
// that Vercel's CDN is properly caching your assets.
//
// Usage (browser console):
//   const { validateCDN } = await import('/src/utils/cdnValidator.js')
//   await validateCDN()

const BASE = window?.location?.origin ?? 'https://commerce-flow-beige.vercel.app'

// ── What each header value means ────────────────────────────────
const EXPLANATIONS = {
  'x-vercel-cache': {
    HIT     : '✅ Served from Vercel edge — fastest possible',
    MISS    : '⚠️  Not yet cached — will cache on next request',
    STALE   : '⚠️  Serving stale cache while revalidating in background',
    BYPASS  : '❌ Cache bypassed — check Cache-Control header',
    EXPIRED : '🔄 Cache expired — being refreshed',
  },
  'cache-control': {
    'immutable'             : '✅ Immutable — CDN caches forever (correct for hashed assets)',
    'max-age=31536000'      : '✅ 1 year TTL — correct for hashed static files',
    'max-age=2592000'       : '✅ 30 day TTL — correct for images',
    'max-age=86400'         : '✅ 24 hour TTL — correct for favicon/manifest',
    'max-age=0'             : '✅ No cache — correct for HTML shell',
    'no-store'              : '✅ No cache — correct for API responses',
    'must-revalidate'       : '✅ Must revalidate — correct for HTML',
    'stale-while-revalidate': '✅ SWR active — instant response while refreshing',
  },
}

// ── Asset types to validate ──────────────────────────────────────
async function findAssetURLs() {
  // Grab actual hashed asset URLs from the current page's link/script tags
  const scripts = [...document.querySelectorAll('script[src]')]
    .map(s => s.src)
    .filter(s => s.includes('/assets/'))

  const styles = [...document.querySelectorAll('link[rel=stylesheet]')]
    .map(l => l.href)
    .filter(h => h.includes('/assets/'))

  const images = [...document.querySelectorAll('img[src]')]
    .map(i => i.src)
    .filter(s => !s.startsWith('data:'))
    .slice(0, 3)

  return [
    ...scripts.slice(0, 3),
    ...styles.slice(0, 2),
    ...images,
    `${BASE}/`,
    `${BASE}/api/import`,
  ]
}

async function checkURL(url) {
  try {
    const res = await fetch(url, {
      method: url.includes('/api/') ? 'OPTIONS' : 'GET',
      cache : 'no-store',  // bypass browser cache so we see Vercel headers
    })

    const headers = {}
    res.headers.forEach((val, key) => { headers[key] = val })

    const vercelCache = headers['x-vercel-cache'] ?? 'not present'
    const cacheCtrl   = headers['cache-control']   ?? 'not set'
    const cdnCtrl     = headers['cdn-cache-control']        ?? ''
    const vercelCtrl  = headers['vercel-cdn-cache-control'] ?? ''
    const edgeRegion  = headers['x-vercel-id']     ?? 'unknown'
    const contentType = headers['content-type']    ?? ''
    const age         = headers['age']             ?? '0'

    const cacheStatus = EXPLANATIONS['x-vercel-cache'][vercelCache] ?? `❓ Unknown: ${vercelCache}`
    const isOk = vercelCache === 'HIT' || url.includes('/api/') || url.endsWith('/')

    return {
      url         : url.replace(BASE, ''),
      status      : res.status,
      vercelCache,
      cacheStatus,
      cacheControl: cacheCtrl,
      cdnControl  : vercelCtrl || cdnCtrl,
      edgeRegion,
      contentType,
      ageSeconds  : parseInt(age, 10),
      pass        : isOk,
    }
  } catch (err) {
    return { url, error: err.message, pass: false }
  }
}

export async function validateCDN(silent = false) {
  const urls    = await findAssetURLs()
  const results = await Promise.all(urls.map(checkURL))

  const passed = results.filter(r => r.pass).length
  const failed = results.filter(r => !r.pass).length

  if (!silent) {
    console.group('🌐 Vercel CDN Validation Report')
    console.log(`Checked: ${results.length} assets  |  ✅ ${passed} passed  |  ❌ ${failed} need attention`)
    console.log('')

    results.forEach(r => {
      if (r.error) {
        console.warn(`❌ ${r.url} — ERROR: ${r.error}`)
        return
      }
      const icon = r.pass ? '✅' : '⚠️'
      console.group(`${icon} ${r.url}`)
      console.log('  Vercel Cache  :', r.vercelCache, '—', r.cacheStatus)
      console.log('  Cache-Control :', r.cacheControl)
      if (r.cdnControl) console.log('  CDN-Control   :', r.cdnControl)
      console.log('  Edge Region   :', r.edgeRegion)
      console.log('  Age (seconds) :', r.ageSeconds)
      console.log('  Content-Type  :', r.contentType)
      console.groupEnd()
    })

    console.log('')
    if (failed === 0) {
      console.log('🎉 All assets are correctly cached on Vercel\'s edge CDN!')
    } else {
      console.log('⚠️  Some assets show MISS — this is normal on first load.')
      console.log('   Reload the page once more and re-run validateCDN().')
      console.log('   A persistent MISS or BYPASS means a Cache-Control header issue.')
    }
    console.groupEnd()
  }

  return results
}

// ── Quick single-URL check ────────────────────────────────────────
export async function checkSingleAsset(url) {
  const result = await checkURL(url)
  console.table([result])
  return result
}

// ── Expected headers cheat sheet ────────────────────────────────
export function showExpectedHeaders() {
  console.group('📋 Expected Cache Headers by Asset Type')
  console.table({
    'Hashed JS/CSS (/assets/*.hash.js)': {
      'Cache-Control'           : 'public, max-age=31536000, immutable',
      'CDN-Cache-Control'       : 'public, max-age=31536000, immutable',
      'x-vercel-cache (2nd req)': 'HIT',
    },
    'Images (/assets/images/*.hash.webp)': {
      'Cache-Control'           : 'public, max-age=31536000, immutable',
      'x-vercel-cache (2nd req)': 'HIT',
    },
    'HTML (/)': {
      'Cache-Control'           : 'public, max-age=0, must-revalidate',
      'CDN-Cache-Control'       : 'public, max-age=60, stale-while-revalidate=3600',
      'x-vercel-cache'          : 'MISS or HIT',
    },
    'API (/api/*)': {
      'Cache-Control'           : 'no-store, no-cache, must-revalidate',
      'x-vercel-cache'          : 'MISS (never cached — correct)',
    },
  })
  console.groupEnd()
}
