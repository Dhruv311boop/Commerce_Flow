/**
 * Production Import Engine
 * Orchestrates AI mapping, normalization, relationship resolution, dedup,
 * dynamic schema, batch processing, and detailed import reports.
 * Never fails imports due to missing mappings — warnings only.
 */

import {
  EMPTY_IMPORT_VALUE,
  analyzeBusinessData,
  buildImportColumnReport,
  detectImportTableType,
  generateImportAnalytics,
  normalizeBusinessData,
  normalizeMultiSheetData,
  validateImportRows,
  validateMultiSheetMappingConsistency,
} from './dataImportEngine.js';
import {
  inferMappingsHybrid,
  inferMappingsWithLocalAI,
  inferWorkbookMappings,
  inferWorkbookMappingsHybrid,
  resolveMappingConflicts,
} from './intelligentImportMapper.js';
import {
  countUploadedProductRows,
  createImportAuditLog,
  filterFileSourcedProducts,
} from './importProductGuard.js';
import {
  validateWorkbookMappingsPreImport,
  validateMappingsPreImport,
  hasMappingApprovalBlockers,
} from './mappingValidation.js';
import { buildDerivedMetricsReport } from './salesDerivation.js';

export const PRODUCTION_BATCH_SIZE = 1000;
export const PRODUCTION_SAVE_BATCH_SIZE = 500;

export const FIELD_TO_BACKEND = {
  productId: 'product_id',
  productName: 'product_name',
  productSku: 'sku',
  productCategory: 'category',
  productPrice: 'price',
  productStock: 'stock',
  productStatus: 'status',
  productSales: 'sales_count',
  reorderLevel: 'reorder_level',
  customerId: 'customer_id',
  customerName: 'customer_name',
  customerEmail: 'customer_email',
  customerPhone: 'customer_phone',
  customerCity: 'customer_city',
  customerState: 'customer_state',
  customerAge: 'age',
  customerGender: 'gender',
  customerStatus: 'status',
  orderId: 'order_id',
  orderDate: 'order_date',
  orderTotal: 'amount',
  orderItems: 'order_items',
  orderStatus: 'status',
  quantity: 'quantity',
  supplierName: 'supplier_name',
  revenue: 'revenue',
};

export const toBackendField = (camelField) => FIELD_TO_BACKEND[camelField] || camelField;

export const BACKEND_TO_FIELD = Object.fromEntries(
  Object.entries(FIELD_TO_BACKEND).map(([camel, snake]) => [snake, camel])
);

export const serverMappingsToEngine = (mappings = []) => mappings.map(item => ({
  sourceColumn: item.source_column,
  suggestedField: BACKEND_TO_FIELD[item.target_field] || item.target_field || '',
  suggestedLabel: item.display_name || item.target_field,
  entity: item.entity,
  confidence: Number(item.confidence || 0),
  dataset: item.dataset,
}));

export const toServerMapping = (item, dataset = '') => ({
  dataset: item.dataset || dataset,
  source_column: item.source_column || item.sourceColumn,
  target_field: toBackendField(item.target_field || item.suggestedField || ''),
  display_name: item.display_name || item.suggestedLabel || item.target_field || item.suggestedField,
  entity: item.entity || 'Unmapped',
  confidence: Number(item.confidence || 0),
});

export const toEngineMappingFromServer = (item) => ({
  sourceColumn: item.source_column,
  suggestedField: Object.entries(FIELD_TO_BACKEND).find(([, v]) => v === item.target_field)?.[0] || item.target_field,
  suggestedLabel: item.display_name,
  entity: item.entity,
  confidence: item.confidence,
});

const downgradeIssue = (issue) => ({
  ...issue,
  severity: issue.severity === 'error' ? 'warning' : issue.severity,
});

export const downgradeIssuesToWarnings = (issues = []) => issues.map(downgradeIssue);

export const hasProductionBlockingIssues = (issues = []) => {
  const list = Array.isArray(issues) ? issues : (issues?.warnings || issues?.issues || []);
  return list.some(issue =>
    issue.severity === 'error' &&
    /empty dataset|no records|cannot be imported/i.test(String(issue.message || ''))
  );
};

const chunkArray = (items, size = PRODUCTION_BATCH_SIZE) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

const collectNewFields = (entities = {}) => {
  const registry = [];
  ['products', 'customers', 'orders', 'inventory'].forEach((entityType) => {
    (entities[entityType] || []).forEach((record) => {
      const extras = record.extraFields || {};
      Object.entries(extras).forEach(([key, sampleValue]) => {
        if (!registry.some(item => item.entity === entityType && item.fieldKey === key)) {
          registry.push({
            entity: entityType,
            fieldKey: key,
            sampleValue,
            source: 'auto_detected',
          });
        }
      });
    });
  });
  return registry;
};

