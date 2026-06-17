/**
 * Intelligent Import Mapper
 * Hybrid AI approach: OpenAI (when configured) + local value profiling + rule engine.
 * Resolves mapping conflicts and handles arbitrary Excel/CSV column names.
 */

import {
  FIELD_LABELS,
  FIELD_ENTITIES,
  COLUMN_ALIASES,
  detectImportTableType,
  inferColumnMappings,
  coalesceImportValue,
  allowedFieldsForTable,
  isMonetaryHeader,
} from './dataImportEngine.js';
import { blockDateToIdMapping } from './columnTypeDetection.js';
import { CONFIDENCE_AUTO_ACCEPT, CONFIDENCE_REVIEW_MIN } from './mappingValidation.js';
import { suggestFieldMapping } from './aiMappingService.js';
import { callOpenAIForMapping } from './aiMappingAssistant.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeHeader = (header) => String(header || '').trim().toLowerCase().replace(/[-_\s]+/g, ' ');

const sampleValues = (rows, column, limit = 25) => rows
  .slice(0, 50)
  .map(row => row?.[column])
  .filter(value => value !== null && value !== undefined && String(value).trim() !== '')
  .slice(0, limit);

const valueRatio = (values, predicate) => {
  if (!values.length) return 0;
  return values.filter(predicate).length / values.length;
};

const VALUE_PROFILES = {
  customerId: (values) => valueRatio(values, v => /^(CUST|CUS|CLI|USER)[-_]?\d+/i.test(String(v).trim()) || /^[A-Z]{2,5}\d{3,}$/i.test(String(v).trim())),
  orderId: (values) => valueRatio(values, v => /^(ORD|ORDER|INV|TXN)[-_]?\d+/i.test(String(v).trim())),
  productSku: (values) => valueRatio(values, v => /^SKU[-_]?\d+/i.test(String(v).trim()) || (/[A-Z]{2,}/i.test(String(v)) && /\d/.test(String(v)) && String(v).length <= 24)),
  customerEmail: (values) => valueRatio(values, v => EMAIL_RE.test(String(v).trim())),
  customerPhone: (values) => valueRatio(values, v => /^\+?[\d\s\-()]{7,15}$/.test(String(v).trim())),
  customerAge: (values) => valueRatio(values, v => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 && n < 120;
  }),
  customerGender: (values) => valueRatio(values, v => /^(m|f|male|female|other|non-binary|nb)$/i.test(String(v).trim())),
  orderDate: (values) => valueRatio(values, v => /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(String(v).trim())),
  orderTotal: (values) => valueRatio(values, v => {
    const n = Number(String(v).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) && n >= 0;
  }),
  productPrice: (values) => valueRatio(values, v => {
    const n = Number(String(v).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) && n > 0;
  }),
  productStock: (values) => valueRatio(values, v => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 && n < 100000;
  }),
  quantity: (values) => valueRatio(values, v => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 && n < 10000;
  }),
};

const HEADER_HINTS = {
  customerId: ['customer id', 'cust id', 'client id', 'buyer id', 'user id'],
  customerName: ['full name', 'customer name', 'name', 'buyer name', 'client name'],
  customerEmail: ['email', 'email address', 'e-mail', 'customer email'],
  customerPhone: ['mobile', 'mobile no', 'phone', 'contact number', 'telephone'],
  customerCity: ['city', 'location', 'town'],
  customerState: ['state', 'province', 'region'],
  customerAge: ['age', 'customer age'],
  customerGender: ['gender', 'sex', 'customer gender'],
  orderId: ['order number', 'order id', 'order no', 'invoice number', 'transaction id'],
  orderDate: ['order dt', 'order date', 'purchase date', 'transaction date'],
  orderTotal: ['net amount', 'order total', 'total amount', 'grand total', 'amount'],
  orderStatus: ['order status', 'fulfillment status', 'delivery status'],
  productSku: ['sku code', 'sku', 'item code', 'product code'],
  productName: ['product name', 'item name', 'title'],
  productCategory: ['category', 'department', 'segment'],
  productPrice: ['selling price', 'unit price', 'retail price', 'price', 'mrp'],
  productStock: ['stock qty', 'stock quantity', 'inventory', 'on hand'],
  quantity: ['qty', 'quantity', 'units'],
  orderItems: ['order items', 'items breakdown', 'line items', 'order items breakdown'],
  supplierName: ['supplier name', 'vendor name', 'supplier'],
  revenue: ['lifetime value', 'ltv', 'gross amount'],
};

