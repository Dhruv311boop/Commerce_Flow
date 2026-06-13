import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildImportColumnReport,
  detectImportTableType,
  inferColumnMappings,
  normalizeSku,
  normalizeBusinessData,
  normalizeMultiSheetData,
  validateImportRows,
  validateMultiSheetMappingConsistency,
} from '../src/utils/dataImportEngine.js';

test('customer sheet imports customers only and never creates products', () => {
  const rows = [
    { 'Customer Name': 'Diya Singh', Email: 'diya@gmail.com' },
    { 'Customer Name': 'Neha Sharma', Email: 'neha@gmail.com' },
  ];
  const mappings = inferColumnMappings(rows, 'Customers');
  const result = normalizeBusinessData(rows, 'csv', mappings);

  assert.equal(detectImportTableType(rows, mappings, 'Customers').tableType, 'customers');
  assert.equal(result.products.length, 0);
  assert.equal(result.customers.length, 2);
  assert.deepEqual(result.customers.map(customer => customer.name), ['Diya Singh', 'Neha Sharma']);
});

test('real-world product aliases map automatically', () => {
  const rows = [
    {
      ProductCode: 'MUG-001',
      ProductName: 'Matte Mug',
      Department: 'Home',
      'Retail Price': '$19.99',
      'Available Stock': '42',
      'Sales Count': '12',
    },
  ];
  const mappings = inferColumnMappings(rows, 'ERP Product Export');
  const fieldByColumn = Object.fromEntries(mappings.map(item => [item.sourceColumn, item.suggestedField]));
  const result = normalizeBusinessData(rows, 'business_software', mappings);

  assert.equal(fieldByColumn.ProductCode, 'productSku');
  assert.equal(fieldByColumn.ProductName, 'productName');
  assert.equal(fieldByColumn.Department, 'productCategory');
  assert.equal(fieldByColumn['Retail Price'], 'productPrice');
  assert.equal(fieldByColumn['Available Stock'], 'productStock');
  assert.equal(fieldByColumn['Sales Count'], 'productSales');
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].sku, 'MUG-001');
  assert.equal(result.customers.length, 0);
});

test('multi-sheet import keeps customers out of products', () => {
  const datasets = {
    Customers: [
      { 'Customer Name': 'Diya Singh', Email: 'diya@gmail.com', Age: '28' },
      { 'Customer Name': 'Neha Sharma', Email: 'neha@gmail.com', Age: '31' },
    ],
    Products: [
      { 'Product Name': 'Cotton Tee', SKU: 'TEE-001', Category: 'Apparel', Price: '29.99', Stock: '10' },
    ],
  };
  const mappings = Object.fromEntries(
    Object.entries(datasets).map(([sheet, rows]) => [sheet, inferColumnMappings(rows, sheet)])
  );
  const issues = validateMultiSheetMappingConsistency(datasets, mappings);
  const result = normalizeMultiSheetData(datasets, mappings, 'excel');

  assert.equal(issues.length, 0);
  assert.deepEqual(result.products.map(product => product.name), ['Cotton Tee']);
  assert.deepEqual(result.customers.map(customer => customer.name), ['Diya Singh', 'Neha Sharma']);
});

test('multi-sheet orders link to products by normalized SKU aliases', () => {
  const datasets = {
    Products: [
      { 'Product Name': 'iPhone 15', SKU: ' abc123 ', Category: 'Phones', Price: '799', Stock: '5' },
    ],
    Orders: [
      { 'Order ID': 'ORD-00912', 'Item SKU': '\u200Babc123\u00A0', Quantity: '2', Total: '1598' },
    ],
  };
  const mappings = Object.fromEntries(
    Object.entries(datasets).map(([sheet, rows]) => [sheet, inferColumnMappings(rows, sheet)])
  );
  const result = normalizeMultiSheetData(datasets, mappings, 'excel');

  assert.equal(normalizeSku('\u200Babc123\u00A0'), 'ABC123');
  assert.equal(result.products[0].sku, 'ABC123');
  assert.equal(result.orders[0].items[0].sku, 'ABC123');
  assert.equal(result.orders[0].items[0].productName, 'iPhone 15');
  assert.equal(result.orders[0].items[0].quantity, 2);
  assert.deepEqual(result.analysis.productMappingReport, {
    ordersImported: 1,
    totalOrderSkus: 1,
    matchedSkus: 1,
    unmatchedSkus: 0,
    unmatchedItems: [],
  });
});

