import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import XLSX from 'xlsx';
import { google } from 'googleapis';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import oracledb from 'oracledb';
import { Sequelize } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import {
  Product,
  Customer,
  Order,
  Inventory,
  Import,
  CustomerAcquisition,
  sequelize
} from './db.js';
import { ProductionImportService } from './productionImportService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const IMPORT_DIR = path.join(DATA_DIR, 'imports');

// Ensure import directory exists
if (!fs.existsSync(IMPORT_DIR)) {
  fs.mkdirSync(IMPORT_DIR, { recursive: true });
}

export const FIELD_LABELS = {
  product_id: ['Products', 'Product ID'],
  product_name: ['Products', 'Product Name'],
  sku: ['Products', 'SKU'],
  category: ['Products', 'Category'],
  price: ['Products', 'Price'],
  stock: ['Inventory', 'Stock Quantity'],
  reorder_level: ['Inventory', 'Reorder Level'],
  customer_id: ['Customers', 'Customer ID'],
  customer_name: ['Customers', 'Customer Name'],
  customer_email: ['Customers', 'Customer Email'],
  customer_phone: ['Customers', 'Customer Phone'],
  customer_city: ['Customers', 'Customer City'],
  customer_state: ['Customers', 'Customer State'],
  acquisition_date: ['Customers', 'Acquisition Date'],
  order_id: ['Orders', 'Order ID'],
  order_date: ['Orders', 'Order Date'],
  quantity: ['Orders', 'Quantity'],
  amount: ['Orders', 'Amount'],
  status: ['Orders', 'Status'],
  supplier_name: ['Suppliers', 'Supplier Name'],
};

export const ALIASES = {
  product_id: ['product id', 'product_id', 'pid', 'item id', 'item_id'],
  product_name: ['product name', 'productname', 'item name', 'itemname', 'product', 'title', 'item', 'line item', 'item description', 'product description', 'product title', 'product label', 'merchandise'],
  sku: ['sku', 'sku code', 'sku_code', 'product sku', 'item sku', 'variant sku', 'productcode', 'itemcode', 'product_id', 'productid', 'item number', 'item code', 'article number', 'article_number', 'part number', 'part_number', 'barcode', 'upc', 'asin', 'gtin', 'model number', 'catalog number'],
  category: ['category', 'product category', 'collection', 'type', 'department', 'segment', 'product type', 'item category', 'group', 'classification'],
  description: ['description', 'product description', 'item description', 'details', 'notes', 'product details', 'long description'],
  price: ['price', 'selling price', 'selling_price', 'unit price', 'unit_price', 'rate', 'mrp', 'retail price', 'cost', 'revenue per unit', 'list price', 'sale price', 'base price'],
  stock: ['stock', 'stock qty', 'stock_qty', 'inventory', 'inventory quantity', 'inventory count', 'inventory_count', 'quantity in stock', 'quantity_in_stock', 'qty available', 'quantity available', 'on hand', 'on_hand', 'available stock', 'current stock', 'inventory level', 'inventory_level', 'units available', 'units_available', 'on hand qty', 'on_hand_qty', 'available qty', 'available_qty', 'warehouse stock', 'warehouse_stock', 'in stock'],
  reorder_level: ['reorder level', 'reorder_level', 'minimum stock', 'min stock', 'safety stock', 'reorder point', 'min quantity'],
  customer_id: ['customer id', 'customer_id', 'client id', 'buyer id', 'cust id', 'cust_id'],
  customer_name: ['customer', 'customer name', 'customer_name', 'client', 'buyer', 'billing name', 'full name', 'full_name', 'consumer', 'account name', 'client name', 'client_name', 'buyer name', 'buyer_name', 'contact name', 'contact_name', 'customer full name', 'customer_full_name', 'ship to name', 'bill to name', 'purchaser'],
  customer_email: ['email', 'customer email', 'customer_email', 'billing email', 'buyer email', 'email address', 'contact email', 'e-mail', 'e mail', 'customer mail', 'customer_mail', 'mail', 'email id', 'email_id', 'user email'],
  customer_phone: ['phone', 'telephone', 'mobile', 'customer phone', 'billing phone', 'phone number', 'phone_number', 'contact number', 'cell', 'mobile number', 'tel'],
  customer_city: ['city', 'customer city', 'billing city', 'shipping city', 'town', 'location city', 'ship to city', 'bill to city'],
  customer_state: ['state', 'province', 'region', 'customer state', 'billing state', 'shipping state', 'ship to state', 'bill to state', 'territory'],
  acquisition_date: ['acquisition date', 'signup date', 'sign up date', 'registered at', 'registration date', 'created at', 'customer since', 'join date', 'joined'],
  order_id: ['order id', 'order_id', 'order number', 'order_number', 'order', 'invoice id', 'invoice number', 'invoice_number', 'transaction id', 'transaction_id', 'order ref', 'reference number', 'po number'],
  order_date: ['order date', 'order_date', 'date', 'created at', 'created_at', 'paid at', 'processed at', 'purchase date', 'transaction date', 'timestamp', 'sale date', 'invoice date', 'order placed', 'placed at', 'ordered on'],
  quantity: ['quantity', 'qty', 'qty ordered', 'items', 'units', 'lineitem quantity', 'units sold', 'order quantity', 'purchased quantity', 'ordered qty', 'qty_ordered', 'item count', 'pieces', 'no of items', 'number of items'],
  amount: ['amount', 'total', 'total amount', 'total_amount', 'order total', 'grand total', 'net sales', 'sales amount', 'sales_amount', 'revenue', 'order value', 'value', 'sales revenue', 'income', 'turnover', 'earnings', 'gross revenue', 'net revenue', 'total price', 'total cost', 'subtotal', 'sub total', 'net amount', 'gross amount', 'line total', 'invoice total', 'payment amount', 'total sales', 'total_sales', 'sales'],
  status: ['status', 'order status', 'payment status', 'fulfillment status', 'order state', 'delivery status', 'shipment status'],
  supplier_name: ['supplier', 'supplier name', 'vendor', 'vendor name', 'manufacturer', 'brand'],
};

// Blocked mapping pairs: these fields should NEVER be mapped to each other
const BLOCKED_PAIRS = [
  ['stock', 'sku'],        // stock is quantity, sku is identifier
  ['stock', 'product_id'], // stock is quantity, not an ID
  ['quantity', 'stock'],   // order qty vs inventory stock — context-dependent, handled by dataset name
];

// Fields that should NOT match generic single-word headers without context
const AMBIGUOUS_SINGLE_WORDS = new Set(['name', 'code', 'date', 'type', 'order', 'description']);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PREVIEW_ROWS = 100;

function _cleanHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/-/g, ' ');
}