const scoreHeaderHint = (header, field) => {
  const normalized = normalizeHeader(header);
  const hints = HEADER_HINTS[field] || [];
  if (hints.includes(normalized)) return 99;
  if (hints.some(hint => normalized.includes(hint) || hint.includes(normalized))) return 92;
  return 0;
};

const scoreValueProfile = (values, field) => {
  const detector = VALUE_PROFILES[field];
  if (!detector) return 0;
  const ratio = detector(values);
  if (ratio >= 0.8) return 96;
  if (ratio >= 0.6) return 88;
  if (ratio >= 0.4) return 72;
  return 0;
};

const toMapping = ({ sourceColumn, suggestedField, confidence, reasoning = '' }) => ({
  sourceColumn,
  suggestedField: suggestedField || '',
  suggestedLabel: suggestedField ? (FIELD_LABELS[suggestedField] || suggestedField) : 'Unmapped',
  entity: suggestedField ? (FIELD_ENTITIES[suggestedField] || 'Unmapped') : 'Unmapped',
  confidence: Math.round(confidence || 0),
  reasoning,
});

/**
 * Ensure each source column and target field is used at most once (highest confidence wins).
 */
export const resolveMappingConflicts = (mappings = []) => {
  const ranked = [...mappings]
    .filter(item => item.sourceColumn)
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

  const usedSources = new Set();
  const usedFields = new Set();
  const resolved = [];

  ranked.forEach((item) => {
    if (usedSources.has(item.sourceColumn)) return;
    if (item.suggestedField && usedFields.has(item.suggestedField)) return;
    usedSources.add(item.sourceColumn);
    if (item.suggestedField) usedFields.add(item.suggestedField);
    resolved.push(item);
  });

  const allSources = new Set(mappings.map(item => item.sourceColumn));
  allSources.forEach((sourceColumn) => {
    if (!resolved.some(item => item.sourceColumn === sourceColumn)) {
      const original = mappings.find(item => item.sourceColumn === sourceColumn);
      resolved.push(toMapping({
        sourceColumn,
        suggestedField: '',
        confidence: original?.confidence || 0,
        reasoning: original?.reasoning || 'No unique target field available',
      }));
    }
  });

  return resolved.sort((a, b) => a.sourceColumn.localeCompare(b.sourceColumn));
};