test('unmatched order SKUs do not create products — only product sheets import products', () => {
  const datasets = {
    Products: [
      { 'Product Name': 'Dell XPS 13', SKU: 'DELL-13', Category: 'Laptops', Price: '1299', Stock: '3' },
    ],
    Orders: [
      { 'Order ID': 'ORD-404', 'Product SKU': 'MISS-001', Quantity: '1', Total: '50' },
    ],
  };
  const mappings = Object.fromEntries(
    Object.entries(datasets).map(([sheet, rows]) => [sheet, inferColumnMappings(rows, sheet)])
  );
  const result = normalizeMultiSheetData(datasets, mappings, 'excel');

  assert.equal(result.orders[0].items[0].sku, 'MISS-001');
  assert.equal(result.orders[0].items[0].productName, 'MISS-001');
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].sku, 'DELL-13');
  assert.equal(result.products.some(product => product.sku === 'MISS-001'), false);
  assert.equal(result.analysis.productMappingReport.unmatchedSkus, 1);
  assert.equal(result.analysis.productImportStats.uploadedProductCount, 1);
});

test('Products.csv creates products and enforces SKU uniqueness warnings only for products', () => {
  const rows = [
    { 'Product Name': 'Matte Mug', SKU: 'MUG-001', Category: 'Home', Price: '19.99', Stock: '42' },
    { 'Product Name': 'Travel Mug', SKU: 'MUG-001', Category: 'Home', Price: '24.99', Stock: '8' },
  ];
  const mappings = inferColumnMappings(rows, 'Products.csv');
  const result = normalizeBusinessData(rows, 'csv', mappings);
  const warnings = validateImportRows(rows, result.analysis.columnMap, result.analysis.tableDetection.tableType);

  assert.equal(detectImportTableType(rows, mappings, 'Products.csv').tableType, 'products');
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].name, 'Matte Mug');
  assert.ok(warnings.some(warning => warning.message.includes('Duplicate SKU')));
});

test('Orders.csv creates customers and orders and auto-creates products from order rows', () => {
  const rows = [
    { 'Order ID': 'ORD-1', Customer: 'Diya Singh', Email: 'diya@example.com', SKU: 'TEE-001', Product: 'Cotton Tee', Quantity: '2', 'Order Amount': '59.98' },
    { 'Order ID': 'ORD-2', Customer: 'Neha Sharma', Email: 'neha@example.com', SKU: 'TEE-001', Product: 'Cotton Tee', Quantity: '1', 'Order Amount': '29.99' },
  ];
  const mappings = inferColumnMappings(rows, 'Orders.csv');
  const result = normalizeBusinessData(rows, 'csv', mappings);
  const warnings = validateImportRows(rows, result.analysis.columnMap, result.analysis.tableDetection.tableType);

  assert.equal(detectImportTableType(rows, mappings, 'Orders.csv').tableType, 'mixed_commerce');
  assert.equal(result.products.length, 1);
  assert.equal(result.customers.length, 2);
  assert.equal(result.orders.length, 2);
  assert.equal(result.orders[0].customer, 'Diya Singh');
  assert.equal(result.orders[0].total, 59.98);
  assert.equal(result.orders[1].items[0].productName, 'Cotton Tee');
  assert.ok(!warnings.some(warning => warning.message.includes('Duplicate SKU')));
});

test('Customers.csv creates customers without Unknown placeholders', () => {
  const rows = [
    { 'Customer Name': 'Aarav Mehta', 'Customer Email': 'aarav@example.com' },
    { 'Customer Name': '', 'Customer Email': 'email-only@example.com' },
  ];
  const mappings = inferColumnMappings(rows, 'Customers.csv');
  const result = normalizeBusinessData(rows, 'csv', mappings);

  assert.equal(detectImportTableType(rows, mappings, 'Customers.csv').tableType, 'customers');
  assert.equal(result.customers.length, 2);
  assert.equal(result.customers[0].name, 'Aarav Mehta');
  assert.equal(result.customers[1].name, 'None');
  assert.notEqual(result.customers[1].name, 'Unknown');
});

