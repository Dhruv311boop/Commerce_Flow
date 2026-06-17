import assert from 'node:assert/strict';
import test from 'node:test';
import * as XLSX from 'xlsx';
import { readFileSync, existsSync } from 'node:fs';

import {
  inferMappingsWithLocalAI,
  inferWorkbookMappings,
  resolveMappingConflicts,
  buildRawWorkbookProfile,
} from '../src/utils/intelligentImportMapper.js';
import { normalizeMultiSheetData } from '../src/utils/dataImportEngine.js';

test('resolveMappingConflicts keeps one target field per column', () => {
  const resolved = resolveMappingConflicts([
    { sourceColumn: 'Brand', suggestedField: 'productName', confidence: 86 },
    { sourceColumn: 'Product Name', suggestedField: 'productName', confidence: 99 },
    { sourceColumn: 'Color', suggestedField: 'productName', confidence: 80 },
  ]);

  const productNameMappings = resolved.filter(item => item.suggestedField === 'productName');
  assert.equal(productNameMappings.length, 1);
  assert.equal(productNameMappings[0].sourceColumn, 'Product Name');
});

test('Product Analyst workbook maps non-standard headers with local AI', () => {
  const datasets = {
    Customer_Profiling: [
      {
        'Customer ID': 'CUST001',
        'Full Name': 'Aarav Sharma',
        Age: 34,
        Gender: 'M',
        'Mobile No': '9876543210',
        'Email Address': 'aarav@email.com',
        City: 'Delhi',
        State: 'Delhi',
        'Customer Segment': 'Premium',
        'Lifetime Value': 125000,
        'Preferred Channel': 'WhatsApp',
        'Last Purchase Date': '2026-05-29',
      },
    ],
    Orders: [
      {
        'Order Number': 'ORD1001',
        'Cust ID': 'CUST001',
        'Order Dt': '2026-05-29',
        'Gross Amount': 5000,
        'Discount Amt': 500,
        'Net Amount': 4500,
        'Payment Method': 'UPI',
        'Order Status': 'Delivered',
        'Sales Channel': 'Website',
      },
    ],
    Products: [
      {
        'SKU Code': 'SKU001',
        'Product Name': 'Wireless Earbuds',
        Category: 'Electronics',
        Brand: 'SoundMax',
        'Selling Price': 2999,
        'Cost Price': 1800,
        'Stock Qty': 120,
        'Supplier Name': 'TechSupply',
        'Warranty Months': 12,
        'Custom Attribute Color': 'Black',
      },
    ],
  };

  const mappings = inferWorkbookMappings(datasets);
  const field = (sheet, column) => mappings[sheet].find(item => item.sourceColumn === column)?.suggestedField;

  assert.equal(field('Customer_Profiling', 'Full Name'), 'customerName');
  assert.equal(field('Customer_Profiling', 'Email Address'), 'customerEmail');
  assert.equal(field('Customer_Profiling', 'Mobile No'), 'customerPhone');
  assert.equal(field('Orders', 'Cust ID'), 'customerId');
  assert.equal(field('Orders', 'Order Number'), 'orderId');
  assert.equal(field('Orders', 'Net Amount'), 'orderTotal');
  assert.equal(field('Orders', 'Order Status'), 'orderStatus');
  assert.equal(field('Products', 'SKU Code'), 'productSku');
  assert.equal(field('Products', 'Product Name'), 'productName');
  assert.equal(field('Products', 'Selling Price'), 'productPrice');
  assert.equal(field('Products', 'Stock Qty'), 'productStock');

  const result = normalizeMultiSheetData(datasets, mappings, 'excel');
  assert.equal(result.products.length, 1);
  assert.equal(result.customers.length, 1);
  assert.equal(result.orders.length, 1);
  assert.equal(result.products[0].sku, 'SKU001');
  assert.equal(result.customers[0].email, 'aarav@email.com');
  assert.equal(result.customers[0].lifetimeValue, 125000);
  assert.equal(result.orders[0].total, 4500);
});

test('raw workbook profile preserves every column and row', () => {
  const datasets = {
    SheetA: [{ A: 1, B: 2 }, { A: 3, B: '' }],
  };
  const profile = buildRawWorkbookProfile(datasets);
  assert.equal(profile.totalRows, 2);
  assert.equal(profile.totalColumns, 2);
  assert.deepEqual(profile.sheets[0].columns, ['A', 'B']);
  assert.equal(profile.sheets[0].rows[1].B, 'None');
});

test('optional live Product Analyst xlsx import', { skip: !existsSync('/Users/dhruv/Downloads/Product_Analyst_Complete_Dataset.xlsx') }, () => {
  const wb = XLSX.read(readFileSync('/Users/dhruv/Downloads/Product_Analyst_Complete_Dataset.xlsx'), { type: 'buffer' });
  const datasets = Object.fromEntries(
    wb.SheetNames.map(name => [name, XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' })])
  );
  const mappings = inferWorkbookMappings(datasets);
  const result = normalizeMultiSheetData(datasets, mappings, 'excel');
  assert.equal(result.products.length, 4);
  assert.equal(result.customers.length, 4);
  assert.equal(result.orders.length, 4);
});
