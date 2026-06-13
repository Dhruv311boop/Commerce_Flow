import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// ─── Environment Validation ──────────────────────────────────────────────────
const validateEnv = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    console.warn(
      `[CommerceFlow] WARNING: VITE_OPENAI_API_KEY environment variable is not set. ` +
      `AI mapping assistance will not be available. Please set this variable for AI features.`
    );
  }
};
validateEnv();

// ─── Web Vitals Performance Monitor ─────────────────────────────────────────
// Measures FCP, LCP, TTFB, CLS, INP — logs to console in dev,
// sends a lightweight beacon in production (fire-and-forget, never blocks render)
const reportVitals = (metric) => {
  const isProduction = import.meta.env.VITE_APP_ENV === 'production';

  if (!isProduction) {
    // Developer-friendly console output
    const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '🟡' : '🔴';
    console.info(
      `%c[Web Vitals] ${emoji} ${metric.name}`,
      'color: #a855f7; font-weight: bold',
      `${Math.round(metric.value)}${metric.name === 'CLS' ? '' : 'ms'}`,
      `(${metric.rating})`
    );
    return;
  }

  // Production: send as a non-blocking beacon (doesn't affect page performance)
  try {
    const body = JSON.stringify({
      name:   metric.name,
      value:  Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      rating: metric.rating,
      id:     metric.id,
      path:   window.location.pathname,
    });

    // Use sendBeacon when available (guaranteed delivery, zero perf impact)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/vitals', new Blob([body], { type: 'application/json' }));
    }
  } catch {
    // Silently fail — never let monitoring crash the app
  }
};

// Lazy-load web-vitals so it never blocks initial render
const loadWebVitals = () => {
  import('web-vitals').then(({ onFCP, onLCP, onTTFB, onCLS, onINP }) => {
    onFCP(reportVitals);   // First Contentful Paint
    onLCP(reportVitals);   // Largest Contentful Paint (most important for CDN)
    onTTFB(reportVitals);  // Time to First Byte (measures CDN edge response speed)
    onCLS(reportVitals);   // Cumulative Layout Shift
    onINP(reportVitals);   // Interaction to Next Paint
  }).catch(() => {
    // web-vitals not installed — skip silently
  });
};

// Start measuring after the page is interactive (never blocks paint)
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    loadWebVitals();
  } else {
    window.addEventListener('load', loadWebVitals, { once: true });
  }
}

// ─── App Mount ───────────────────────────────────────────────────────────────
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
