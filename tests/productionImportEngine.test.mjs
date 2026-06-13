import assert from 'node:assert/strict';
import test from 'node:test';

import {
  runProductionImport,
  hasProductionBlockingIssues,
  downgradeIssuesToWarnings,
  deduplicateImportEntities,
  buildProductionImportReport,
} from '../src/utils/productionImportEngine.js';

test('production import never blocks on mapping warnings', () => {
  const warnings = downgradeIssuesToWarnings([
    { severity: 'error', message: 'Missing required field: Product Name.' },
    { severity: 'error', message: 'Invalid email address ("bad").' },
  ]);
  assert.equal(hasProductionBlockingIssues(warnings), false);
});

test('production import blocks only empty datasets', () => {
  assert.equal(hasProductionBlockingIssues([{ severity: 'error', message: 'Empty datasets cannot be imported.' }]), true);
});

test('runProductionImport returns report and never throws on partial mappings', async () => {
  const datasets = {
    Products: [{ 'Product Name': 'Chair', 'SKU Code': 'CH-1', Price: 100, Stock: 5 }],
    Orders: [{ 'Order Number': 'O-1', 'Cust ID': 'C-1', Qty: 1, 'Net Amount': 100, Status: 'Done' }],
    Customers: [{ 'Customer ID': 'C-1', Name: 'Alex', Email: 'alex@example.com' }],
  };
  const result = await runProductionImport({ datasets, source: 'excel' });
  assert.equal(result.success, true);
  assert.ok(result.report);
  assert.ok(result.report.mappingDecisions.length > 0);
  assert.equal(result.products.length >= 1, true);
  assert.equal(result.customers.length >= 1, true);
  assert.equal(result.orders.length >= 1, true);
});

test('deduplicateImportEntities merges duplicate SKUs', () => {
  const deduped = deduplicateImportEntities({
    products: [
      { sku: 'A-1', name: 'First', stock: 1 },
      { sku: 'A-1', name: 'Second', stock: 2 },
    ],
  });
  assert.equal(deduped.products.length, 1);
  assert.equal(deduped.products[0].name, 'Second');
});

test('buildProductionImportReport includes new dynamic fields', () => {
  const report = buildProductionImportReport({
    normalized: {
      products: [{ extraFields: { brand: 'Acme' } }],
      customers: [],
      orders: [],
      inventory: [],
    },
    warnings: [{ severity: 'warning', message: 'Low confidence mapping' }],
  });
  assert.equal(report.newFieldsCreated.length, 1);
  assert.equal(report.newFieldsCreated[0].fieldKey, 'brand');
});

test('runProductionImport derives order price from existingProducts when direct price is missing or zero', async () => {
  const datasets = {
    Orders: [
      { 'Order ID': 'O-100', 'Product SKU': 'SKU-FALLBACK', Quantity: 2 }
    ]
  };
  const existingProducts = [
    { sku: 'SKU-FALLBACK', id: 'p-fallback', name: 'Fallback Shoe', price: 50.00 }
  ];
  const result = await runProductionImport({
    datasets,
    source: 'excel',
    existingProducts,
  });
  assert.equal(result.success, true);
  assert.equal(result.orders.length, 1);
  assert.equal(result.orders[0].total, 100.00); // 2 * 50.00
  assert.equal(result.orders[0].items[0].productName, 'Fallback Shoe');
});

test('runProductionImport maps customer details from existingCustomers when missing', async () => {
  const datasets = {
    Orders: [
      { 'Order ID': 'O-200', 'Customer Email': 'existing@example.com', 'Product SKU': 'SKU-1', Quantity: 1 }
    ]
  };
  const existingCustomers = [
    { id: 'c-existing', name: 'John Doe', email: 'existing@example.com' }
  ];
  const result = await runProductionImport({
    datasets,
    source: 'excel',
    existingCustomers,
  });
  assert.equal(result.success, true);
  assert.equal(result.orders.length, 1);
  assert.equal(result.orders[0].customerId, 'c-existing');
  assert.equal(result.orders[0].customer, 'John Doe');
});
