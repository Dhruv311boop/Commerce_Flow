// api/validate-cdn.js — Vercel Serverless Function
// GET /api/validate-cdn
// Fetches your own static assets and returns their cache headers as JSON.
// Use this to verify CDN status without opening DevTools.
//
// Call it: https://commerce-flow-beige.vercel.app/api/validate-cdn

export const config = { runtime: 'nodejs20.x' }

const ASSET_PATTERNS = [
  // HTML shell
  { path: '/',             type: 'html',  expectCache: false },
  // API (should never be cached)
  { path: '/api/import',   type: 'api',   expectCache: false },
]

function grade(headers, expectCache) {
  const cc       = headers['cache-control'] ?? ''
  const vercelCC = headers['x-vercel-cache'] ?? ''

  if (!expectCache) {
    if (cc.includes('no-store') || cc.includes('must-revalidate') ||
        cc.includes('max-age=0'))
      return { grade: 'PASS', reason: 'Correctly not cached' }
    return { grade: 'WARN', reason: `Expected no-cache but got: ${cc}` }
  }

  if (cc.includes('max-age=31536000') && cc.includes('immutable'))
    return { grade: 'PASS', reason: '1 year immutable — optimal for hashed assets' }
  if (cc.includes('max-age=2592000'))
    return { grade: 'PASS', reason: '30 day cache — good for images' }
  if (cc.includes('stale-while-revalidate'))
    return { grade: 'PASS', reason: 'SWR active — good balance of freshness + speed' }
  if (cc.includes('max-age=0'))
    return { grade: 'WARN', reason: 'max-age=0 — not cached at edge' }
  if (!cc)
    return { grade: 'FAIL', reason: 'No Cache-Control header — Vercel default (no edge cache)' }

  return { grade: 'PASS', reason: cc }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  const host    = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'commerce-flow-beige.vercel.app'
  const proto   = req.headers['x-forwarded-proto'] ?? 'https'
  const baseURL = `${proto}://${host}`

  const results = await Promise.all(
    ASSET_PATTERNS.map(async ({ path, type, expectCache }) => {
      const url = `${baseURL}${path}`
      try {
        const r       = await fetch(url, { method: 'HEAD', redirect: 'follow' })
        const headers = {}
        r.headers.forEach((v, k) => { headers[k] = v })

        const { grade: g, reason } = grade(headers, expectCache)

        return {
          path,
          type,
          status       : r.status,
          grade        : g,
          reason,
          headers: {
            'cache-control'            : headers['cache-control']            ?? '(not set)',
            'cdn-cache-control'        : headers['cdn-cache-control']        ?? '(not set)',
            'vercel-cdn-cache-control' : headers['vercel-cdn-cache-control'] ?? '(not set)',
            'x-vercel-cache'           : headers['x-vercel-cache']           ?? '(not set)',
            'x-vercel-id'              : headers['x-vercel-id']              ?? '(not set)',
            'age'                      : headers['age']                      ?? '0',
            'content-type'             : headers['content-type']             ?? '(not set)',
          },
        }
      } catch (err) {
        return { path, type, grade: 'ERROR', reason: err.message }
      }
    })
  )

  const passed = results.filter(r => r.grade === 'PASS').length
  const warned = results.filter(r => r.grade === 'WARN').length
  const failed = results.filter(r => r.grade === 'FAIL' || r.grade === 'ERROR').length

  return res.status(200).json({
    summary: {
      total  : results.length,
      passed,
      warned,
      failed,
      overall: failed > 0 ? 'NEEDS_ATTENTION' : warned > 0 ? 'GOOD' : 'OPTIMAL',
    },
    results,
    howToVerifyManually: {
      step1: 'Open Chrome DevTools → Network tab',
      step2: 'Hard reload: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)',
      step3: 'Click any .js or .css file in the Network tab',
      step4: 'Look at Response Headers',
      step5: 'x-vercel-cache: HIT = served from edge ✅',
      step6: 'Reload again — MISS on first load is normal, HIT on second is correct',
    },
  })
}
