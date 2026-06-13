/**
 * Pre-import mapping validation, confidence framework, and audit logs.
 */

import {
  FIELD_LABELS,
  FIELD_ENTITIES,
  COLUMN_ALIASES,
} from './dataImportEngine.js';
import {
  detectColumnType,
  sampleValuesForColumn,
  COLUMN_TYPES,
  ID_TARGET_FIELDS,
  blockDateToIdMapping,
} from './columnTypeDetection.js';

export const CONFIDENCE_AUTO_ACCEPT = 90;
export const CONFIDENCE_REVIEW_MIN = 80;

const CURRENCY_FIELDS = new Set(['productPrice', 'orderTotal', 'revenue']);
const QUANTITY_FIELDS = new Set(['quantity', 'productStock', 'productSales', 'inventoryStockQuantity']);
const PHONE_FIELDS = new Set(['customerPhone']);
const EMAIL_FIELDS = new Set(['customerEmail']);
const NAME_FIELDS = new Set(['customerName', 'productName']);

const mappingSourceLabel = (mapping) => {
  const reasoning = String(mapping.reasoning || mapping.mappingSource || '').toLowerCase();
  if (reasoning.includes('alias')) return 'Alias Match';
  if (reasoning.includes('local ai')) return 'Value Profile';
  if (reasoning.includes('rule')) return 'Rule Engine';
  if (reasoning.includes('fuzzy')) return 'Fuzzy Match';
  return mapping.mappingSource || 'Combined Scoring';
};

const validateMappingPair = (detectedType, targetField, sourceColumn = '') => {
  const normSource = String(sourceColumn).toLowerCase();

  if (targetField === 'productName' && (normSource.includes('customer') || normSource.includes('buyer') || normSource.includes('client'))) {
    return { status: 'rejected', message: 'Customer name column cannot map to product name' };
  }
  if (targetField === 'customerName' && (normSource.includes('product') || normSource.includes('item') || normSource.includes('sku'))) {
    return { status: 'rejected', message: 'Product name column cannot map to customer name' };
  }

  if (detectedType === COLUMN_TYPES.DATE && ID_TARGET_FIELDS.has(targetField)) {
    return { status: 'rejected', message: 'Date columns cannot map to ID fields' };
  }
  if (detectedType === COLUMN_TYPES.PHONE && CURRENCY_FIELDS.has(targetField)) {
    return { status: 'rejected', message: 'Phone columns cannot map to currency fields' };
  }
  if (detectedType === COLUMN_TYPES.PHONE && QUANTITY_FIELDS.has(targetField)) {
    return { status: 'rejected', message: 'Phone columns cannot map to numeric quantity fields' };
  }
  if (detectedType === COLUMN_TYPES.CURRENCY && QUANTITY_FIELDS.has(targetField)) {
    return { status: 'review_required', message: 'Currency column mapped to quantity — verify intent' };
  }
  if (detectedType === COLUMN_TYPES.EMAIL && NAME_FIELDS.has(targetField)) {
    return { status: 'rejected', message: 'Email columns cannot map to name fields' };
  }
  const entity = FIELD_ENTITIES[targetField];
  if (entity === 'Products' && targetField.startsWith('customer')) {
    return { status: 'rejected', message: 'Customer field mapped on product entity' };
  }
  if (entity === 'Customers' && targetField.startsWith('product') && targetField !== 'productSales') {
    return { status: 'rejected', message: 'Product field mapped on customer entity' };
  }
  return { status: 'approved', message: '' };
};

export const classifyMappingConfidence = (confidence = 0) => {
  if (confidence >= CONFIDENCE_AUTO_ACCEPT) return 'auto_accept';
  if (confidence >= CONFIDENCE_REVIEW_MIN) return 'review_required';
  return 'unmapped';
};

