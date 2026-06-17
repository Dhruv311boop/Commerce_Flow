// src/utils/flexibleImporter.js
// Browser-side: parse CSV/Excel files, then send to Vercel API for normalization

/**
 * Detect source type from a File object or a config dict
 */
export function detectSourceType(source) {
  if (source instanceof File) {
    const ext = source.name.split('.').pop().toLowerCase();
    if (['csv', 'tsv'].includes(ext))              return { type: 'file', subtype: 'csv' };
    if (['xlsx', 'xls', 'xlsm'].includes(ext))    return { type: 'file', subtype: 'excel' };
    throw new Error(`Unsupported file type: .${ext}`);
  }
  if (typeof source === 'object' && source.kind) {
    const kind = source.kind.toLowerCase();
    if (['mysql','oracle','sqlite','postgres'].includes(kind))     return { type: 'database', subtype: kind };
    if (['shopify','woocommerce','woo','magento'].includes(kind))  return { type: 'api',      subtype: kind === 'woo' ? 'woocommerce' : kind };
    if (source.url)                                                return { type: 'api',      subtype: 'generic' };
  }
  throw new Error('Cannot detect source type');
}

/**
 * Parse a CSV File → array of row objects
 */
export async function parseCSVFile(file) {
  const text = await file.text();
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    // Handle quoted commas
    const values = [];
    let cur = '', inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { values.push(cur); cur = ''; continue; }
      cur += ch;
    }
    values.push(cur);
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] || '').trim()]));
  }).filter(row => Object.values(row).some(v => v !== ''));
}

/**
 * Parse an Excel File → array of row objects
 * Uses the xlsx library (already in your package.json)
 */
export async function parseExcelFile(file) {
  const { read, utils } = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = read(buffer, { type: 'array' });
  const allRows = [];
  for (const sheetName of wb.SheetNames) {
    const rows = utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
    allRows.push(...rows);
  }
  return allRows;
}

/**
 * Send parsed rows to the Vercel /api/import endpoint for mapping + normalization
 */
export async function normalizeViaAPI(rows, source = 'upload', extraMappings = {}) {
  const res = await fetch('/api/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, source, extra_mappings: extraMappings }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Import API failed');
  }
  return res.json(); // { rows, flags, report }
}

/**
 * Fetch from a live API (Shopify/WooCommerce) via the Vercel proxy
 */
export async function fetchFromSource(config) {
  const res = await fetch('/api/fetch-source', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Source fetch failed');
  }
  return res.json(); // { rows, count }
}

/**
 * Main entry point — mirrors the Python run_import() interface
 *
 * Usage:
 *   const result = await runImport(fileObject);
 *   const result = await runImport({ kind: 'shopify', shop: '...', token: '...' });
 *
 * Returns: { rows, flags, report }
 */
export async function runImport(source, extraMappings = {}) {
  const info = detectSourceType(source);

  let rows;

  // File sources: parse in the browser
  if (info.type === 'file') {
    rows = info.subtype === 'csv'
      ? await parseCSVFile(source)
      : await parseExcelFile(source);
    return normalizeViaAPI(rows, `file/${info.subtype}`, extraMappings);
  }

  // API sources: proxy through Vercel to avoid CORS + hide credentials
  if (info.type === 'api') {
    const fetched = await fetchFromSource(source);
    rows = fetched.rows;
    return normalizeViaAPI(rows, `api/${info.subtype}`, extraMappings);
  }

  // Database: not supported client-side (runs server-side only)
  throw new Error('Database imports must be triggered server-side. Use /api/import directly with pre-fetched rows.');
}