const scoreFieldCandidates = (header, values, tableType, datasetName = '') => {
  const candidates = new Map();
  const allowed = allowedFieldsForTable(tableType);
  const sheetName = normalizeHeader(datasetName);

  const consider = (field, confidence) => {
    if (!field || confidence <= 0) return;
    if (tableType && tableType !== 'unknown' && allowed.size && !allowed.has(field)) return;
    let adjusted = confidence;
    if (/order|transaction|invoice|purchase/.test(sheetName)) {
      if (['orderId', 'orderDate', 'orderTotal', 'orderStatus', 'customerId'].includes(field)) adjusted += 8;
      if (field === 'productSku' && normalizeHeader(header).includes('cust')) adjusted = 0;
    }
    if (/customer|profiling|client|buyer/.test(sheetName)) {
      if (field.startsWith('customer')) adjusted += 8;
      if (field.startsWith('order') || field === 'productSku') adjusted = Math.min(adjusted, 40);
    }
    if (/product|catalog|sku|item/.test(sheetName) && field.startsWith('product')) adjusted += 8;
    const current = candidates.get(field) || 0;
    adjusted = blockDateToIdMapping(header, values, field, adjusted);
    if (adjusted > current) candidates.set(field, adjusted);
  };

  Object.keys(FIELD_LABELS).forEach((field) => {
    if (['productName', 'productId', 'productSku'].includes(field) && isMonetaryHeader(header)) {
      return;
    }
    const aliases = COLUMN_ALIASES[field] || [];
    const normalized = normalizeHeader(header);
    if (aliases.some(alias => normalizeHeader(alias) === normalized)) {
      consider(field, 99);
    }
    consider(field, scoreHeaderHint(header, field));
    consider(field, scoreValueProfile(values, field));
    const ai = suggestFieldMapping(header);
    if (ai?.field === field) consider(field, ai.confidence);
  });

  if (normalizeHeader(header) === 'status') {
    if (['orders', 'mixed_commerce'].includes(tableType)) consider('orderStatus', 99);
    if (tableType === 'customers') consider('customerStatus', 99);
    if (tableType === 'products') consider('productStatus', 99);
  }

  if (normalizeHeader(header) === 'gross amount') consider('revenue', 90);
  if (normalizeHeader(header) === 'net amount') consider('orderTotal', 96);
  if (normalizeHeader(header) === 'discount amt' || normalizeHeader(header) === 'discount amount') {
    consider('revenue', 55);
  }
  if (normalizeHeader(header) === 'gender' || normalizeHeader(header) === 'sex') {
    consider('customerGender', 99);
    consider('customerStatus', 0);
    consider('orderTotal', 0);
  }
  if (['quantity', 'qty', 'order quantity'].includes(normalizeHeader(header))) {
    candidates.set('quantity', 99);
    candidates.delete('orderTotal');
    candidates.delete('revenue');
    candidates.delete('productSales');
  }

  return [...candidates.entries()]
    .map(([field, confidence]) => ({ field, confidence, reasoning: 'Combined scoring' }))
    .sort((a, b) => b.confidence - a.confidence);
};

export const inferMappingsWithLocalAI = (rows = [], datasetName = '', tableTypeOverride = '') => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const detection = detectImportTableType(safeRows, [], datasetName, tableTypeOverride);
  const tableType = tableTypeOverride && tableTypeOverride !== 'unknown'
    ? tableTypeOverride
    : detection.tableType;
  const ruleMappings = inferColumnMappings(safeRows, datasetName, tableType);
  const headers = Array.from(new Set(
    safeRows.flatMap(row => (row && typeof row === 'object') ? Object.keys(row) : [])
  ));

  const candidates = headers.map((header) => {
    const values = sampleValues(safeRows, header);
    const scored = scoreFieldCandidates(header, values, tableType, datasetName);
    const rule = ruleMappings.find(item => item.sourceColumn === header);
    const best = scored[0];
    const ruleConfidence = rule?.confidence || 0;

    if (best && best.confidence >= ruleConfidence) {
      const field = best.confidence >= CONFIDENCE_REVIEW_MIN ? best.field : '';
      return toMapping({
        sourceColumn: header,
        suggestedField: field,
        confidence: best.confidence,
        reasoning: best.confidence >= CONFIDENCE_AUTO_ACCEPT ? 'Alias Match' : `Local AI: ${best.reasoning}`,
      });
    }

    return toMapping({
      sourceColumn: header,
      suggestedField: rule?.suggestedField || '',
      confidence: ruleConfidence,
      reasoning: 'Rule engine',
    });
  });

  return resolveMappingConflicts(candidates);
};

export const inferWorkbookMappings = (datasets = {}, sheetTableTypes = {}) => (
  Object.fromEntries(
    Object.entries(datasets).map(([sheetName, rows]) => [
      sheetName,
      inferMappingsWithLocalAI(rows, sheetName, sheetTableTypes[sheetName]),
    ])
  )
);