const deduplicateByKey = (records = [], keyFn, strategy = 'merge') => {
  const map = new Map();
  records.forEach((record) => {
    const key = keyFn(record);
    if (!key || key === EMPTY_IMPORT_VALUE) return;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, record);
      return;
    }
    if (strategy === 'keep_first') return;
    map.set(key, { ...existing, ...record, extraFields: { ...(existing.extraFields || {}), ...(record.extraFields || {}) } });
  });
  return Array.from(map.values());
};

export const deduplicateImportEntities = ({ products = [], customers = [], orders = [], inventory = [] } = {}) => ({
  products: deduplicateByKey(products, p => String(p.sku || p.id || '').trim().toUpperCase() || String(p.name || '').toLowerCase()),
  customers: deduplicateByKey(customers, c => String(c.id || c.email || '').trim().toLowerCase() || String(c.name || '').toLowerCase()),
  orders: deduplicateByKey(orders, o => String(o.id || '').trim()),
  inventory: deduplicateByKey(inventory, i => String(i.sku || i.productId || i.product || '').trim().toUpperCase()),
});

export const buildProductionImportReport = ({
  importId = '',
  source = 'csv',
  datasets = null,
  sheetMappings = {},
  normalized = {},
  warnings = [],
  mappingProvider = 'local-ai',
  startedAt = Date.now(),
  finishedAt = Date.now(),
  mappingAuditLog = null,
  validationReport = null,
  derivedMetricsReport = null,
} = {}) => {
  const columnReports = datasets
    ? buildImportColumnReport(datasets, sheetMappings)
    : [];

  const allMappings = Object.values(sheetMappings).flat().length
    ? Object.values(sheetMappings).flat()
    : (normalized.analysis?.mappings || []);

  const mappingDecisions = (Array.isArray(allMappings) ? allMappings : []).map(item => ({
    sourceColumn: item.source_column || item.sourceColumn,
    targetField: item.target_field || item.suggestedField,
    label: item.display_name || item.suggestedLabel,
    confidence: item.confidence || 0,
    dataset: item.dataset,
  }));

  const newFields = collectNewFields(normalized);
  const productReport = normalized.analysis?.productMappingReport || normalized.productMappingReport || {
    ordersImported: normalized.orders?.length || 0,
    totalOrderSkus: 0,
    matchedSkus: 0,
    unmatchedSkus: 0,
    unmatchedItems: [],
  };

  const productImportStats = normalized.analysis?.productImportStats || normalized.productImportStats || null;
  const resolvedAuditLog = mappingAuditLog || normalized.mappingAuditLog || [];
  const resolvedValidationReport = validationReport || normalized.validationReport || [];
  const resolvedDerivedMetrics = derivedMetricsReport || normalized.derivedMetricsReport || null;

  const successes = {
    products: productImportStats?.importedProductCount ?? normalized.products?.length ?? 0,
    customers: normalized.customers?.length || 0,
    orders: normalized.orders?.length || 0,
    inventory: normalized.inventory?.length || 0,
    totalRows: datasets
      ? Object.values(datasets).reduce((sum, rows) => sum + (rows?.length || 0), 0)
      : (normalized.analysis?.rowCount || 0),
  };

  const failures = warnings.filter(w => /unmatched|missing product|could not resolve/i.test(String(w.message || '')));

  return {
    importId,
    source,
    mappingProvider,
    durationMs: finishedAt - startedAt,
    successes,
    failures: failures.length,
    warnings: downgradeIssuesToWarnings(warnings),
    mappingDecisions,
    columnReports,
    newFieldsCreated: newFields,
    relationshipResolution: productReport,
    productImportStats,
    productAuditLog: normalized.analysis?.productAuditLog || null,
    mappingAuditLog: resolvedAuditLog,
    validationReport: resolvedValidationReport,
    derivedMetricsReport: resolvedDerivedMetrics,
    confidence: mappingDecisions.length
      ? Math.round(mappingDecisions.reduce((sum, item) => sum + (item.confidence || 0), 0) / mappingDecisions.length)
      : 0,
    summary: `Imported ${successes.products} products, ${successes.customers} customers, ${successes.orders} orders with ${warnings.length} warning(s).`,
    importPreview: {
      productsToCreate: successes.products,
      customersToCreate: successes.customers,
      ordersToCreate: successes.orders,
      newFields: collectNewFields(normalized).length,
      warnings: warnings.length,
      errors: resolvedValidationReport.filter(item => item.validationStatus === 'rejected').length,
    },
  };
};

