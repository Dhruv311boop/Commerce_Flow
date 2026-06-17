import assert from 'node:assert/strict';
import test from 'node:test';

import {
  detectColumnType,
  isDateLikeValue,
  sampleValuesForColumn,
  inferColumnMappings,
  normalizeBusinessData,
} from '../src/utils/dataImportEngine.js';
import { blockDateToIdMapping } from '../src/utils/columnTypeDetection.js';
import { inferMappingsWithLocalAI } from '../src/utils/intelligentImportMapper.js';
import { parseOrderItemsValue } from '../src/utils/orderItemsParser.js';
import { deriveOrderAmount } from '../src/utils/salesDerivation.js';
import {
  validateMappingsPreImport,
  classifyMappingConfidence,
  buildMappingAuditLog,
  CONFIDENCE_AUTO_ACCEPT,
  CONFIDENCE_REVIEW_MIN,
} from '../src/utils/mappingValidation.js';
import { buildCustomerIntelligence, isCompletedOrderStatus } from '../src/utils/customerIntelligence.js';
import { runProductionImport } from '../src/utils/productionImportEngine.js';

test('isDateLikeValue detects ISO and slash dates', () => {
  assert.equal(isDateLikeValue('2026-05-29'), true);
  assert.equal(isDateLikeValue('ORD-1001'), false);
});

test('detectColumnType classifies email and date columns', () => {
  assert.equal(detectColumnType('Email Address', ['a@b.com', 'c@d.com']), 'Email');
  assert.equal(detectColumnType('Order Date', ['2026-01-01', '2026-02-02']), 'Date');
});

test('date columns never map to orderId', () => {
  const rows = [{ 'Order Date': '2026-05-29' }, { 'Order Date': '2026-05-30' }];
  const mappings = inferColumnMappings(rows, 'Orders');
  const orderDateMapping = mappings.find(m => m.sourceColumn === 'Order Date');
  assert.notEqual(orderDateMapping?.suggestedField, 'orderId');
  assert.equal(blockDateToIdMapping('Order Date', ['2026-05-29'], 'orderId', 99), 0);
});

test('customer gender maps to customerGender field', () => {
  const rows = [{ Gender: 'M' }, { Gender: 'F' }];
  const mappings = inferMappingsWithLocalAI(rows, 'Customer_Profiling', 'customers');
  const genderMap = mappings.find(m => m.sourceColumn === 'Gender');
  assert.equal(genderMap?.suggestedField, 'customerGender');
});

test('order items parse all supported formats', () => {
  assert.deepEqual(parseOrderItemsValue('SKU001:2'), [{ sku: 'SKU001', productName: '', quantity: 2, unitPrice: null }]);
  assert.deepEqual(parseOrderItemsValue('SKU001 x 2')[0].quantity, 2);
  assert.deepEqual(parseOrderItemsValue('SKU001 (2)')[0].quantity, 2);
  assert.deepEqual(parseOrderItemsValue('[{"sku":"SKU001","qty":2}]')[0].sku, 'SKU001');
  assert.equal(parseOrderItemsValue('SKU001:2,SKU002:1').length, 2);
});

test('sales derivation uses priority order total then net then gross-discount then qty*price', () => {
  assert.equal(deriveOrderAmount({ orderTotal: 100 }), 100);
  assert.equal(deriveOrderAmount({ netAmount: 80 }), 80);
  assert.equal(deriveOrderAmount({ grossAmount: 100, discountAmount: 20 }), 80);
  assert.equal(deriveOrderAmount({ quantity: 2, productPrice: 25 }), 50);
  assert.equal(deriveOrderAmount({ quantity: 2 }), 0);
});

test('cohorts generate dynamically without upload column', () => {
  const customers = [{ id: 'c1', name: 'A', age: 22, gender: 'F', state: 'Delhi', city: 'Delhi', segment: 'Premium' }];
  const orders = [{ id: 'o1', customerId: 'c1', status: 'Delivered', total: 500, date: '2026-05-01', items: [] }];
  const report = buildCustomerIntelligence(customers, orders, []);
  assert.ok(report.enriched[0].cohorts.includes('Gen Z'));
  assert.ok(report.enriched[0].cohorts.includes('Female'));
  assert.ok(report.enriched[0].cohorts.includes('Premium'));
});

test('completed order statuses include done and paid', () => {
  assert.equal(isCompletedOrderStatus('Done'), true);
  assert.equal(isCompletedOrderStatus('paid'), true);
  assert.equal(isCompletedOrderStatus('Pending'), false);
});