function _compact(value) {
  return _cleanHeader(value).replace(/[^a-z0-9]/g, '');
}

function _safeFloat(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseFloat(String(value).replace(/,/g, '').replace(/\$/g, ''));
  return isNaN(parsed) ? null : parsed;
}

function _safeInt(value) {
  const number = _safeFloat(value);
  return number === null ? null : Math.round(number);
}

function _safeDate(value) {
  if (!value) return null;
  // If Excel serial number (numeric value representation of date)
  if (typeof value === 'number' && value > 30000 && value < 60000) {
    const date = new Date((value - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

function _isMissing(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function _isBlockedPair(field1, field2) {
  return BLOCKED_PAIRS.some(([a, b]) =>
    (a === field1 && b === field2) || (a === field2 && b === field1)
  );
}

function _scoreColumn(column, field) {
  const normalized = _cleanHeader(column);
  const compacted = _compact(column);

  // Blocked pair penalty: prevent stock mapping to sku or product_id
  if ((field === 'sku' || field === 'product_id') && (compacted === 'stock' || compacted === 'inventory' || normalized === 'stock qty' || normalized === 'inventory qty')) {
    return -100;
  }
  // Blocked pair penalty: prevent sales/revenue (amount) mapping to quantity
  if (field === 'quantity' && (compacted === 'sales' || compacted === 'revenue' || compacted === 'amount' || normalized === 'sales amount')) {
    return -100;
  }

  const aliases = ALIASES[field] || [];

  // Tier 1: Exact alias match (highest confidence)
  if (aliases.includes(normalized)) return 98;

  // Tier 2: Compact exact match (ignoring spaces/punctuation)
  if (aliases.some(alias => _compact(alias) === compacted)) return 96;

  // Tier 3: Containment matching — but require word-boundary awareness
  // Only match if a MULTI-WORD alias is contained, or if the header is contained in a multi-word alias
  for (const alias of aliases) {
    const compactAlias = _compact(alias);
    const aliasWordCount = _cleanHeader(alias).split(/\s+/).length;
    
    // Long alias contained in header (e.g., "product name" in "main product name")
    if (aliasWordCount >= 2 && compacted.includes(compactAlias)) return 90;
    
    // Header contained in long alias (e.g., "selling" in "selling price") — lower confidence
    if (aliasWordCount >= 2 && compactAlias.includes(compacted) && compacted.length >= 4) return 85;
    
    // Single-word alias matching single-word header — only if not ambiguous
    if (aliasWordCount === 1 && compactAlias === compacted && !AMBIGUOUS_SINGLE_WORDS.has(normalized)) return 96;
  }

  // Tier 4: Word overlap scoring
  const words = normalized.split(/\s+/).filter(Boolean);
  const aliasWords = new Set(aliases.flatMap(alias => _cleanHeader(alias).split(/\s+/)));
  const overlap = words.filter(word => aliasWords.has(word) && word.length > 2).length;
  const totalWords = words.length;
  
  if (overlap > 0) {
    // Higher score when more words match and total words are fewer
    const ratio = overlap / totalWords;
    if (ratio >= 0.5 && overlap >= 2) return 82;
    if (ratio >= 0.5) return 75;
    return Math.min(70, 50 + overlap * 10);
  }

  return 0;
}

export class ImportStore {
  createImport(sourceType, datasets, metadata = {}) {
    const importId = uuidv4().replace(/-/g, '');
    const folder = path.join(IMPORT_DIR, importId);
    fs.mkdirSync(folder, { recursive: true });

    const manifest = {
      import_id: importId,
      source_type: sourceType,
      datasets: [],
      metadata: metadata || {}
    };

    let totalRows = 0;
    Object.entries(datasets).forEach(([name, rows]) => {
      const fileName = `${_compact(name) || 'dataset'}.jsonl`;
      const filePath = path.join(folder, fileName);
      
      const lines = rows.map(r => JSON.stringify(r)).join('\n');
      fs.writeFileSync(filePath, lines, 'utf8');

      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      manifest.datasets.push({
        name,
        path: fileName,
        rows: rows.length,
        columns
      });
      totalRows += rows.length;
    });

    fs.writeFileSync(path.join(folder, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    
    // Save record to DB
    Import.create({
      id: importId,
      source_type: sourceType,
      dataset_count: Object.keys(datasets).length,
      row_count: totalRows,
      saved: false,
      metadata_json: JSON.stringify(metadata || {})
    });

    return importId;
  }

  load(importId) {
    const folder = path.join(IMPORT_DIR, importId);
    const manifestPath = path.join(folder, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Unknown import_id: ${importId}`);
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const datasets = {};
    manifest.datasets.forEach(item => {
      const filePath = path.join(folder, item.path);
      const content = fs.readFileSync(filePath, 'utf8');
      datasets[item.name] = content.split('\n').filter(Boolean).map(line => JSON.parse(line));
    });

    return { sourceType: manifest.source_type, datasets };
  }

  previews(importId) {
    const { datasets } = this.load(importId);
    return Object.entries(datasets).map(([name, rows]) => ({
      name,
      rows: rows.length,
      columns: rows.length > 0 ? Object.keys(rows[0]) : [],
      sample_rows: rows.slice(0, 10)
    }));
  }
}

const store = new ImportStore();

export class UniversalDataIngestionEngine {
  constructor() {
    this.store = store;
    this.production = new ProductionImportService(store);
  }

  detectFileSource(fileName, contentType = '') {
    const suffix = path.extname(fileName).toLowerCase();
    if (suffix === '.csv' || suffix === '.tsv') return 'csv';
    if (suffix === '.xlsx' || suffix === '.xls' || suffix === '.xlsm') return 'excel';
    if (suffix === '.json') return 'json';
    if (suffix === '.txt') return 'business_export';
    if (contentType && contentType.includes('json')) return 'json';
    return 'business_export';
  }

  parseUploadedFile(sourcePath, originalName, contentType = '') {
    const sourceType = this.detectFileSource(originalName, contentType);
    const suffix = path.extname(originalName).toLowerCase();

    // Excel files are binary — parse with SheetJS directly from disk
    if (suffix === '.xlsx' || suffix === '.xls' || suffix === '.xlsm') {
      const workbook = XLSX.readFile(sourcePath, { cellDates: true, raw: false });
      const datasets = {};
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        if (sheetData.length > 0) {
          datasets[sheetName] = sheetData;
        }
      });
      return { sourceType: 'excel', datasets };
    }

    // Text-based formats — safe to read as UTF-8
    const contentText = fs.readFileSync(sourcePath, 'utf8');

    if (suffix === '.csv') {
      const parsed = Papa.parse(contentText, { header: true, skipEmptyLines: true });
      return { sourceType, datasets: { csv: parsed.data } };
    }

    if (suffix === '.tsv') {
      const parsed = Papa.parse(contentText, { delimiter: '\t', header: true, skipEmptyLines: true });
      return { sourceType, datasets: { tsv: parsed.data } };
    }

    if (suffix === '.json') {
      const payload = JSON.parse(contentText);
      return { sourceType: 'json', datasets: this._framesFromJson(payload) };
    }

    // Fallback: sniff delimited business exports
    try {
      const parsed = Papa.parse(contentText, { header: true, skipEmptyLines: true });
      return { sourceType, datasets: { business_export: parsed.data } };
    } catch {
      return { sourceType, datasets: { business_export: [] } };
    }
  }

  _framesFromJson(payload) {
    if (Array.isArray(payload)) {
      return { json: payload.filter(r => r && typeof r === 'object') };
    }
    if (payload && typeof payload === 'object') {
      const datasets = {};
      let hasArrays = false;
      Object.entries(payload).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          datasets[key] = value.filter(r => r && typeof r === 'object');
          hasArrays = true;
        }
      });
      if (hasArrays) return datasets;
      return { json: [payload] };
    }
    throw new Error('JSON import must contain an object or an array of records.');
  }

  uploadFile(filePath, originalName, contentType = '') {
    const { sourceType, datasets } = this.parseUploadedFile(filePath, originalName, contentType);
    const importId = this.store.createImport(sourceType, datasets, { file_name: originalName });
    return {
      importId,
      sourceType,
      previews: Object.entries(datasets).map(([name, rows]) => ({
        name,
        rows: rows.length,
        columns: rows.length > 0 ? Object.keys(rows[0]) : [],
        sample_rows: rows.slice(0, 10)
      }))
    };
  }

  async discoverDatabase(connection) {
    const { source_type, host, port, database, service_name, username, password, sqlite_path } = connection;
    
    let dbSequelize;
    let datasets = {};

    if (source_type === 'sqlite') {
      if (!sqlite_path) throw new Error('sqlite_path is required for SQLite databases.');
      dbSequelize = new Sequelize({ dialect: 'sqlite', storage: sqlite_path, logging: false });
    } else if (source_type === 'oracle') {
      // Connect to Oracle via node-oracledb
      const service = service_name || database || '';
      const connStr = `${host}:${port || 1521}/${service}`;
      
      const conn = await oracledb.getConnection({
        user: username,
        password: password,
        connectString: connStr,
        externalAuth: false
      });

      // Fetch tables list
      const userTables = await conn.execute(`SELECT table_name FROM user_tables`);
      for (const row of userTables.rows) {
        const tableName = row[0];
        if (connection.selected_tables && !connection.selected_tables.includes(tableName)) continue;
        
        let query = `SELECT * FROM "${tableName}"`;
        if (!connection.selected_tables) {
          query += ` FETCH FIRST ${PREVIEW_ROWS} ROWS ONLY`;
        }
        
        const res = await conn.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        datasets[tableName] = res.rows;
      }
      await conn.close();
    } else {
      // Postgres, MySQL, SQL Server
      const dialect = source_type === 'sql_server' ? 'mssql' : source_type;
      dbSequelize = new Sequelize(database, username, password, {
        host,
        port: port || (source_type === 'mysql' ? 3306 : source_type === 'postgresql' ? 5432 : 1433),
        dialect,
        logging: false,
        dialectOptions: source_type === 'sql_server' ? { options: { trustServerCertificate: true } } : {}
      });
    }

    if (dbSequelize) {
      await dbSequelize.authenticate();
      const queryInterface = dbSequelize.getQueryInterface();
      const tables = await queryInterface.showAllTables();
      
      for (const table of tables) {
        let tableName = typeof table === 'object' && table.tableName ? table.tableName : String(table);
        
        if (connection.selected_tables && !connection.selected_tables.includes(tableName)) continue;
        
        let query = `SELECT * FROM ${dbSequelize.getQueryInterface().quoteIdentifier(tableName)}`;
        if (!connection.selected_tables) {
          if (source_type === 'sql_server') {
            query = `SELECT TOP ${PREVIEW_ROWS} * FROM ${dbSequelize.getQueryInterface().quoteIdentifier(tableName)}`;
          } else {
            query += ` LIMIT ${PREVIEW_ROWS}`;
          }
        }
        
        const [rows] = await dbSequelize.query(query);
        datasets[tableName] = rows;
      }
      await dbSequelize.close();
    }

    const cleanConnection = { ...connection };
    delete cleanConnection.password;
    const importId = this.store.createImport(source_type, datasets, { connection: cleanConnection });
    
    return {
      importId,
      sourceType: source_type,
      previews: Object.entries(datasets).map(([name, rows]) => ({
        name,
        rows: rows.length,
        columns: rows.length > 0 ? Object.keys(rows[0]) : [],
        sample_rows: rows.slice(0, 10)
      }))
    };
  }

  async importApiSource(connection) {
    if (connection.source_type === 'google_sheets') {
      return this._importGoogleSheets(connection);
    }
    if (connection.source_type === 'woocommerce') {
      return this._importWooCommerce(connection);
    }
    if (connection.source_type === 'shopify') {
      return this._importShopify(connection);
    }
    throw new Error(`Unsupported API source: ${connection.source_type}`);
  }

  async _importGoogleSheets(connection) {
    const { spreadsheet_id, worksheet, credentials_json } = connection;
    if (!credentials_json || !spreadsheet_id) {
      throw new Error('Google Sheets imports require credentials_json and spreadsheet_id.');
    }

    const auth = new google.auth.JWT(
      credentials_json.client_email,
      null,
      credentials_json.private_key,
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    
    let sheetsToFetch = [];
    if (worksheet) {
      sheetsToFetch.push(worksheet);
    } else {
      const meta = await sheets.spreadsheets.get({ spreadsheetId: spreadsheet_id });
      sheetsToFetch = meta.data.sheets.map(s => s.properties.title);
    }

    const datasets = {};
    for (const title of sheetsToFetch) {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheet_id,
        range: title
      });
      const rows = res.data.values || [];
      if (rows.length > 0) {
        const [headers, ...dataRows] = rows;
        datasets[title] = dataRows.map(r => {
          const rowObj = {};
          headers.forEach((h, idx) => {
            rowObj[h] = r[idx] ?? '';
          });
          return rowObj;
        });
      }
    }

    const importId = this.store.createImport('google_sheets', datasets, { spreadsheet_id });
    return {
      importId,
      sourceType: 'google_sheets',
      previews: Object.entries(datasets).map(([name, rows]) => ({
        name,
        rows: rows.length,
        columns: rows.length > 0 ? Object.keys(rows[0]) : [],
        sample_rows: rows.slice(0, 10)
      }))
    };
  }

  async _importWooCommerce(connection) {
    const { url, api_key, api_secret } = connection;
    if (!url || !api_key || !api_secret) {
      throw new Error('WooCommerce imports require url, api_key, and api_secret.');
    }

    const api = new WooCommerceRestApi({
      url,
      consumerKey: api_key,
      consumerSecret: api_secret,
      version: 'wc/v3'
    });

    const products = await api.get('products', { per_page: 100 });
    const orders = await api.get('orders', { per_page: 100 });
    const customers = await api.get('customers', { per_page: 100 });

    const datasets = {
      products: products.data,
      orders: orders.data,
      customers: customers.data
    };

    const importId = this.store.createImport('woocommerce', datasets, { url });
    return {
      importId,
      sourceType: 'woocommerce',
      previews: Object.entries(datasets).map(([name, rows]) => ({
        name,
        rows: rows.length,
        columns: rows.length > 0 ? Object.keys(rows[0]) : [],
        sample_rows: rows.slice(0, 10)
      }))
    };
  }

  async _importShopify(connection) {
    const { url, access_token } = connection;
    if (!url || !access_token) {
      throw new Error('Shopify imports require url and access_token.');
    }

    const cleanUrl = url.replace(/\/$/, '');
    const headers = {
      'X-Shopify-Access-Token': access_token,
      'Content-Type': 'application/json'
    };

    const datasets = {};
    for (const resource of ['products', 'orders', 'customers']) {
      const response = await fetch(`${cleanUrl}/admin/api/2026-04/${resource}.json`, { headers });
      if (!response.ok) {
        throw new Error(`Shopify API failed for ${resource}: ${response.statusText}`);
      }
      const data = await response.json();
      datasets[resource] = data[resource] || [];
    }

    const importId = this.store.createImport('shopify', datasets, { url });
    return {
      importId,
      sourceType: 'shopify',
      previews: Object.entries(datasets).map(([name, rows]) => ({
        name,
        rows: rows.length,
        columns: rows.length > 0 ? Object.keys(rows[0]) : [],
        sample_rows: rows.slice(0, 10)
      }))
    };
  }

  _inferFieldFromValues(values, datasetName) {
    const nonEmpty = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
    if (nonEmpty.length === 0) return null;

    // 1. Check Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailMatches = nonEmpty.filter(v => emailRegex.test(String(v).trim()));
    if (emailMatches.length / nonEmpty.length > 0.8) {
      return { field: 'customer_email', confidence: 92 };
    }

    // 2. Check Phone
    const phoneRegex = /^\+?[0-9\s\-().]{7,20}$/;
    const phoneMatches = nonEmpty.filter(v => phoneRegex.test(String(v).trim()));
    const hasDigits = nonEmpty.filter(v => /[0-9]/.test(String(v)));
    if (phoneMatches.length / nonEmpty.length > 0.8 && hasDigits.length / nonEmpty.length > 0.8) {
      return { field: 'customer_phone', confidence: 90 };
    }

    // 3. Check Date
    const dateMatches = nonEmpty.filter(v => {
      const s = String(v).trim();
      if (s.length < 6 || s.length > 30) return false;
      if (typeof v === 'number' && v > 30000 && v < 60000) return true; // Excel serial date
      if (/^[0-9]+$/.test(s)) return false;
      const parsed = Date.parse(s);
      return !isNaN(parsed);
    });
    if (dateMatches.length / nonEmpty.length > 0.8) {
      return { field: 'order_date', confidence: 90 };
    }

    // 4. Check Price / Amount (Currency / numbers with decimal places)
    const numericMatches = nonEmpty.filter(v => {
      if (typeof v === 'number') return true;
      const s = String(v).trim().replace(/[\$,]/g, '');
      return !isNaN(parseFloat(s));
    });
    if (numericMatches.length / nonEmpty.length > 0.8) {
      const hasDecimals = nonEmpty.some(v => {
        const num = parseFloat(String(v).replace(/[\$,]/g, ''));
        return !isNaN(num) && num % 1 !== 0;
      });

      if (hasDecimals) {
        const normDataset = datasetName.toLowerCase();
        if (normDataset.includes('order') || normDataset.includes('revenue') || normDataset.includes('sale')) {
          return { field: 'amount', confidence: 90 };
        }
        return { field: 'price', confidence: 90 };
      } else {
        const normDataset = datasetName.toLowerCase();
        if (normDataset.includes('order') || normDataset.includes('sale')) {
          return { field: 'quantity', confidence: 88 };
        }
        if (normDataset.includes('inventory') || normDataset.includes('stock')) {
          return { field: 'stock', confidence: 90 };
        }
      }
    }

    // 5. Check SKU
    const skuRegex = /^[A-Z0-9_\-]{3,15}$/i;
    const skuMatches = nonEmpty.filter(v => skuRegex.test(String(v).trim()));
    const uniqueVals = new Set(nonEmpty.map(v => String(v).trim()));
    if (skuMatches.length / nonEmpty.length > 0.8 && uniqueVals.size / nonEmpty.length > 0.7) {
      return { field: 'sku', confidence: 90 };
    }

    return null;
  }

  mapImport(importId, manualMappings = null) {
    const { datasets } = this.store.load(importId);
    const automatic = [];

    Object.entries(datasets).forEach(([datasetName, rows]) => {
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      headers.forEach(column => {
        let bestField = null;
        let bestScore = 0;

        Object.keys(FIELD_LABELS).forEach(field => {
          let score = _scoreColumn(column, field);
          const [entity] = FIELD_LABELS[field];
          
          const normDataset = datasetName.toLowerCase();
          const normEntity = entity.toLowerCase();
          if (normDataset.includes(normEntity) || normEntity.includes(normDataset) || 
              (normDataset === 'orders' && normEntity === 'revenue') ||
              (normDataset === 'inventory' && normEntity === 'products')) {
            if (score > 0) score += 15;
          }
          
          if (score > bestScore) {
            bestField = field;
            bestScore = score;
          }
        });

        // Run Schema Inference if score is low
        if (bestScore < 70 && rows.length > 0) {
          const sampleValues = rows.slice(0, 30).map(r => r[column]);
          const inferred = this._inferFieldFromValues(sampleValues, datasetName);
          if (inferred) {
            bestField = inferred.field;
            bestScore = inferred.confidence;
          }
        }

        const [entity, label] = bestField ? FIELD_LABELS[bestField] : ['Unmapped', 'Unmapped'];
        automatic.push({
          dataset: datasetName,
          source_column: column,
          entity: bestScore > 0 ? entity : 'Unmapped',
          target_field: bestScore > 0 ? bestField : null,
          display_name: bestScore > 0 ? label : 'Unmapped',
          confidence: bestScore
        });
      });
    });

    const resolved = this._mergeManualMappings(automatic, manualMappings);
    const entities = {};
    ['Products', 'Customers', 'Orders', 'Inventory', 'Suppliers', 'Revenue'].forEach(name => {
      entities[name.toLowerCase()] = resolved.some(item => item.entity === name);
    });

    const confidence = resolved.length > 0
      ? Math.round(resolved.reduce((sum, item) => sum + item.confidence, 0) / resolved.length)
      : 0;

    return { mappings: resolved, detectedEntities: entities, confidence };
  }

  _mergeManualMappings(automatic, manual) {
    if (!manual || manual.length === 0) return automatic;
    const manualMap = new Map(manual.map(item => [`${item.dataset}|${item.source_column}`, item]));
    return automatic.map(item => {
      const key = `${item.dataset}|${item.source_column}`;
      return manualMap.has(key) ? manualMap.get(key) : item;
    });
  }

  _columnMap(mappings, dataset) {
    const map = {};
    mappings.forEach(item => {
      if (item.dataset === dataset && item.target_field) {
        map[item.target_field] = item.source_column;
      }
    });
    return map;
  }

  validateImport(importId, mappings = null) {
    const { datasets } = this.store.load(importId);
    const { mappings: resolved } = this.mapImport(importId, mappings);
    const issues = [];

    Object.entries(datasets).forEach(([datasetName, rows]) => {
      const colMap = this._columnMap(resolved, datasetName);
      const rowCount = rows.length;

      // ── Schema-level checks (one per missing field, not per row) ──
      const detectedEntities = new Set(
        resolved.filter(m => m.dataset === datasetName && m.target_field)
          .map(m => FIELD_LABELS[m.target_field]?.[0])
      );

      const mandatoryFields = [
        ['product_name', 'Product Name', 'Products'],
        ['sku', 'SKU', 'Products'],
        ['price', 'Price', 'Products'],
        ['customer_name', 'Customer Name', 'Customers'],
        ['customer_email', 'Customer Email', 'Customers'],
      ];

      mandatoryFields.forEach(([field, label, entity]) => {
        // Only warn about missing fields if we detect data for that entity
        if (!colMap[field] && detectedEntities.has(entity)) {
          issues.push({
            dataset: datasetName,
            column: label,
            severity: 'warning',
            type: 'missing_mapping',
            message: `No column mapped to ${label}.`,
            suggested_fix: `Map the source column containing ${label.toLowerCase()}.`
          });
        }
      });

      // ── Auto-detected equivalent fields (info only) ──
      resolved.forEach(item => {
        if (item.dataset === datasetName && item.target_field) {
          const targetLabel = FIELD_LABELS[item.target_field]?.[1] || item.target_field;
          const cleanSource = _compact(item.source_column);
          const cleanTarget = _compact(targetLabel);
          if (cleanSource !== cleanTarget && item.confidence >= 90) {
            issues.push({
              dataset: datasetName,
              column: item.source_column,
              severity: 'info',
              type: 'auto_mapped',
              message: `'${item.source_column}' ➔ ${targetLabel} (${item.confidence}% confidence).`,
              suggested_fix: 'Verify this mapping in the dropdown selector below.'
            });
          }
        }
      });

      // ── Low-confidence mapping warnings ──
      resolved.forEach(item => {
        if (item.dataset === datasetName && item.target_field && item.confidence > 0 && item.confidence < 90) {
          const targetLabel = FIELD_LABELS[item.target_field]?.[1] || item.target_field;
          issues.push({
            dataset: datasetName,
            column: item.source_column,
            severity: 'suggestion',
            type: 'low_confidence',
            message: `'${item.source_column}' mapped to ${targetLabel} with ${item.confidence}% confidence — needs review.`,
            suggested_fix: 'Verify or change this mapping in the dropdown selector.'
          });
        }
      });

      // ── Performance: sample rows for large datasets ──
      const SAMPLE_SIZE = 1000;
      const sampleRows = rowCount > SAMPLE_SIZE * 2
        ? (() => {
            const indices = new Set();
            // Always include first 100 and last 100
            for (let i = 0; i < Math.min(100, rowCount); i++) indices.add(i);
            for (let i = Math.max(0, rowCount - 100); i < rowCount; i++) indices.add(i);
            // Random sample for the rest
            while (indices.size < SAMPLE_SIZE) indices.add(Math.floor(Math.random() * rowCount));
            return [...indices].sort((a, b) => a - b);
          })()
        : rows.map((_, i) => i);

      // ── Aggregated value checks ──
      const counters = {
        missing_values: {},    // field -> { count, sample_rows }
        invalid_price: { count: 0, sample_rows: [] },
        negative_price: { count: 0, sample_rows: [] },
        invalid_amount: { count: 0, sample_rows: [] },
        invalid_stock: { count: 0, sample_rows: [] },
        invalid_quantity: { count: 0, sample_rows: [] },
        invalid_reorder: { count: 0, sample_rows: [] },
        invalid_date: { count: 0, sample_rows: [] },
        invalid_email: { count: 0, sample_rows: [] },
        invalid_phone: { count: 0, sample_rows: [] },
        missing_name_with_email: { count: 0, sample_rows: [] },
      };

      const _track = (key, rowNum) => {
        const c = counters[key];
        c.count++;
        if (c.sample_rows.length < 5) c.sample_rows.push(rowNum);
      };

      const _trackField = (field, rowNum) => {
        if (!counters.missing_values[field]) counters.missing_values[field] = { count: 0, sample_rows: [] };
        const c = counters.missing_values[field];
        c.count++;
        if (c.sample_rows.length < 5) c.sample_rows.push(rowNum);
      };

      // ── Duplicate SKU detection (full scan, not sampled) ──
      const skuDuplicates = {};
      if (colMap['sku']) {
        rows.forEach((row, index) => {
          const skuVal = String(row[colMap['sku']] || '').trim();
          if (skuVal !== '') {
            if (!skuDuplicates[skuVal]) skuDuplicates[skuVal] = [];
            skuDuplicates[skuVal].push(index + 2);
          }
        });
      }

      // Emit grouped duplicate SKU issue
      const dupEntries = Object.entries(skuDuplicates).filter(([, rows]) => rows.length > 1);
      if (dupEntries.length > 0) {
        const totalDupRows = dupEntries.reduce((s, [, r]) => s + r.length, 0);
        issues.push({
          dataset: datasetName,
          column: colMap['sku'],
          severity: 'warning',
          type: 'duplicate_sku',
          message: `${dupEntries.length} duplicate SKU${dupEntries.length > 1 ? 's' : ''} found across ${totalDupRows} rows.`,
          suggested_fix: 'Merge duplicate rows, keep first occurrence, or generate unique SKUs.',
          duplicates: dupEntries.slice(0, 20).map(([sku, rows]) => ({ sku, rows: rows.slice(0, 10) })),
          resolution_options: ['merge', 'keep_first', 'generate_unique', 'ignore']
        });
      }

      // ── Row-level checks (aggregated) ──
      for (const idx of sampleRows) {
        const row = rows[idx];
        if (!row) continue;
        const rowNum = idx + 2;

        // Missing required values
        for (const [field] of [['product_name'], ['sku'], ['customer_name']]) {
          if (colMap[field] && _isMissing(row[colMap[field]])) {
            _trackField(field, rowNum);
          }
        }

        // Price validation
        if (colMap['price'] && !_isMissing(row[colMap['price']])) {
          const price = _safeFloat(row[colMap['price']]);
          if (price === null) _track('invalid_price', rowNum);
          else if (price < 0) _track('negative_price', rowNum);
        }

        // Amount validation
        if (colMap['amount'] && !_isMissing(row[colMap['amount']])) {
          if (_safeFloat(row[colMap['amount']]) === null) _track('invalid_amount', rowNum);
        }

        // Stock validation
        if (colMap['stock'] && !_isMissing(row[colMap['stock']])) {
          if (_safeInt(row[colMap['stock']]) === null) _track('invalid_stock', rowNum);
        }

        // Quantity validation
        if (colMap['quantity'] && !_isMissing(row[colMap['quantity']])) {
          if (_safeInt(row[colMap['quantity']]) === null) _track('invalid_quantity', rowNum);
        }

        // Reorder level validation
        if (colMap['reorder_level'] && !_isMissing(row[colMap['reorder_level']])) {
          if (_safeInt(row[colMap['reorder_level']]) === null) _track('invalid_reorder', rowNum);
        }

        // Date validation
        if (colMap['order_date'] && !_isMissing(row[colMap['order_date']])) {
          if (_safeDate(row[colMap['order_date']]) === null) _track('invalid_date', rowNum);
        }
        if (colMap['acquisition_date'] && !_isMissing(row[colMap['acquisition_date']])) {
          if (_safeDate(row[colMap['acquisition_date']]) === null) _track('invalid_date', rowNum);
        }

        // Email validation
        if (colMap['customer_email']) {
          const email = String(row[colMap['customer_email']] || '').trim();
          if (email !== '' && !EMAIL_RE.test(email)) _track('invalid_email', rowNum);
        }

        // Phone validation
        if (colMap['customer_phone']) {
          const phone = String(row[colMap['customer_phone']] || '').trim();
          if (phone !== '') {
            const phoneClean = phone.replace(/[^0-9+]/g, '');
            if (phoneClean.length < 5 || /[^0-9+\s\-().]/.test(phone)) _track('invalid_phone', rowNum);
          }
        }

        // Missing customer name when email exists
        if (colMap['customer_name'] && colMap['customer_email']) {
          const email = String(row[colMap['customer_email']] || '').trim();
          const name = String(row[colMap['customer_name']] || '').trim();
          if (email && !name) _track('missing_name_with_email', rowNum);
        }
      }

      // ── Emit aggregated issues ──
      const _rowHint = (c) => c.sample_rows.length > 0
        ? ` (rows ${c.sample_rows.join(', ')}${c.count > c.sample_rows.length ? '…' : ''})`
        : '';

      const fieldLabels = { product_name: 'Product Name', sku: 'SKU', customer_name: 'Customer Name' };
      for (const [field, data] of Object.entries(counters.missing_values)) {
        if (data.count > 0) {
          issues.push({
            dataset: datasetName,
            column: colMap[field],
            severity: 'warning',
            type: 'missing_values',
            message: `Missing ${fieldLabels[field] || field} in ${data.count} of ${rowCount} rows${_rowHint(data)}.`,
            suggested_fix: `Fill missing values or remove incomplete rows.`,
            affected_count: data.count,
            sample_rows: data.sample_rows,
          });
        }
      }

      const aggChecks = [
        ['invalid_price', 'price', 'Invalid price values', 'Use valid decimal numbers for price.'],
        ['negative_price', 'price', 'Negative price values', 'Use non-negative numeric prices.'],
        ['invalid_amount', 'amount', 'Invalid amount values', 'Use valid decimal numbers for amount.'],
        ['invalid_stock', 'stock', 'Invalid stock values', 'Use valid integers for stock quantity.'],
        ['invalid_quantity', 'quantity', 'Invalid quantity values', 'Use valid integers for order quantity.'],
        ['invalid_reorder', 'reorder_level', 'Invalid reorder level values', 'Use valid integers for reorder level.'],
        ['invalid_date', 'order_date', 'Invalid date formats', 'Use standard date format like YYYY-MM-DD.'],
        ['invalid_email', 'customer_email', 'Invalid email addresses', 'Use valid email address formats.'],
        ['invalid_phone', 'customer_phone', 'Invalid phone numbers', 'Use standard numeric phone number formats.'],
        ['missing_name_with_email', 'customer_name', 'Customers with email but missing name', 'Add customer names or map the correct source column.'],
      ];

      for (const [key, field, label, fix] of aggChecks) {
        const c = counters[key];
        if (c.count > 0) {
          issues.push({
            dataset: datasetName,
            column: colMap[field] || field,
            severity: 'warning',
            type: key,
            message: `${label}: ${c.count} of ${rowCount} rows${_rowHint(c)}.`,
            suggested_fix: fix,
            affected_count: c.count,
            sample_rows: c.sample_rows,
          });
        }
      }
    });

    // Cap total issues at 50
    return issues.slice(0, 50);
  }

  suggestAutoFixes(importId, mappings = null) {
    const { datasets } = this.store.load(importId);
    const { mappings: resolved } = this.mapImport(importId, mappings);
    const fixes = [];

    Object.entries(datasets).forEach(([datasetName, rows]) => {
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      const currentMap = this._columnMap(resolved, datasetName);

      // Find unmapped or low-confidence columns and suggest better mappings
      resolved.forEach(item => {
        if (item.dataset !== datasetName) return;

        // Check if there's a better mapping available
        if (!item.target_field || item.confidence < 90) {
          const sampleValues = rows.slice(0, 30).map(r => r[item.source_column]);
          const inferred = this._inferFieldFromValues(sampleValues, datasetName);

          if (inferred && inferred.confidence > (item.confidence || 0)) {
            const targetLabel = FIELD_LABELS[inferred.field]?.[1] || inferred.field;
            fixes.push({
              dataset: datasetName,
              source_column: item.source_column,
              current_field: item.target_field,
              current_label: item.target_field ? (FIELD_LABELS[item.target_field]?.[1] || item.target_field) : 'Unmapped',
              suggested_field: inferred.field,
              suggested_label: targetLabel,
              confidence: inferred.confidence,
              reason: `Value-based inference detected ${targetLabel.toLowerCase()} pattern in column data.`
            });
          }
        }
      });

      // Suggest fields that are unmapped but could be inferred
      const mappedFields = new Set(resolved.filter(m => m.dataset === datasetName && m.target_field).map(m => m.target_field));
      const requiredFields = ['product_name', 'sku', 'price', 'stock', 'customer_name', 'customer_email', 'amount', 'order_date', 'quantity'];

      for (const field of requiredFields) {
        if (mappedFields.has(field)) continue;

        // Try to find an unmapped column that could serve this field
        for (const header of headers) {
          const alreadyMapped = resolved.find(m => m.dataset === datasetName && m.source_column === header && m.target_field);
          if (alreadyMapped) continue;

          const score = _scoreColumn(header, field);
          if (score >= 70) {
            const targetLabel = FIELD_LABELS[field]?.[1] || field;
            fixes.push({
              dataset: datasetName,
              source_column: header,
              current_field: null,
              current_label: 'Unmapped',
              suggested_field: field,
              suggested_label: targetLabel,
              confidence: score,
              reason: `Column name '${header}' closely matches ${targetLabel}.`
            });
          }
        }
      }
    });

    return { fixes };
  }

  generateMissingFields(importId, fieldsToGenerate = []) {
    const { datasets } = this.store.load(importId);
    const generated = {};
    const FIRST_NAMES = ['Alice', 'Bob', 'Carol', 'David', 'Eva', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack', 'Karen', 'Leo', 'Maya', 'Noah', 'Olivia', 'Paul', 'Quinn', 'Rose', 'Sam', 'Tina'];
    const LAST_NAMES = ['Johnson', 'Smith', 'White', 'Brown', 'Martinez', 'Lee', 'Kim', 'Chen', 'Davis', 'Wilson', 'Taylor', 'Moore', 'Clark', 'Hall', 'Young'];
    const DOMAINS = ['gmail.com', 'outlook.com', 'yahoo.com', 'company.com', 'business.org'];

    Object.entries(datasets).forEach(([datasetName, rows]) => {
      rows.forEach((row, index) => {
        for (const field of fieldsToGenerate) {
          if (field === 'customer_name' && (!row.customer_name && !row['Customer Name'] && !row.name && !row.Name)) {
            const first = FIRST_NAMES[index % FIRST_NAMES.length];
            const last = LAST_NAMES[index % LAST_NAMES.length];
            row['Customer Name'] = `${first} ${last}`;
            generated.customer_name = (generated.customer_name || 0) + 1;
          }
          if (field === 'customer_email' && (!row.customer_email && !row['Customer Email'] && !row.email && !row.Email)) {
            const name = (row['Customer Name'] || row.customer_name || `user${index}`).toLowerCase().replace(/\s+/g, '.');
            row['Customer Email'] = `${name}@${DOMAINS[index % DOMAINS.length]}`;
            generated.customer_email = (generated.customer_email || 0) + 1;
          }
          if (field === 'sku' && (!row.sku && !row.SKU && !row['Product SKU'])) {
            row['SKU'] = `GEN-${String(index + 1).padStart(4, '0')}`;
            generated.sku = (generated.sku || 0) + 1;
          }
          if (field === 'stock' && (!row.stock && !row.Stock && !row['Inventory'])) {
            row['Stock'] = Math.floor(Math.random() * 500) + 10;
            generated.stock = (generated.stock || 0) + 1;
          }
        }
      });

      // Persist updated rows
      const folder = path.join(IMPORT_DIR, importId);
      const manifestPath = path.join(folder, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const dsEntry = manifest.datasets.find(d => d.name === datasetName);
      if (dsEntry) {
        const filePath = path.join(folder, dsEntry.path);
        const lines = rows.map(r => JSON.stringify(r)).join('\n');
        fs.writeFileSync(filePath, lines, 'utf8');
        dsEntry.columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
      }
    });

    return { generated };
  }

  normalizeImport(importId, mappings = null) {
    const { datasets } = this.store.load(importId);
    const { mappings: resolved } = this.mapImport(importId, mappings);
    
    const products = {};
    const customers = {};
    const orders = {};
    const inventory = {};

    Object.entries(datasets).forEach(([datasetName, rows]) => {
      const colMap = this._columnMap(resolved, datasetName);
      
      rows.forEach((row, index) => {
        const get = (field) => colMap[field] ? row[colMap[field]] : null;
        
        const productName = String(get('product_name') || '').trim();
        const sku = String(get('sku') || '').trim();
        
        if (productName || sku) {
          const productKey = sku || productName.toLowerCase();
          const price = _safeFloat(get('price'));
          const stock = _safeInt(get('stock'));
          
          if (!products[productKey] && productName) {
            products[productKey] = {
              id: String(get('product_id') || `p_${productKey}`),
              name: productName,
              sku,
              category: String(get('category') || '').trim(),
              price,
              stock,
              source_import_id: importId
            };
          }

          if (productName && stock !== null) {
            inventory[productKey] = {
              id: `inv_${productKey}`,
              product: productName,
              stock,
              reorder_level: _safeInt(get('reorder_level')) || 5,
              source_import_id: importId
            };
          }
        }

        const customerName = String(get('customer_name') || '').trim();
        const customerEmail = String(get('customer_email') || '').trim().toLowerCase();
        
        if (customerName || customerEmail) {
          const customerKey = customerEmail || customerName.toLowerCase();
          if (!customers[customerKey]) {
            customers[customerKey] = {
              id: String(get('customer_id') || `c_${customerKey}`),
              name: customerName,
              email: customerEmail,
              phone: String(get('customer_phone') || '').trim(),
              city: String(get('customer_city') || '').trim(),
              state: String(get('customer_state') || '').trim(),
              acquisition_date: _safeDate(get('acquisition_date')) || new Date().toISOString().split('T')[0],
              source_import_id: importId
            };
          }
        }

        const orderId = String(get('order_id') || '').trim();
        const quantity = _safeInt(get('quantity'));
        const amount = _safeFloat(get('amount'));
        const status = String(get('status') || '').trim();
        const orderDate = _safeDate(get('order_date')) || new Date().toISOString().split('T')[0];

        if (orderId || quantity !== null || amount !== null || status) {
          const orderKey = orderId || `ord_${index}_${orderDate}`;
          orders[orderKey] = {
            id: orderKey,
            customer_id: customers[customerEmail || customerName.toLowerCase()]?.id || null,
            customer: customerName || customerEmail,
            product: productName || sku,
            quantity: quantity || 1,
            amount: amount || 0,
            order_date: orderDate,
            status: status || 'Delivered',
            source_import_id: importId
          };
        }
      });
    });

    return {
      products: Object.values(products),
      customers: Object.values(customers),
      orders: Object.values(orders),
      inventory: Object.values(inventory)
    };
  }

  async runProductionImport(importId, mappings = null, options = {}) {
    return this.production.runFromSession(importId, mappings, options);
  }

  async getImportReport(importId) {
    return this.production.getReport(importId);
  }

  async saveImport(importId, mappings = null, replaceExisting = false) {
    const productionResult = await this.production.runFromSession(importId, mappings);
    const saved = await this.production.persist(importId, productionResult, replaceExisting);
    await this.recalculateCustomerAcquisition();
    return saved;
  }

  async recalculateCustomerAcquisition() {
    // Clear out acquisition table
    await CustomerAcquisition.destroy({ where: {}, truncate: true });

    // Execute SQLite sub-query to recalculate first purchases and locational acquisition
    await sequelize.query(`
      WITH order_matches AS (
          SELECT
              c.id AS customer_id,
              COALESCE(o.order_date, date(o.created_at)) AS first_order_date,
              COALESCE(o.amount, 0) AS first_order_value,
              ROW_NUMBER() OVER (
                  PARTITION BY c.id
                  ORDER BY COALESCE(o.order_date, date(o.created_at), date('now')), o.created_at
              ) AS rn
          FROM customers c
          LEFT JOIN orders o
            ON o.customer_id = c.id
            OR lower(COALESCE(o.customer, '')) = lower(COALESCE(c.name, ''))
            OR lower(COALESCE(o.customer, '')) = lower(COALESCE(c.email, ''))
      )
      INSERT INTO customer_acquisition (
          customer_id,
          customer_name,
          acquisition_date,
          first_order_date,
          first_order_value,
          acquisition_source,
          location,
          created_at,
          updated_at
      )
      SELECT
          c.id,
          c.name,
          COALESCE(c.acquisition_date, om.first_order_date, date(c.created_at), date('now')) AS acquisition_date,
          om.first_order_date,
          COALESCE(om.first_order_value, 0),
          COALESCE(c.source_import_id, 'direct'),
          trim(COALESCE(c.city, '') || CASE WHEN COALESCE(c.city, '') != '' AND COALESCE(c.state, '') != '' THEN ', ' ELSE '' END || COALESCE(c.state, '')),
          datetime('now'),
          datetime('now')
      FROM customers c
      LEFT JOIN order_matches om ON om.customer_id = c.id AND om.rn = 1
      WHERE c.id IS NOT NULL
    `);
  }

  async customerAcquisition() {
    await this.recalculateCustomerAcquisition();
    const records = await CustomerAcquisition.findAll({ order: [['acquisition_date', 'ASC']] });
    return {
      records: records.map(r => ({
        customer_id: r.customer_id,
        customer_name: r.customer_name,
        acquisition_date: r.acquisition_date,
        first_order_date: r.first_order_date,
        first_order_value: r.first_order_value,
        acquisition_source: r.acquisition_source,
        location: r.location
      })),
      total_acquired_customers: records.length
    };
  }

  async customerAcquisitionGrowth(granularity = 'month') {
    await this.recalculateCustomerAcquisition();
    const cleanGranularity = ['day', 'week', 'month', 'year'].includes(granularity) ? granularity : 'month';
    
    const bucketExpr = {
      day: "date(acquisition_date)",
      week: "strftime('%Y-W%W', acquisition_date)",
      month: "strftime('%Y-%m', acquisition_date)",
      year: "strftime('%Y', acquisition_date)"
    }[cleanGranularity];

    const [rows] = await sequelize.query(`
      SELECT ${bucketExpr} AS bucket, COUNT(DISTINCT customer_id) AS customers
      FROM customer_acquisition
      WHERE acquisition_date IS NOT NULL AND acquisition_date != ''
      GROUP BY bucket
      ORDER BY bucket
    `);

    const total = await CustomerAcquisition.count();
    const labels = rows.map(r => r.bucket);
    const customerCounts = rows.map(r => r.customers);
    
    const newCustomers = customerCounts[customerCounts.length - 1] || 0;
    const previous = customerCounts[customerCounts.length - 2] || 0;
    const growthPercent = previous > 0 ? ((newCustomers - previous) / previous * 100) : null;
    const trend = labels.map((label, index) => ({ label, customers: customerCounts[index] }));

    return {
      labels,
      customers: customerCounts,
      granularity: cleanGranularity,
      total_acquired_customers: total,
      new_customers: newCustomers,
      growth_percent: growthPercent,
      acquisition_trend: trend
    };
  }

  async analyzeImport(importId = null) {
    const products = await Product.findAll();
    const customers = await Customer.findAll();
    const orders = await Order.findAll();
    const inventory = await Inventory.findAll();

    let filteredProducts = products;
    let filteredCustomers = customers;
    let filteredOrders = orders;
    let filteredInventory = inventory;

    if (importId) {
      filteredProducts = products.filter(r => r.source_import_id === importId);
      filteredCustomers = customers.filter(r => r.source_import_id === importId);
      filteredOrders = orders.filter(r => r.source_import_id === importId);
      filteredInventory = inventory.filter(r => r.source_import_id === importId);
    }

    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const orderCount = filteredOrders.length;
    const productSales = {};

    filteredOrders.forEach(o => {
      const product = o.product;
      if (product) {
        if (!productSales[product]) {
          productSales[product] = { name: product, quantity: 0, revenue: 0.0 };
        }
        productSales[product].quantity += o.quantity || 0;
        productSales[product].revenue += o.amount || 0;
      }
    });

    let topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity).slice(0, 10);
    if (topProducts.length === 0) {
      topProducts = filteredProducts
        .sort((a, b) => (b.price || 0) - (a.price || 0))
        .slice(0, 10)
        .map(p => ({ name: p.name, sku: p.sku, stock: p.stock, price: p.price }));
    }

    const lowStock = filteredInventory.filter(r => (r.stock || 0) <= (r.reorder_level || 5));

    return {
      revenue_analysis: {
        total_revenue: totalRevenue,
        order_count: orderCount,
        average_order_value: orderCount > 0 ? totalRevenue / orderCount : 0
      },
      top_products: topProducts,
      low_stock_alerts: lowStock.map(r => ({ product: r.product, stock: r.stock, reorder_level: r.reorder_level })),
      customer_insights: {
        customer_count: filteredCustomers.length,
        customers_with_email: filteredCustomers.filter(r => r.email).length
      },
      inventory_recommendations: lowStock.map(r => ({ product: r.product, recommendation: `Reorder above ${r.reorder_level} units.`, stock: r.stock }))
    };
  }
}