export const normalizeInBatches = (rows, source, mappings, tableTypeOverride = '', onProgress, existingProducts = [], existingCustomers = []) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  if (safeRows.length <= PRODUCTION_BATCH_SIZE) {
    return normalizeBusinessData(safeRows, source, mappings, tableTypeOverride, existingProducts, existingCustomers);
  }

  const chunks = chunkArray(safeRows, PRODUCTION_BATCH_SIZE);
  const merged = { products: [], customers: [], orders: [], inventory: [], analysis: null };
  chunks.forEach((chunk, index) => {
    const partial = normalizeBusinessData(chunk, source, mappings, tableTypeOverride, existingProducts, existingCustomers);
    merged.products.push(...partial.products);
    merged.customers.push(...partial.customers);
    merged.orders.push(...partial.orders);
    merged.inventory.push(...partial.inventory);
    merged.analysis = partial.analysis;
    onProgress?.({ processed: Math.min((index + 1) * PRODUCTION_BATCH_SIZE, safeRows.length), total: safeRows.length });
  });

  const deduped = deduplicateImportEntities(merged);
  return { ...deduped, analysis: merged.analysis };
};

export async function runProductionImport({
  datasets = null,
  rows = null,
  source = 'csv',
  manualMappings = null,
  sheetMappings = null,
  sheetTableTypes = {},
  useOpenAI = false,
  onProgress = null,
  existingProducts = [],
  existingCustomers = [],
} = {}) {
  const startedAt = Date.now();
  let resolvedSheetMappings = sheetMappings;
  let mappingProvider = 'local-ai';

  if (datasets && !resolvedSheetMappings) {
    if (useOpenAI) {
      const hybrid = await inferWorkbookMappingsHybrid(datasets, sheetTableTypes, { useOpenAI: true });
      resolvedSheetMappings = hybrid.sheetMappings;
      mappingProvider = hybrid.meta?.[Object.keys(hybrid.meta)[0]]?.provider || 'openai+local';
    } else {
      resolvedSheetMappings = inferWorkbookMappings(datasets, sheetTableTypes);
    }
  }

  let engineMappings = manualMappings;
  if (!engineMappings && rows) {
    if (useOpenAI) {
      const hybrid = await inferMappingsHybrid(rows, 'Imported data', sheetTableTypes['Imported data'] || '', { useOpenAI: true });
      engineMappings = resolveMappingConflicts(hybrid.mappings);
      mappingProvider = hybrid.provider;
    } else {
      engineMappings = inferMappingsWithLocalAI(rows, 'Imported data', sheetTableTypes['Imported data'] || '');
    }
  }

  let normalized;
  let warnings = [];
  let mappingValidation = null;

  if (datasets) {
    const mappingsBySheet = resolvedSheetMappings || inferWorkbookMappings(datasets, sheetTableTypes);
    mappingValidation = validateWorkbookMappingsPreImport(datasets, mappingsBySheet);
    warnings = downgradeIssuesToWarnings(
      validateMultiSheetMappingConsistency(datasets, mappingsBySheet, sheetTableTypes)
    );
    if (mappingValidation.warnings.length) {
      warnings.push(...mappingValidation.warnings.map(w => ({
        severity: 'warning',
        message: `${w.uploadedColumn}: ${w.validationMessage || 'Mapping requires review'}`,
        column: w.uploadedColumn,
      })));
    }

    Object.entries(datasets).forEach(([sheetName, sheetRows]) => {
      const sheetMap = mappingsBySheet[sheetName] || [];
      const columnMap = sheetMap.reduce((map, item) => {
        if (item.suggestedField) map[item.suggestedField] = item.sourceColumn;
        return map;
      }, {});
      const detection = detectImportTableType(sheetRows, sheetMap, sheetName, sheetTableTypes[sheetName]);
      warnings.push(...downgradeIssuesToWarnings(
        validateImportRows(sheetRows, columnMap, detection.tableType)
      ));
    });

    normalized = normalizeMultiSheetData(datasets, mappingsBySheet, source, sheetTableTypes, existingProducts, existingCustomers);
    resolvedSheetMappings = mappingsBySheet;
  } else {
    const safeRows = Array.isArray(rows) ? rows : [];
    const analysis = analyzeBusinessData(safeRows, source, engineMappings);
    mappingValidation = validateMappingsPreImport(engineMappings || [], safeRows, 'Imported Data');
    const mappingWarnings = (mappingValidation.warnings || []).map(w => ({
      severity: 'warning',
      message: `${w.uploadedColumn}: ${w.validationMessage || 'Mapping requires review'}`,
      column: w.uploadedColumn,
    }));
    warnings = downgradeIssuesToWarnings([
      ...(analysis.warnings || []),
      ...validateImportRows(safeRows, analysis.columnMap, analysis.tableDetection.tableType),
      ...mappingWarnings,
    ]);
    normalized = normalizeInBatches(safeRows, source, engineMappings, sheetTableTypes['Imported data'] || '', onProgress, existingProducts, existingCustomers);
    resolvedSheetMappings = { 'Imported Data': engineMappings };
  }

  const deduped = deduplicateImportEntities(normalized);
  const fileProducts = filterFileSourcedProducts(deduped.products);
  const uploadedProductCount = datasets
    ? countUploadedProductRows(datasets, resolvedSheetMappings, sheetTableTypes)
    : (normalized.analysis?.tableDetection?.tableType === 'products' ? (rows?.length || 0) : 0);

  const productImportStats = {
    ...(normalized.analysis?.productImportStats || {}),
    uploadedProductCount,
    importedProductCount: fileProducts.length,
    duplicateCount: normalized.analysis?.productImportStats?.duplicateCount
      ?? normalized.analysis?.productAuditLog?.duplicatesSkipped?.length
      ?? 0,
    rejectedCount: normalized.analysis?.productImportStats?.rejectedCount
      ?? normalized.analysis?.productAuditLog?.productsRejected?.length
      ?? 0,
    extraBlockedCount: Math.max(0, deduped.products.length - fileProducts.length),
    auditLog: normalized.analysis?.productAuditLog || createImportAuditLog(),
  };

  const derivedMetricsReport = buildDerivedMetricsReport({
    products: fileProducts,
    orders: deduped.orders,
  });

  const importResult = {
    ...deduped,
    products: fileProducts,
    productImportStats,
    mappingAuditLog: mappingValidation?.auditLog || [],
    validationReport: mappingValidation?.validationReport || [],
    derivedMetricsReport,
    mappingRequiresApproval: mappingValidation?.requiresApproval || false,
    mappingApproved: !hasMappingApprovalBlockers(mappingValidation || {}),
  };

  const analytics = {
    ...generateImportAnalytics(importResult),
    productMappingReport: normalized.analysis?.productMappingReport,
    productImportStats,
  };

  const report = buildProductionImportReport({
    source,
    datasets,
    sheetMappings: resolvedSheetMappings,
    normalized: { ...importResult, analysis: normalized.analysis },
    warnings,
    mappingProvider,
    startedAt,
    finishedAt: Date.now(),
    mappingAuditLog: importResult.mappingAuditLog,
    validationReport: importResult.validationReport,
    derivedMetricsReport: importResult.derivedMetricsReport,
  });

  return {
    success: true,
    ...importResult,
    analytics,
    report,
    warnings,
    sheetMappings: resolvedSheetMappings,
    mappingProvider,
  };
}

