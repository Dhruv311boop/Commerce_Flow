/**
 * Guards product import so only rows from uploaded product sheets become products.
 */

import { detectImportTableType, inferColumnMappings } from './dataImportEngine.js';

export const PRODUCT_ORIGIN = {
  UPLOADED_FILE: 'uploaded_file',
  ORDER_DERIVED: 'order_derived',
  INVENTORY_SYNTHETIC: 'inventory_synthetic',
  MERGE_SYNTHETIC: 'merge_synthetic',
};

export const createImportAuditLog = () => ({
  productsReadFromFile: [],
  productsAddedDuringTransformation: [],
  productsRejected: [],
  duplicatesSkipped: [],
});

export const countUploadedProductRows = (datasets = {}, sheetMappings = {}, sheetTableTypes = {}) => {
  let count = 0;
  Object.entries(datasets).forEach(([sheetName, rows]) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const mappings = sheetMappings[sheetName] || inferColumnMappings(safeRows, sheetName, sheetTableTypes[sheetName]);
    const detection = detectImportTableType(safeRows, mappings, sheetName, sheetTableTypes[sheetName]);
    if (detection.tableType === 'products') {
      count += safeRows.length;
    }
  });
  return count;
};

export const isProductSheet = (sheetName, rows, mappings, sheetTableTypes = {}) => {
  const detection = detectImportTableType(rows, mappings, sheetName, sheetTableTypes[sheetName]);
  return detection.tableType === 'products';
};

export const filterFileSourcedProducts = (products = []) => {
  const fromFile = products.filter(product => product.sourceOrigin === PRODUCT_ORIGIN.UPLOADED_FILE);
  if (fromFile.length > 0) return fromFile;

  // Keep real uploaded rows that predate sourceOrigin tagging — block only known synthetic sources
  return products.filter(product => (
    product.sourceOrigin !== PRODUCT_ORIGIN.ORDER_DERIVED &&
    product.sourceOrigin !== PRODUCT_ORIGIN.INVENTORY_SYNTHETIC &&
    product.sourceOrigin !== PRODUCT_ORIGIN.MERGE_SYNTHETIC &&
    !String(product.id || '').startsWith('p-')
  ));
};

export const buildProductImportStats = ({
  uploadedProductCount = 0,
  importedProducts = [],
  auditLog = createImportAuditLog(),
} = {}) => {
  const fileSourced = filterFileSourcedProducts(importedProducts);
  const duplicateCount = auditLog.duplicatesSkipped.length;
  const rejectedCount = auditLog.productsRejected.length;
  const importedCount = fileSourced.length;

  return {
    uploadedProductCount,
    importedProductCount: importedCount,
    duplicateCount,
    rejectedCount,
    extraBlockedCount: Math.max(0, importedProducts.length - importedCount),
    auditLog,
  };
};

export const logProductAudit = (auditLog, entry) => {
  if (!auditLog) return;
  if (entry.stage === 'read') auditLog.productsReadFromFile.push(entry);
  else if (entry.stage === 'added') auditLog.productsAddedDuringTransformation.push(entry);
  else if (entry.stage === 'rejected') auditLog.productsRejected.push(entry);
  else if (entry.stage === 'duplicate') auditLog.duplicatesSkipped.push(entry);
};

export const clearImportSessionCache = () => {
  if (typeof window === 'undefined') return;
  const keysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i);
    if (key && (key.startsWith('import_') || key.startsWith('commerce_import'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => sessionStorage.removeItem(key));
  localStorage.removeItem('commerce_imports');
  localStorage.removeItem('commerce_products');
};
