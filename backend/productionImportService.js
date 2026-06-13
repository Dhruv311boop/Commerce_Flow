import { v4 as uuidv4 } from 'uuid';
import {
  Product,
  Customer,
  Order,
  Inventory,
  Import,
  ImportReport,
  CustomFieldDefinition,
} from './db.js';
import {
  runProductionImport,
  toBackendRecords,
  saveRecordsInBatches,
  serverMappingsToEngine,
  toServerMapping,
} from '../src/utils/productionImportEngine.js';

const engineMappingsToServer = (sheetMappings = {}) => (
  Object.fromEntries(
    Object.entries(sheetMappings).map(([sheet, mappings]) => [
      sheet,
      mappings.map(item => toServerMapping(item, sheet)),
    ])
  )
);

export class ProductionImportService {
  constructor(store) {
    this.store = store;
  }

  async runFromSession(importId, manualMappings = null, options = {}) {
    const { datasets, sourceType } = this.store.load(importId);
    let sheetMappings;
    if (manualMappings?.length) {
      const grouped = manualMappings.reduce((acc, item) => {
        const sheet = item.dataset || Object.keys(datasets)[0] || 'Sheet1';
        acc[sheet] = acc[sheet] || [];
        acc[sheet].push(item);
        return acc;
      }, {});
      sheetMappings = Object.fromEntries(
        Object.entries(grouped).map(([sheet, list]) => [sheet, serverMappingsToEngine(list)])
      );
    }

    const dbProducts = await Product.findAll();
    const dbCustomers = await Customer.findAll();
    const existingProducts = dbProducts.map(p => p.get({ plain: true }));
    const existingCustomers = dbCustomers.map(c => c.get({ plain: true }));

    const result = await runProductionImport({
      datasets,
      source: sourceType || 'excel',
      sheetMappings,
      useOpenAI: options.useOpenAI === true,
      existingProducts,
      existingCustomers,
    });

    return { importId, sourceType, ...result };
  }

  async persist(importId, productionResult, replaceExisting = false) {
    const backendRecords = toBackendRecords(productionResult, importId);

    if (replaceExisting) {
      // Full replace per entity type — only real rows from this import remain in the database
      if (backendRecords.products.length > 0) await Product.destroy({ where: {} });
      if (backendRecords.customers.length > 0) await Customer.destroy({ where: {} });
      if (backendRecords.orders.length > 0) await Order.destroy({ where: {} });
      if (backendRecords.inventory.length > 0) await Inventory.destroy({ where: {} });
    }

    await saveRecordsInBatches(
      Product,
      backendRecords.products,
      500,
      ['name', 'sku', 'category', 'price', 'stock', 'extra_fields', 'source_import_id']
    );
    await saveRecordsInBatches(
      Customer,
      backendRecords.customers,
      500,
      ['name', 'email', 'phone', 'city', 'state', 'age', 'acquisition_date', 'extra_fields', 'source_import_id', 'updated_at']
    );
    await saveRecordsInBatches(
      Order,
      backendRecords.orders,
      500,
      ['customer_id', 'customer', 'product', 'quantity', 'amount', 'order_date', 'status', 'extra_fields', 'source_import_id', 'updated_at']
    );
    await saveRecordsInBatches(
      Inventory,
      backendRecords.inventory,
      500,
      ['product', 'stock', 'reorder_level', 'extra_fields', 'source_import_id']
    );

    const reportPayload = {
      ...productionResult.report,
      importId,
      counts: {
        products: backendRecords.products.length,
        customers: backendRecords.customers.length,
        orders: backendRecords.orders.length,
        inventory: backendRecords.inventory.length,
      },
      productImportStats: productionResult.productImportStats || productionResult.report?.productImportStats || null,
    };

    await ImportReport.upsert({
      import_id: importId,
      report_json: JSON.stringify(reportPayload),
    });

    for (const field of productionResult.report?.newFieldsCreated || []) {
      const fieldId = `${importId}:${field.entity}:${field.fieldKey}`;
      await CustomFieldDefinition.findOrCreate({
        where: { id: fieldId },
        defaults: {
          id: fieldId,
          entity_type: field.entity,
          field_key: field.fieldKey,
          display_name: field.fieldKey,
          sample_value: String(field.sampleValue ?? ''),
          source_import_id: importId,
        },
      });
    }

    await Import.update({ saved: true, metadata_json: JSON.stringify({ report: reportPayload }) }, { where: { id: importId } });

    return {
      saved: true,
      counts: reportPayload.counts,
      report: reportPayload,
      validationIssues: productionResult.warnings,
    };
  }

  async getReport(importId) {
    const row = await ImportReport.findByPk(importId);
    if (!row) return null;
    return JSON.parse(row.report_json || '{}');
  }
}

export const createImportId = () => uuidv4().replace(/-/g, '');