export const toBackendRecords = ({ products = [], customers = [], orders = [], inventory = [] }, importId = '') => {
  const none = (v) => (v === null || v === undefined || String(v).trim() === '' ? EMPTY_IMPORT_VALUE : v);

  return {
    products: products.map(p => ({
      id: none(p.id || p.sku),
      name: none(p.name || p.product_name),
      sku: none(p.sku),
      category: none(p.category),
      price: Number(p.price || 0),
      stock: Number(p.stock || 0),
      extra_fields: JSON.stringify({ ...(p.extraFields || {}), salesCount: p.salesCount || 0, revenue: p.revenue || 0 }),
      source_import_id: importId,
    })),
    customers: customers.map(c => ({
      id: none(c.id || c.email),
      name: none(c.name),
      email: none(c.email),
      phone: none(c.phone),
      city: none(c.city),
      state: none(c.state),
      age: none(c.age),
      acquisition_date: c.regDate || c.acquisition_date || null,
      extra_fields: JSON.stringify({ ...(c.extraFields || {}), age: c.age, phone: c.phone, ltv: c.ltv || 0, totalPurchases: c.totalPurchases || 0, cohort: c.cohort, averageOrderValue: c.averageOrderValue || 0 }),
      source_import_id: importId,
    })),
    orders: orders.map(o => ({
      id: none(o.id),
      customer_id: o.customerId || null,
      customer: none(o.customer),
      product: o.product && o.product !== EMPTY_IMPORT_VALUE ? none(o.product) : '',
      quantity: Number(o.quantity || 1),
      amount: Number(o.total || o.amount || 0),
      order_date: o.date || o.order_date || null,
      status: none(o.status),
      extra_fields: JSON.stringify({ ...(o.extraFields || {}), items: o.items || [] }),
      source_import_id: importId,
    })),
    inventory: inventory.map(i => ({
      id: none(i.productId || i.sku || i.product),
      product: none(i.product || i.productName),
      stock: Number(i.stock || i.stockQuantity || 0),
      reorder_level: Number(i.reorderLevel || i.reorder_level || 5),
      extra_fields: JSON.stringify(i.extraFields || {}),
      source_import_id: importId,
    })),
  };
};

export const saveRecordsInBatches = async (Model, records, batchSize = PRODUCTION_SAVE_BATCH_SIZE, updateOnDuplicate = []) => {
  const chunks = chunkArray(records, batchSize);
  for (const chunk of chunks) {
    if (!chunk.length) continue;
    await Model.bulkCreate(chunk, { updateOnDuplicate });
  }
};