export const applyConfidenceToMapping = (mapping, rows = []) => {
  const confidence = Number(mapping.confidence || 0);
  const tier = classifyMappingConfidence(confidence);
  const values = sampleValuesForColumn(rows, mapping.sourceColumn);
  let targetField = mapping.suggestedField || '';
  let adjustedConfidence = blockDateToIdMapping(mapping.sourceColumn, values, targetField, confidence);

  if (tier === 'unmapped') {
    targetField = '';
  }

  const detectedType = detectColumnType(mapping.sourceColumn, values);
  const validation = targetField
    ? validateMappingPair(detectedType, targetField, mapping.sourceColumn)
    : { status: tier === 'unmapped' ? 'unmapped' : 'review_required', message: 'No mapping selected' };

  if (validation.status === 'rejected') {
    targetField = '';
    adjustedConfidence = 0;
  }

  const alternatives = Object.keys(FIELD_LABELS)
    .filter(field => field !== targetField)
    .map(field => {
      const aliases = COLUMN_ALIASES[field] || [];
      const header = String(mapping.sourceColumn || '').toLowerCase();
      const aliasHit = aliases.some(a => header.includes(a));
      return { field, label: FIELD_LABELS[field], score: aliasHit ? 75 : 0 };
    })
    .filter(a => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    ...mapping,
    suggestedField: targetField,
    suggestedLabel: targetField ? FIELD_LABELS[targetField] : 'Unmapped',
    entity: targetField ? FIELD_ENTITIES[targetField] : 'Unmapped',
    confidence: adjustedConfidence,
    detectedType,
    sampleValues: values,
    confidenceTier: classifyMappingConfidence(adjustedConfidence),
    validationStatus: validation.status,
    validationMessage: validation.message,
    mappingSource: mappingSourceLabel(mapping),
    mappingReason: mapping.reasoning || mappingSourceLabel(mapping),
    alternatives,
  };
};

export const buildMappingAuditLog = (mappings = [], rows = [], dataset = '') => (
  mappings.map(mapping => {
    const audited = applyConfidenceToMapping(mapping, rows);
    return {
      dataset,
      uploadedColumn: mapping.sourceColumn,
      sampleValues: audited.sampleValues,
      detectedType: audited.detectedType,
      selectedMapping: audited.suggestedField,
      selectedLabel: audited.suggestedLabel,
      confidenceScore: audited.confidence,
      confidenceTier: audited.confidenceTier,
      mappingSource: audited.mappingSource,
      mappingReason: audited.mappingReason,
      validationStatus: audited.validationStatus,
      validationMessage: audited.validationMessage,
      alternatives: audited.alternatives,
    };
  })
);

export const validateMappingsPreImport = (mappings = [], rows = [], dataset = '') => {
  const auditLog = buildMappingAuditLog(mappings, rows, dataset);
  const errors = auditLog.filter(item => item.validationStatus === 'rejected');
  const warnings = auditLog.filter(item => item.validationStatus === 'review_required');
  const requiresApproval = errors.length > 0 || warnings.length > 0;

  return {
    auditLog,
    validationReport: auditLog.map(item => ({
      sourceColumn: item.uploadedColumn,
      sampleValues: item.sampleValues,
      detectedType: item.detectedType,
      selectedMapping: item.selectedMapping,
      selectedLabel: item.selectedLabel,
      confidenceScore: item.confidenceScore,
      validationStatus: item.validationStatus,
      errorMessage: item.validationMessage,
      mappingSource: item.mappingSource,
      alternatives: item.alternatives,
    })),
    errors,
    warnings,
    requiresApproval,
    approved: errors.length === 0,
  };
};

export const validateWorkbookMappingsPreImport = (datasets = {}, sheetMappings = {}) => {
  const sheets = Object.entries(datasets).map(([sheetName, rows]) => {
    const mappings = sheetMappings[sheetName] || [];
    return {
      sheetName,
      ...validateMappingsPreImport(mappings, rows, sheetName),
    };
  });

  const auditLog = sheets.flatMap(s => s.auditLog);
  const validationReport = sheets.flatMap(s => s.validationReport.map(r => ({ ...r, dataset: s.sheetName })));
  const errors = sheets.flatMap(s => s.errors);
  const warnings = sheets.flatMap(s => s.warnings);

  return {
    sheets,
    auditLog,
    validationReport,
    errors,
    warnings,
    requiresApproval: errors.length > 0 || warnings.length > 0,
    approved: errors.length === 0,
  };
};

export const hasMappingApprovalBlockers = (validation = {}) => (
  (validation.errors || []).length > 0
);
