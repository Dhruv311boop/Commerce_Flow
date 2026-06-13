/**
 * Column type detection for import mapping validation and scoring.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-()]{7,20}$/;
const CURRENCY_RE = /[$€£₹¥]|^\s*-?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\s*$/;

export const COLUMN_TYPES = {
  DATE: 'Date',
  ID: 'ID',
  NUMERIC: 'Numeric',
  CURRENCY: 'Currency',
  PHONE: 'Phone',
  EMAIL: 'Email',
  TEXT: 'Text',
};

export const ID_TARGET_FIELDS = new Set([
  'orderId', 'customerId', 'productId', 'invoiceId', 'transactionId',
]);

export const isDateLikeValue = (value) => {
  const text = String(value ?? '').trim();
  if (!text || /^\d+$/.test(text)) return false;
  const hasDateShape = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(text) ||
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(text) ||
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text) ||
    /\d{4}-\d{2}-\d{2}t/i.test(text);
  return hasDateShape && !Number.isNaN(Date.parse(text));
};

export const sampleValuesForColumn = (rows = [], column, limit = 5) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  return safeRows
    .slice(0, 50)
    .map(row => String(row?.[column] ?? '').trim())
    .filter(Boolean)
    .slice(0, limit);
};

const valueRatio = (values, predicate) => {
  if (!values.length) return 0;
  return values.filter(predicate).length / values.length;
};

const headerSuggestsType = (header, type) => {
  const h = String(header || '').trim().toLowerCase().replace(/[-_\s]+/g, ' ');
  const patterns = {
    [COLUMN_TYPES.DATE]: ['date', 'dt', 'timestamp', 'created at', 'purchase date', 'order date', 'ship date'],
    [COLUMN_TYPES.ID]: ['id', 'number', 'no', 'code', 'sku', 'invoice', 'transaction', 'order id', 'customer id', 'product id'],
    [COLUMN_TYPES.CURRENCY]: ['amount', 'price', 'total', 'revenue', 'cost', 'ltv', 'value', 'sales', 'gross', 'net', 'discount'],
    [COLUMN_TYPES.PHONE]: ['phone', 'mobile', 'tel', 'contact number'],
    [COLUMN_TYPES.EMAIL]: ['email', 'e-mail', 'mail'],
    [COLUMN_TYPES.NUMERIC]: ['qty', 'quantity', 'count', 'age', 'stock', 'units'],
  };
  return (patterns[type] || []).some(p => h === p || h.includes(p));
};

/**
 * Detect the most likely column type using header + sample values.
 */
export const detectColumnType = (header, values = []) => {
  const samples = (Array.isArray(values) ? values : [])
    .map(v => String(v ?? '').trim())
    .filter(Boolean)
    .slice(0, 25);

  if (!samples.length) {
    if (headerSuggestsType(header, COLUMN_TYPES.DATE)) return COLUMN_TYPES.DATE;
    if (headerSuggestsType(header, COLUMN_TYPES.EMAIL)) return COLUMN_TYPES.EMAIL;
    if (headerSuggestsType(header, COLUMN_TYPES.PHONE)) return COLUMN_TYPES.PHONE;
    if (headerSuggestsType(header, COLUMN_TYPES.CURRENCY)) return COLUMN_TYPES.CURRENCY;
    if (headerSuggestsType(header, COLUMN_TYPES.ID)) return COLUMN_TYPES.ID;
    return COLUMN_TYPES.TEXT;
  }

  const scores = {
    [COLUMN_TYPES.EMAIL]: valueRatio(samples, v => EMAIL_RE.test(v)) * 100 + (headerSuggestsType(header, COLUMN_TYPES.EMAIL) ? 20 : 0),
    [COLUMN_TYPES.PHONE]: valueRatio(samples, v => PHONE_RE.test(v)) * 100 + (headerSuggestsType(header, COLUMN_TYPES.PHONE) ? 20 : 0),
    [COLUMN_TYPES.DATE]: valueRatio(samples, v => isDateLikeValue(v)) * 100 + (headerSuggestsType(header, COLUMN_TYPES.DATE) ? 25 : 0),
    [COLUMN_TYPES.CURRENCY]: valueRatio(samples, v => {
      const cleaned = v.replace(/[^0-9.-]/g, '');
      const n = Number(cleaned);
      return Number.isFinite(n) && (CURRENCY_RE.test(v) || /\.\d{1,2}$/.test(cleaned));
    }) * 100 + (headerSuggestsType(header, COLUMN_TYPES.CURRENCY) ? 15 : 0),
    [COLUMN_TYPES.ID]: valueRatio(samples, v => /^(ORD|INV|CUST|SKU|TXN|PROD)[-_#]?\w+/i.test(v) || /^[A-Z]{2,6}[-_]?\d{2,}$/i.test(v)) * 100 + (headerSuggestsType(header, COLUMN_TYPES.ID) ? 10 : 0),
    [COLUMN_TYPES.NUMERIC]: valueRatio(samples, v => /^\d+$/.test(v) && Number(v) >= 0) * 100 + (headerSuggestsType(header, COLUMN_TYPES.NUMERIC) ? 10 : 0),
    [COLUMN_TYPES.TEXT]: valueRatio(samples, v => /[a-z]/i.test(v) && v.length > 1) * 60 + 10,
  };

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestType, bestScore] = ranked[0];
  if (bestScore < 25) return COLUMN_TYPES.TEXT;
  return bestType;
};

export const isDateColumn = (header, values) => detectColumnType(header, values) === COLUMN_TYPES.DATE;

export const blockDateToIdMapping = (header, values, targetField, confidence) => {
  if (!ID_TARGET_FIELDS.has(targetField)) return confidence;
  if (isDateColumn(header, values)) return 0;
  return confidence;
};