export const inferMappingsHybrid = async (rows = [], datasetName = '', tableTypeOverride = '', options = {}) => {
  const { useOpenAI = true } = options;
  const safeRows = Array.isArray(rows) ? rows : [];
  const headers = Array.from(new Set(
    safeRows.flatMap(row => (row && typeof row === 'object') ? Object.keys(row) : [])
  ));

  if (useOpenAI && headers.length) {
    const sampleValuesByColumn = Object.fromEntries(
      headers.map(header => [header, sampleValues(safeRows, header, 3).map(v => String(v))])
    );
    const aiResult = await callOpenAIForMapping(headers, datasetName, sampleValuesByColumn);
    if (aiResult.success && aiResult.mappings?.length) {
      const aiMappings = aiResult.mappings.map(item => toMapping({
        sourceColumn: item.sourceColumn,
        suggestedField: item.suggestedField || '',
        confidence: item.confidence || 0,
        reasoning: item.reasoning || 'OpenAI',
      }));
      const localMappings = inferMappingsWithLocalAI(safeRows, datasetName, tableTypeOverride);
      const merged = headers.map((header) => {
        const ai = aiMappings.find(item => item.sourceColumn === header);
        const local = localMappings.find(item => item.sourceColumn === header);
        if (ai?.suggestedField && (ai.confidence || 0) >= (local?.confidence || 0)) return ai;
        return local || toMapping({ sourceColumn: header, suggestedField: '', confidence: 0 });
      });
      return {
        mappings: resolveMappingConflicts(merged),
        provider: 'openai+local',
        notes: aiResult.notes || '',
      };
    }
  }

  return {
    mappings: inferMappingsWithLocalAI(safeRows, datasetName, tableTypeOverride),
    provider: 'local-ai',
    notes: '',
  };
};

export const inferWorkbookMappingsHybrid = async (datasets = {}, sheetTableTypes = {}, options = {}) => {
  const entries = await Promise.all(
    Object.entries(datasets).map(async ([sheetName, rows]) => {
      const result = await inferMappingsHybrid(rows, sheetName, sheetTableTypes[sheetName], options);
      return [sheetName, result];
    })
  );
  return {
    sheetMappings: Object.fromEntries(entries.map(([name, result]) => [name, result.mappings])),
    meta: Object.fromEntries(entries.map(([name, result]) => [name, { provider: result.provider, notes: result.notes }])),
  };
};

export const buildRawWorkbookProfile = (datasets = {}) => {
  const sheets = Object.entries(datasets).map(([name, rows]) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const columns = Array.from(new Set(
      safeRows.flatMap(row => (row && typeof row === 'object') ? Object.keys(row) : [])
    ));
    return {
      name,
      rowCount: safeRows.length,
      columnCount: columns.length,
      columns,
      rows: safeRows.map(row => {
        const normalized = {};
        columns.forEach((column) => {
          normalized[column] = coalesceImportValue(row?.[column]);
        });
        return normalized;
      }),
      columnProfiles: columns.map((column) => {
        const values = sampleValues(safeRows, column, 5);
        const emptyCount = safeRows.filter(row => {
          const v = row?.[column];
          return v === null || v === undefined || String(v).trim() === '';
        }).length;
        return {
          column,
          sampleValues: values.map(v => coalesceImportValue(v)),
          emptyCount,
          fillRate: safeRows.length ? Math.round(((safeRows.length - emptyCount) / safeRows.length) * 100) : 0,
        };
      }),
    };
  });

  return {
    sheets,
    sheetNames: sheets.map(sheet => sheet.name),
    totalRows: sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0),
    totalColumns: sheets.reduce((sum, sheet) => sum + sheet.columnCount, 0),
  };
};

export const parseSpreadsheetBuffer = (buffer, fileName = '') => {
  // Dynamic import avoided — caller passes rows or uses XLSX in component
  return { fileName };
};
