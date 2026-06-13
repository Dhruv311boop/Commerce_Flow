import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { UniversalDataIngestionEngine } from '../engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Universal Data Ingestion Engine Tests', async (t) => {
  const engine = new UniversalDataIngestionEngine();

  await t.test('Synonym/Alias column mapping matches standard headers', () => {
    const datasets = {
      products: [
        { 'Product SKU': 'SKU-001', 'item name': 'Super Product', 'inventory_count': '10', 'mrp': '19.99' }
      ]
    };
    const importId = engine.store.createImport('csv', datasets);
    const { mappings } = engine.mapImport(importId);

    const skuMap = mappings.find(m => m.source_column === 'Product SKU');
    const nameMap = mappings.find(m => m.source_column === 'item name');
    const stockMap = mappings.find(m => m.source_column === 'inventory_count');
    const priceMap = mappings.find(m => m.source_column === 'mrp');

    assert.equal(skuMap?.target_field, 'sku');
    assert.equal(nameMap?.target_field, 'product_name');
    assert.equal(stockMap?.target_field, 'stock');
    assert.equal(priceMap?.target_field, 'price');

    // Cleanup session
    const folder = path.join(path.resolve(__dirname, '../data/imports'), importId);
    fs.rmSync(folder, { recursive: true, force: true });
  });

  await t.test('Blocked mappings block stock->sku and sales->quantity', () => {
    const datasets = {
      orders: [
        { 'sales': '250.00', 'stock': '150' }
      ]
    };
    const importId = engine.store.createImport('csv', datasets);
    const { mappings } = engine.mapImport(importId);

    const salesMap = mappings.find(m => m.source_column === 'sales');
    const stockMap = mappings.find(m => m.source_column === 'stock');

    // 'sales' should map to amount (revenue), NOT quantity
    assert.notEqual(salesMap?.target_field, 'quantity');
    
    // 'stock' should map to stock, NOT sku
    assert.notEqual(stockMap?.target_field, 'sku');

    // Cleanup session
    const folder = path.join(path.resolve(__dirname, '../data/imports'), importId);
    fs.rmSync(folder, { recursive: true, force: true });
  });

  await t.test('validateImport aggregates validation warnings without spam', () => {
    // Create a dataset with 600 rows containing invalid email and invalid price
    const rows = [];
    for (let i = 0; i < 600; i++) {
      rows.push({
        'Product SKU': `SKU-${i}`,
        'Product Name': `Product ${i}`,
        'Price': 'invalid_price',
        'Customer Email': 'bad_email',
      });
    }

    const datasets = {
      products: rows
    };

    const importId = engine.store.createImport('csv', datasets);
    
    // Manual mapping definitions
    const mappings = [
      { dataset: 'products', source_column: 'Product SKU', target_field: 'sku', confidence: 100 },
      { dataset: 'products', source_column: 'Product Name', target_field: 'product_name', confidence: 100 },
      { dataset: 'products', source_column: 'Price', target_field: 'price', confidence: 100 },
      { dataset: 'products', source_column: 'Customer Email', target_field: 'customer_email', confidence: 100 },
    ];

    const issues = engine.validateImport(importId, mappings);

    // Total warnings should be capped and aggregated, not 1200+ warnings
    assert.ok(issues.length <= 50);

    // Should contain aggregated invalid_price warning
    const priceWarning = issues.find(w => w.type === 'invalid_price');
    assert.ok(priceWarning);
    assert.equal(priceWarning.affected_count, 600);
    assert.equal(priceWarning.sample_rows.length, 5);

    // Should contain aggregated invalid_email warning
    const emailWarning = issues.find(w => w.type === 'invalid_email');
    assert.ok(emailWarning);
    assert.equal(emailWarning.affected_count, 600);

    // Cleanup session
    const folder = path.join(path.resolve(__dirname, '../data/imports'), importId);
    fs.rmSync(folder, { recursive: true, force: true });
  });

  await t.test('Duplicate SKU detection works and groups efficiently', () => {
    const datasets = {
      products: [
        { 'Product SKU': 'SKU-01', 'Product Name': 'Item 1' },
        { 'Product SKU': 'SKU-01', 'Product Name': 'Item 2' },
        { 'Product SKU': 'SKU-02', 'Product Name': 'Item 3' },
        { 'Product SKU': 'SKU-02', 'Product Name': 'Item 4' },
      ]
    };
    const importId = engine.store.createImport('csv', datasets);
    
    const mappings = [
      { dataset: 'products', source_column: 'Product SKU', target_field: 'sku', confidence: 100 },
      { dataset: 'products', source_column: 'Product Name', target_field: 'product_name', confidence: 100 }
    ];

    const issues = engine.validateImport(importId, mappings);
    const skuDups = issues.find(i => i.type === 'duplicate_sku');

    assert.ok(skuDups);
    assert.ok(skuDups.message.includes('2 duplicate SKU'));
    assert.equal(skuDups.duplicates.length, 2);

    // Cleanup session
    const folder = path.join(path.resolve(__dirname, '../data/imports'), importId);
    fs.rmSync(folder, { recursive: true, force: true });
  });

  await t.test('Auto-Fix suggestion engine generates expected fixes', () => {
    const datasets = {
      products: [
        { 'Total Price': '29.99', 'Qty': '5' }
      ]
    };
    const importId = engine.store.createImport('csv', datasets);
    
    // Give empty manual mappings (or unmapped)
    const mappings = [
      { dataset: 'products', source_column: 'Total Price', target_field: null, confidence: 0 },
      { dataset: 'products', source_column: 'Qty', target_field: null, confidence: 0 }
    ];

    const result = engine.suggestAutoFixes(importId, mappings);
    
    const priceFix = result.fixes.find(f => f.source_column === 'Total Price');
    const qtyFix = result.fixes.find(f => f.source_column === 'Qty');

    assert.ok(priceFix);
    assert.ok(qtyFix);
    assert.equal(qtyFix.suggested_field, 'quantity');

    // Cleanup session
    const folder = path.join(path.resolve(__dirname, '../data/imports'), importId);
    fs.rmSync(folder, { recursive: true, force: true });
  });
});