test('confidence framework tiers', () => {
  assert.equal(classifyMappingConfidence(95), 'auto_accept');
  assert.equal(classifyMappingConfidence(80), 'review_required');
  assert.equal(classifyMappingConfidence(50), 'unmapped');
  assert.ok(CONFIDENCE_AUTO_ACCEPT >= 90);
  assert.ok(CONFIDENCE_REVIEW_MIN >= 70);
});

test('mapping audit log is generated with validation status', () => {
  const rows = [{ 'Order Date': '2026-05-29' }];
  const mappings = [{ sourceColumn: 'Order Date', suggestedField: 'orderId', confidence: 65, reasoning: 'Fuzzy Match' }];
  const audit = buildMappingAuditLog(mappings, rows, 'Orders');
  assert.equal(audit[0].uploadedColumn, 'Order Date');
  assert.equal(audit[0].detectedType, 'Date');
  assert.notEqual(audit[0].selectedMapping, 'orderId');
});

test('validation layer rejects date to id mapping', () => {
  const rows = [{ 'Order Date': '2026-05-29' }];
  const mappings = [{ sourceColumn: 'Order Date', suggestedField: 'orderId', confidence: 65 }];
  const result = validateMappingsPreImport(mappings, rows, 'Orders');
  assert.equal(result.validationReport[0].selectedMapping, '');
  assert.equal(result.validationReport[0].detectedType, 'Date');
});

test('runProductionImport returns mapping audit log and import preview', async () => {
  const datasets = {
    Products: [{ 'Product Name': 'Chair', SKU: 'CH-1', Price: 100, Stock: 5 }],
    Customers: [{ Name: 'Alex', Email: 'alex@example.com', Gender: 'M' }],
  };
  const result = await runProductionImport({ datasets, source: 'excel' });
  assert.ok(Array.isArray(result.mappingAuditLog));
  assert.ok(result.report?.importPreview);
  assert.ok(result.report?.validationReport);
});

test('order row with order items column populates items array', () => {
  const rows = [{
    'Order ID': 'O-1',
    'Order Items': 'SKU001:2,SKU002:1',
    'Order Amount': 150,
  }];
  const mappings = inferColumnMappings(rows, 'Orders.csv');
  const result = normalizeBusinessData(rows, 'csv', mappings);
  assert.equal(result.orders.length, 1);
  assert.equal(result.orders[0].items.length, 2);
});

test('existing imports remain compatible — products sheet still imports', async () => {
  const rows = [{ 'Product Name': 'Mug', SKU: 'MUG-1', Price: '10', Stock: '5' }];
  const mappings = inferColumnMappings(rows, 'Products');
  const result = normalizeBusinessData(rows, 'csv', mappings);
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].name, 'Mug');
});

test('customer profiles retain age state phone and sync order counts from orders', async () => {
  const datasets = {
    Customers: [{
      'Customer ID': 'C001',
      Name: 'Aarav Sharma',
      Email: 'aarav@example.com',
      City: 'Delhi',
      State: 'Delhi',
      Age: 31,
      'Mobile No': '9876543210',
    }],
    Orders: [
      { 'Order ID': 'ORD-1', 'Customer ID': 'C001', Total: 1798, Status: 'Processing', SKU: 'SKU-1001', Product: 'Wireless Mouse', Qty: 2 },
      { 'Order ID': 'ORD-2', 'Customer ID': 'C001', Total: 899, Status: 'Delivered', SKU: 'SKU-1001', Product: 'Wireless Mouse', Qty: 1 },
    ],
    Products: [{ 'Product Name': 'Wireless Mouse', SKU: 'SKU-1001', Price: 899, Stock: 10 }],
  };
  const mappings = Object.fromEntries(
    Object.entries(datasets).map(([sheet, rows]) => [sheet, inferColumnMappings(rows, sheet)])
  );
  const result = await runProductionImport({ datasets, source: 'excel', sheetMappings: mappings });
  const customer = result.customers[0];
  assert.equal(customer.name, 'Aarav Sharma');
  assert.equal(customer.state, 'Delhi');
  assert.equal(customer.age, 31);
  assert.equal(customer.phone, '9876543210');
  assert.equal(customer.totalPurchases, 2);
  assert.equal(result.products[0].salesCount, 3);
  const intel = buildCustomerIntelligence(result.customers, result.orders, result.products);
  assert.equal(intel.enriched[0].totalOrderCount, 2);
});