test('CommerceFlow sample workbook maps all sheets and preserves extra customer columns', () => {
  const datasets = {
    Products: [
      { 'Product Name': 'Wireless Mouse', SKU: 'SKU-1001', Category: 'Electronics', Price: 899, Stock: 120, Sales: 85 },
    ],
    Orders: [
      {
        'Order ID': 'ORD-5001',
        Date: '2026-05-28',
        'Customer ID': 'C001',
        'Customer Name': 'Aarav Sharma',
        Location: 'Delhi',
        SKU: 'SKU-1001',
        Product: 'Wireless Mouse',
        Qty: 2,
        Total: 1798,
        Status: 'Delivered',
      },
    ],
    Customers: [
      {
        'Customer ID': 'C001',
        Name: 'Aarav Sharma',
        Email: 'aarav@example.com',
        City: 'Delhi',
        State: 'Delhi',
        Age: 31,
        Orders: 2,
        LTV: 4796,
        Cohort: '2026-Q2',
      },
    ],
  };
  const mappings = Object.fromEntries(
    Object.entries(datasets).map(([sheet, rows]) => [sheet, inferColumnMappings(rows, sheet)])
  );
  const report = buildImportColumnReport(datasets, mappings);
  const result = normalizeMultiSheetData(datasets, mappings, 'excel');

  assert.equal(report.find(sheet => sheet.sheetName === 'Products').unmappedColumns.length, 0);
  assert.equal(report.find(sheet => sheet.sheetName === 'Orders').unmappedColumns.length, 0);
  assert.deepEqual(
    report.find(sheet => sheet.sheetName === 'Customers').extraColumns,
    ['Orders', 'LTV', 'Cohort']
  );
  assert.equal(result.products.length, 1);
  assert.equal(result.customers.length, 1);
  assert.equal(result.customers[0].email, 'aarav@example.com');
  assert.equal(result.customers[0].ltv, 1798);
  assert.equal(result.customers[0].cohort, 'New');
  assert.equal(result.orders[0].status, 'Delivered');
});

test('Inventory.csv imports inventory and duplicate SKUs merge into the latest update', () => {
  const rows = [
    { SKU: 'TEE-001', 'Stock Quantity': '8' },
    { SKU: 'TEE-001', 'Stock Quantity': '15' },
  ];
  const mappings = inferColumnMappings(rows, 'Inventory.csv');
  const result = normalizeBusinessData(rows, 'csv', mappings);
  const warnings = validateImportRows(rows, result.analysis.columnMap, result.analysis.tableDetection.tableType);

  assert.equal(detectImportTableType(rows, mappings, 'Inventory.csv').tableType, 'inventory');
  assert.equal(result.inventory.length, 1);
  assert.equal(result.inventory[0].stock, 15);
  assert.ok(!warnings.some(warning => warning.message.includes('Duplicate SKU')));
});

test('single commerce CSV imports orders and customers and auto-creates products', () => {
  const rows = [
    {
      'Order ID': 'ORD-10',
      'Buyer Name': 'Maya Rao',
      'Customer Email': 'maya@example.com',
      'Product SKU': 'BAG-001',
      'Item Name': 'Canvas Bag',
      Category: 'Accessories',
      Quantity: '3',
      'Unit Price': '12.50',
    },
  ];
  const mappings = inferColumnMappings(rows, 'commerce.csv');
  const result = normalizeBusinessData(rows, 'csv', mappings);

  assert.equal(detectImportTableType(rows, mappings, 'commerce.csv').tableType, 'mixed_commerce');
  assert.equal(result.products.length, 1);
  assert.equal(result.customers.length, 1);
  assert.equal(result.orders.length, 1);
  assert.equal(result.customers[0].name, 'Maya Rao');
  assert.equal(result.orders[0].total, 37.5);
  assert.equal(result.orders[0].mappedFields.productName, 'Canvas Bag');
  assert.equal(result.orders[0].mappedFields.customerEmail, 'maya@example.com');
});

test('product sheet with five rows imports exactly five file-sourced products', () => {
  const rows = Array.from({ length: 5 }, (_, index) => ({
    'Product Name': `Product ${index + 1}`,
    SKU: `SKU-${index + 1}`,
    Category: 'General',
    Price: String((index + 1) * 10),
    Stock: String(index + 1),
  }));
  const mappings = inferColumnMappings(rows, 'Products');
  const result = normalizeBusinessData(rows, 'csv', mappings);

  assert.equal(result.products.length, 5);
  assert.equal(result.analysis.productImportStats.uploadedProductCount, 5);
  assert.equal(result.analysis.productImportStats.importedProductCount, 5);
  assert.ok(result.products.every(product => product.sourceOrigin === 'uploaded_file'));
});
