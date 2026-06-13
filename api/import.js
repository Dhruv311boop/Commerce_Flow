// api/import.js
// Vercel Serverless Function — Node.js runtime
// Handles: JSON data import, column mapping, row parsing, normalization
// Deploy: this file lives in /api/ at the root of your project

export const config = { runtime: 'nodejs' };

// ── SYNONYMS DICTIONARY ──────────────────────────────────────────
const SYNONYMS = {
  customer_name: ['customer','client','buyer','name','full_name','billing_name','contact','customer_name'],
  age:           ['age','customer_age','years'],
  order_id:      ['order_id','order','id','order_number','number','transaction_id','ref','reference'],
  product:       ['product','item','sku','product_name','title','name','description','goods'],
  quantity:      ['quantity','qty','count','units','amount','pieces'],
  price:         ['price','unit_price','cost','rate','value','total_price','sale_price'],
  email:         ['email','email_address','e_mail','mail'],
  phone:         ['phone','phone_number','mobile','tel'],
  address:       ['address','shipping_address','billing_address','street'],
  order_date:    ['order_date','date','created_at','timestamp','placed_at'],
  status:        ['status','order_status','state','fulfillment_status'],
};

const DEFAULTS = {
  customer_name : 'Unknown',
  age           : 0,
  order_id      : 'IMPORT-0',
  product       : 'Unknown Product',
  quantity      : 1,
  price         : 0.0,
  email         : '',
  status        : 'pending',
  order_date    : '1970-01-01',
};

// ── COLUMN AUTO-MAPPER ───────────────────────────────────────────
function autoMapColumns(columns, extraMappings = {}) {
  const norm = (s) => s.trim().toLowerCase().replace(/[\s-]/g, '_');
  const normCols = {};
  columns.forEach(c => { normCols[norm(c)] = c; });

  const mapping = {};
  const flags   = [];

  for (const [canonical, aliases] of Object.entries(SYNONYMS)) {
    const matched = aliases.find(a => normCols[a]);
    if (matched) mapping[canonical] = normCols[matched];
    else         flags.push({ field: canonical, reason: 'no matching column found' });
  }

  return { mapping: { ...mapping, ...extraMappings }, flags };
}

// ── FILL DEFAULTS ────────────────────────────────────────────────
function fillDefaults(row, idx) {
  const out = { ...row };
  for (const [field, def] of Object.entries(DEFAULTS)) {
    const v = out[field];
    if (v === undefined || v === null || v === '' || v === 'NaN') {
      out[field] = typeof def === 'string' ? def.replace('{i}', idx) : def;
    }
  }
  return out;
}

// ── MULTI-ITEM ROW PARSER ────────────────────────────────────────
// Splits "3x Widget A, 1x Gadget B" into two rows
const ITEM_RE = /(\d+)[x×]\s*(.+?)(?=,\s*\d+[x×]|$)/gi;

function parseMultiItemRow(row) {
  const raw = String(row.product || '');
  const matches = [...raw.matchAll(ITEM_RE)];
  if (!matches.length) return [row];

  return matches.map(([, qty, name]) => ({
    ...row,
    product     : name.trim(),
    quantity    : parseInt(qty, 10),
    _was_packed : true,
  }));
}

// ── NORMALIZE ────────────────────────────────────────────────────
function coerce(value, type) {
  if (value === null || value === undefined) return type === 'number' ? 0 : '';
  if (type === 'number') {
    const n = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  if (type === 'int') {
    const n = parseInt(String(value), 10);
    return isNaN(n) ? 0 : n;
  }
  return String(value).trim();
}

function flagUncertain(row) {
  const reasons = [];
  if (row.customer_name === 'Unknown')   reasons.push('missing customer_name');
  if (Number(row.price) === 0)           reasons.push('price=0');
  if (row.order_date   === '1970-01-01') reasons.push('missing date');
  return reasons.join('; ');
}

function normalizeRow(row, sourceLabel, idx) {
  const out = fillDefaults(row, idx);
  return {
    order_id      : coerce(out.order_id,      'str'),
    order_date    : coerce(out.order_date,     'str'),
    customer_name : coerce(out.customer_name,  'str'),
    email         : coerce(out.email,          'str'),
    phone         : coerce(out.phone,          'str'),
    age           : coerce(out.age,            'int'),
    address       : coerce(out.address,        'str'),
    product       : coerce(out.product,        'str'),
    quantity      : coerce(out.quantity,       'int'),
    price         : coerce(out.price,          'number'),
    status        : coerce(out.status,         'str'),
    _source       : sourceLabel,
    _was_packed   : out._was_packed || false,
    _flag         : flagUncertain(out),
  };
}

// ── APPLY COLUMN MAPPING ─────────────────────────────────────────
function applyMapping(rows, mapping) {
  return rows.map(row => {
    const out = {};
    // Rename mapped columns to canonical names
    for (const [canonical, original] of Object.entries(mapping)) {
      if (original in row) out[canonical] = row[original];
    }
    // Keep unmapped columns as-is
    for (const [key, val] of Object.entries(row)) {
      const isMapped = Object.values(mapping).includes(key);
      if (!isMapped) out[key] = val;
    }
    return out;
  });
}

// ── MAIN PIPELINE ────────────────────────────────────────────────
function runImport(rows, sourceLabel = 'api/json', extraMappings = {}) {
  if (!rows.length) return { rows: [], flags: [], report: { total: 0 } };

  const columns = Object.keys(rows[0]);
  const { mapping, flags: unmappedFlags } = autoMapColumns(columns, extraMappings);

  // Map → explode multi-items → normalize
  const mapped   = applyMapping(rows, mapping);
  const exploded = mapped.flatMap(parseMultiItemRow);
  const normalized = exploded.map((r, i) => normalizeRow(r, sourceLabel, i));

  const clean   = normalized.filter(r => !r._flag);
  const flagged = normalized.filter(r =>  r._flag);

  return {
    rows: normalized,
    flags: flagged,
    report: {
      source          : sourceLabel,
      total_rows      : normalized.length,
      clean_rows      : clean.length,
      flagged_rows    : flagged.length,
      unmapped_fields : unmappedFlags.map(f => f.field),
      columns_mapped  : mapping,
    },
  };
}

// ── VERCEL HANDLER ───────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { rows, source = 'upload', extra_mappings = {} } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: '`rows` must be a non-empty array of objects.' });
    }

    const result = runImport(rows, source, extra_mappings);
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
