import {
  PRODUCT_ORIGIN,
  buildProductImportStats,
  countUploadedProductRows,
  createImportAuditLog,
  logProductAudit,
} from './importProductGuard.js';
import {
  blockDateToIdMapping,
  detectColumnType,
  isDateLikeValue,
} from './columnTypeDetection.js';
import { buildOrderItemsFromRow } from './orderItemsParser.js';
import { deriveOrderAmount, deriveProductSalesCount } from './salesDerivation.js';

export { isDateLikeValue, detectColumnType, blockDateToIdMapping } from './columnTypeDetection.js';

export const SOURCE_LABELS = {
  csv: 'CSV',
  excel: 'Excel (.xlsx)',
  excel_xls: 'Excel (.xls)',
  google_sheets: 'Google Sheets',
  mysql: 'MySQL',
  postgresql: 'PostgreSQL',
  sql_server: 'SQL Server',
  oracle: 'Oracle',
  sqlite: 'SQLite',
  shopify: 'Shopify',
  woocommerce: 'WooCommerce',
  rest_api: 'REST APIs',
  erp: 'ERP Systems',
  crm: 'CRM Systems',
  json: 'JSON Files',
  xml: 'XML Files',
  business_software: 'Business Software',
};

export const IMPORT_SOURCES = Object.entries(SOURCE_LABELS);

export const NORMALIZED_SCHEMA = {
  products: ['id', 'name', 'sku', 'category', 'price', 'stock', 'status'],
  customers: ['id', 'name', 'email', 'phone', 'city', 'status'],
  orders: ['id', 'customer', 'product', 'quantity', 'amount', 'status', 'order_date'],
  inventory: ['product', 'stock', 'reorder_level'],
};

export const FIELD_LABELS = {
  productId: 'Product ID',
  productName: 'Product Name',
  productSku: 'SKU',
  productCategory: 'Category',
  productPrice: 'Price',
  productStock: 'Stock Quantity',
  inventoryStockQuantity: 'Stock Quantity',
  productStatus: 'Product Status',
  reorderLevel: 'Reorder Level',
  productSales: 'Sales',
  customerId: 'Customer ID',
  customerName: 'Customer Name',
  customerEmail: 'Customer Email',
  customerPhone: 'Customer Phone',
  customerCity: 'Customer City',
  customerState: 'Customer State',
  customerAge: 'Customer Age',
  customerDob: 'Date of Birth',
  customerGender: 'Customer Gender',
  customerStatus: 'Customer Status',
  orderId: 'Order ID',
  orderDate: 'Order Date',
  orderStatus: 'Order Status',
  orderTotal: 'Order Amount',
  orderItems: 'Order Items',
  quantity: 'Order Quantity',
  supplierName: 'Supplier Name',
  invoiceId: 'Invoice ID',
  transactionId: 'Transaction ID',
  revenue: 'Revenue',
  lastUpdated: 'Last Updated',
};

export const FIELD_ENTITIES = {
  productId: 'Products',
  productName: 'Products',
  productSku: 'Products',
  productCategory: 'Categories',
  productPrice: 'Products',
  productStock: 'Inventory',
  inventoryStockQuantity: 'Inventory',
  productStatus: 'Products',
  reorderLevel: 'Inventory',
  productSales: 'Products',
  customerId: 'Customers',
  customerName: 'Customers',
  customerEmail: 'Customers',
  customerPhone: 'Customers',
  customerCity: 'Customers',
  customerState: 'Customers',
  customerAge: 'Customers',
  customerDob: 'Customers',
  customerGender: 'Customers',
  customerStatus: 'Customers',
  orderId: 'Orders',
  orderDate: 'Orders',
  orderStatus: 'Orders',
  orderTotal: 'Orders',
  orderItems: 'Orders',
  quantity: 'Orders',
  supplierName: 'Suppliers',
  invoiceId: 'Invoices',
  transactionId: 'Transactions',
  revenue: 'Revenue',
  lastUpdated: 'Inventory',
};

export const COLUMN_ALIASES = {
  // Product ID — also matches Product_ID, Item_ID, pid
  productId: ['product id', 'product_id', 'pid', 'item id', 'item_id', 'prod id', 'prod_id', 'id'],
  // Product Name — title, name, item, etc.
  productName: ['product', 'product name', 'product_name', 'item', 'item name', 'item_name', 'lineitem name', 'line item name', 'sku name', 'title', 'merchandise'],
  // SKU — includes variant sku, code
  productSku: ['sku', 'sku code', 'sku_code', 'variant sku', 'product sku', 'product_sku', 'item sku', 'item_sku', 'product code', 'product_code', 'productcode', 'code', 'barcode', 'upc', 'isbn', 'itemcode', 'item code', 'item_code', 'stockcode', 'stock code', 'stock_code', 'item number', 'item no', 'productid', 'product_id'],
  // Category
  productCategory: ['category', 'product category', 'product_category', 'type', 'product type', 'collection', 'department', 'section', 'segment', 'sub category', 'subcategory', 'tags'],
  // Price — selling price, cost price, unit price, mrp
  productPrice: ['price', 'selling price', 'selling_price', 'unit price', 'unit_price', 'item price', 'lineitem price', 'rate', 'mrp', 'retail price', 'list price', 'variant price', 'amount', 'revenue per unit', 'selling_price'],
  // Stock — stock quantity, current stock, inventory qty, qty available
  productStock: ['stock', 'stock qty', 'stock_qty', 'stock quantity', 'stock_quantity', 'current stock', 'current_stock', 'inventory', 'inventory quantity', 'inventory_quantity', 'available stock', 'qty available', 'qty_available', 'quantity available', 'quantity_available', 'quantity in stock', 'quantity_in_stock', 'on hand', 'on_hand', 'available qty', 'available quantity', 'units in stock', 'quantity on hand', 'inventory level', 'variant inventory qty', 'quantity_available'],
  inventoryStockQuantity: ['stock', 'stock qty', 'stock_qty', 'stock quantity', 'stock_quantity', 'current stock', 'current_stock', 'inventory', 'inventory quantity', 'inventory_quantity', 'available stock', 'qty available', 'qty_available', 'quantity available', 'quantity_available', 'quantity in stock', 'quantity_in_stock', 'on hand', 'on_hand', 'available qty', 'available quantity', 'units in stock', 'quantity on hand', 'warehouse stock', 'warehouse_stock', 'inventory level', 'variant inventory qty', 'quantity_available'],
  // Product Status / Inventory Status
  productStatus: ['product status', 'product_status', 'availability', 'active', 'published', 'inventory status', 'inventory_status', 'stock status', 'item status', 'status'],
  // Reorder Level
  reorderLevel: ['reorder level', 'reorder_level', 'minimum stock', 'min_stock', 'safety stock', 'reorder point', 'min stock level', 'reorder qty'],
  // Product sales / velocity
  productSales: ['sales', 'sales count', 'sales_count', 'sold units', 'sold_units', 'units sold', 'units_sold', 'sold', 'quantity sold', 'quantity_sold', 'qty sold', 'qty_sold', 'order quantity', 'purchased quantity'],
  // Customer ID
  customerId: ['customer id', 'customer_id', 'cust id', 'cust_id', 'client id', 'client_id', 'buyer id', 'buyer_id', 'user id', 'user_id', 'member id', 'id', 'customerid'],
  // Customer Name
  customerName: ['customer', 'customer name', 'customer_name', 'billing name', 'buyer', 'buyer name', 'client', 'client name', 'consumer', 'account name', 'customer full name', 'full name', 'full_name', 'contact name', 'recipient', 'first name', 'last name', 'name'],
  // Customer Email
  customerEmail: ['email', 'customer email', 'customer_email', 'billing email', 'buyer email', 'email address', 'e mail', 'e_mail', 'e-mail', 'contact email', 'mail id', 'email_address'],
  // Customer Phone
  customerPhone: ['phone', 'telephone', 'billing phone', 'customer phone', 'customer_phone', 'mobile', 'mobile no', 'mobile number', 'contact number', 'cell', 'phone number', 'mobile_number', 'phone_number', 'contact'],
  // City
  customerCity: ['city', 'billing city', 'shipping city', 'customer city', 'town', 'locality', 'location', 'customer location', 'address city'],
  // State
  customerState: ['state', 'province', 'region', 'billing state', 'shipping state', 'customer state'],
  // Customer Age
  customerAge: ['age', 'customer age', 'age group', 'years old', 'customer_age', 'years'],
  customerDob: ['dob', 'date of birth', 'birth date', 'birthdate'],
  customerGender: ['gender', 'sex', 'customer gender', 'customer_gender'],
  // Customer Status
  customerStatus: ['customer status', 'customer_status', 'client status', 'buyer status', 'status'],
  // Order ID
  orderId: ['order id', 'order_id', 'order', 'order number', 'order_number', 'order no', 'order name', 'order_name', 'invoice id', 'invoice number', 'transaction id', 'purchase id', 'id', 'orderid'],
  // Order Date
  orderDate: ['date', 'order date', 'order_date', 'order dt', 'created at', 'created_at', 'paid at', 'processed at', 'invoice date', 'purchase date', 'transaction date', 'timestamp', 'sale date', 'ship date', 'last purchase date'],
  // Order Status
  orderStatus: ['status', 'fulfillment status', 'payment status', 'financial status', 'order status', 'order_status', 'delivery status'],
  // Order Total / Amount
  orderTotal: ['total', 'order total', 'order_total', 'order amount', 'order_amount', 'grand total', 'grand_total', 'amount', 'total amount', 'total_amount', 'net amount', 'net sales', 'sales', 'sales amount', 'sales_amount', 'revenue', 'subtotal', 'invoice total', 'totalsales', 'total sales', 'total_sales'],
  orderItems: ['order items breakdown', 'order items', 'items breakdown', 'items_breakdown', 'order_items_breakdown', 'items', 'line items', 'order line items', 'products', 'product_list', 'cart_items', 'line_items'],
  // Quantity
  quantity: ['quantity', 'qty', 'qty ordered', 'lineitem quantity', 'items', 'units', 'unit qty', 'order qty', 'order quantity', 'purchased quantity', 'pieces', 'count'],
  // Supplier
  supplierName: ['supplier', 'supplier name', 'vendor', 'vendor name'],
  // Invoice
  invoiceId: ['invoice', 'invoice id', 'invoice_id', 'invoice number'],
  // Transaction
  transactionId: ['transaction', 'transaction id', 'transaction_id', 'payment id', 'receipt id'],
  // Revenue
  revenue: ['revenue', 'gross revenue', 'net revenue', 'sales revenue', 'sales amount', 'sales_amount', 'total sales', 'total_sales', 'income', 'turnover', 'margin', 'profit', 'earnings'],
  // Inventory Last Updated
  lastUpdated: ['last updated', 'last_updated', 'updated at', 'updated_at', 'last modified', 'modified date'],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const CONFIDENCE_THRESHOLD = 75;
export const EMPTY_IMPORT_VALUE = 'None';

// Monetary/aggregate terms that must NEVER be used as product names in Items Breakdown
const MONETARY_BLOCKLIST = [
  'order total', 'total', 'revenue', 'amount', 'sales', 'gross sales',
  'net sales', 'subtotal', 'sub total', 'tax', 'discount', 'shipping',
  'order amount', 'net amount', 'gross amount', 'total amount',
  'order value', 'net value', 'gross value'
];

export const isMonetaryTerm = (name) => {
  if (!name || typeof name !== 'string') return false;
  const normalized = name.trim().toLowerCase();
  return MONETARY_BLOCKLIST.some(term => normalized.includes(term));
};

export const isMonetaryHeader = (header) => {
  return isMonetaryTerm(header);
};
export const CHUNK_SIZE = 1000;
export const PRODUCTION_IMPORT_BATCH_SIZE = 1000;

export const coalesceImportValue = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return EMPTY_IMPORT_VALUE;
  return value;
};

const toExtraFieldKey = (columnName) => {
  const normalized = normalizeHeader(columnName).replace(/\s+(.)/g, (_, char) => char.toUpperCase());
  return normalized.replace(/^./, char => char.toLowerCase()) || 'field';
};

const getUnmappedSourceColumns = (mappings = []) => (
  mappings.filter(item => !item.suggestedField).map(item => item.sourceColumn)
);

const attachExtraFields = (record, row, mappings = []) => {
  const mappedColumns = new Set(
    mappings.filter(item => item.suggestedField).map(item => item.sourceColumn)
  );
  const extraFields = { ...(record.extraFields || {}) };
  Object.keys(row || {}).forEach((column) => {
    if (mappedColumns.has(column)) return;
    extraFields[toExtraFieldKey(column)] = coalesceImportValue(row[column]);
  });
  return Object.keys(extraFields).length ? { ...record, extraFields, ...extraFields } : record;
};

const hasImportValue = (value) => value !== EMPTY_IMPORT_VALUE && value !== '' && value !== null && value !== undefined;

const preferImportValue = (incoming, existing) => (hasImportValue(incoming) ? incoming : existing);

const mergeCustomerRecords = (existing = {}, incoming = {}) => {
  const merged = {
    ...existing,
    ...incoming,
    id: preferImportValue(incoming.id, existing.id),
    name: preferImportValue(incoming.name, existing.name),
    email: preferImportValue(incoming.email, existing.email),
    phone: preferImportValue(incoming.phone, existing.phone),
    city: preferImportValue(incoming.city, existing.city),
    state: preferImportValue(incoming.state, existing.state),
    age: preferImportValue(incoming.age, existing.age),
    gender: preferImportValue(incoming.gender, existing.gender),
    status: preferImportValue(incoming.status, existing.status),
    totalPurchases: Math.max(Number(existing.totalPurchases || 0), Number(incoming.totalPurchases || 0)),
    mappedFields: { ...(existing.mappedFields || {}), ...(incoming.mappedFields || {}) },
    extraFields: { ...(existing.extraFields || {}), ...(incoming.extraFields || {}) },
  };
  Object.keys(merged.extraFields).forEach((key) => {
    merged[key] = preferImportValue(incoming[key], existing[key]);
  });
  return merged;
};
const PRODUCT_FIELDS = new Set(['productId', 'productName', 'productSku', 'productCategory', 'productPrice', 'productStock', 'inventoryStockQuantity', 'productStatus', 'reorderLevel', 'productSales']);
const CUSTOMER_FIELDS = new Set(['customerId', 'customerName', 'customerEmail', 'customerPhone', 'customerCity', 'customerState', 'customerAge', 'customerDob', 'customerGender', 'customerStatus']);
const ORDER_FIELDS = new Set(['orderId', 'customerId', 'customerName', 'customerEmail', 'customerPhone', 'customerCity', 'customerState', 'productId', 'productSku', 'productName', 'productCategory', 'productPrice', 'productStatus', 'quantity', 'orderTotal', 'orderItems', 'orderDate', 'orderStatus', 'revenue']);
const INVENTORY_FIELDS = new Set(['productId', 'productName', 'productSku', 'productStock', 'inventoryStockQuantity', 'reorderLevel', 'productStatus', 'lastUpdated']);
const PRODUCT_SIGNAL_HEADERS = ['product', 'productcode', 'product code', 'sku', 'item', 'itemcode', 'item code', 'stockcode', 'stock code', 'price', 'stock', 'inventory', 'category', 'collection', 'segment', 'variant'];
const CUSTOMER_SIGNAL_HEADERS = ['customer', 'consumer', 'account name', 'email', 'e-mail', 'phone', 'city', 'state', 'age', 'buyer', 'client', 'billing', 'shipping', 'first name', 'last name', 'contact'];
const ORDER_SIGNAL_HEADERS = ['order', 'invoice', 'transaction', 'payment', 'total', 'totalsales', 'amount', 'quantity', 'qty', 'timestamp', 'date'];

const normalizeHeader = (header) => String(header || '').trim().toLowerCase().replace(/[-_\s]+/g, ' ');
const compact = (value) => normalizeHeader(value).replace(/[^a-z0-9]/g, '');
const isHiddenCharacter = (char) => {
  const code = char.charCodeAt(0);
  return (code >= 0 && code <= 31) ||
    (code >= 127 && code <= 159) ||
    code === 0x200B ||
    code === 0x200C ||
    code === 0x200D ||
    code === 0x2060 ||
    code === 0xFEFF;
};

export const normalizeImportText = (value) => Array.from(String(value ?? ''))
  .filter(char => !isHiddenCharacter(char))
  .join('')
  .replace(/\u00A0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
export const normalizeSku = (value) => normalizeImportText(value).toUpperCase();
export const normalizeNameKey = (value) => normalizeImportText(value).toLowerCase();

const headerHasSignal = (header, signals) => {
  const normalized = normalizeHeader(header);
  return signals.some(signal => normalized.includes(signal));
};

const profileDataset = (rows) => {
  const sample = rows.slice(0, 50);
  const headers = Array.from(new Set(
    sample.flatMap(row => (row && typeof row === 'object') ? Object.keys(row) : [])
  ));

  let emailCount = 0;
  let phoneCount = 0;
  let dateCount = 0;
  let priceCount = 0;
  let quantityCount = 0;

  headers.forEach(h => {
    const vals = sample.map(row => String(row[h] ?? '').trim()).filter(Boolean);
    if (vals.length === 0) return;

    const emails = vals.filter(v => EMAIL_RE.test(v));
    if (emails.length / vals.length > 0.6) emailCount++;

    const phones = vals.filter(v => /^\+?[\d\s\-()]{7,20}$/.test(v));
    if (phones.length / vals.length > 0.6) phoneCount++;

    const dates = vals.filter(isDateLikeValue);
    if (dates.length / vals.length > 0.6) dateCount++;

    const prices = vals.filter(v => {
      const cleaned = v.replace(/[^0-9.\-]/g, '');
      const parsed = parseFloat(cleaned);
      return !isNaN(parsed) && (v.includes('.') || v.includes('$') || v.includes('€') || v.includes('£')) && parsed >= 0;
    });
    if (prices.length / vals.length > 0.6) priceCount++;

    const quantities = vals.filter(v => {
      const parsed = parseInt(v, 10);
      return !isNaN(parsed) && String(parsed) === v && parsed > 0 && parsed < 10000;
    });
    if (quantities.length / vals.length > 0.6) quantityCount++;
  });

  return {
    emailCount,
    phoneCount,
    dateCount,
    priceCount,
    quantityCount,
  };
};

const getDatasetProfile = (rows = [], datasetName = '') => {
  const tableDetection = detectImportTableType(rows, [], datasetName);
  const kind = tableDetection.tableType;
  return {
    headers: Array.from(new Set(
      rows.slice(0, 100).flatMap(row => (row && typeof row === 'object') ? Object.keys(row) : [])
    )),
    looksProductDataset: kind === 'products' || kind === 'inventory',
    looksCustomerDataset: kind === 'customers',
    looksOrderDataset: kind === 'orders' || kind === 'revenue' || kind === 'sales',
    sampleRows: rows.slice(0, 3),
  };
};

const isGenericNameColumn = (header) => ['name', 'full name', 'title', 'description'].includes(normalizeHeader(header));

export const sampleValuesForColumn = (rows, column, limit = 3) => rows
  .slice(0, 25)
  .map(row => String(row?.[column] ?? '').trim())
  .filter(Boolean)
  .slice(0, limit);

const fieldSetFromMappings = (mappings = []) => new Set(mappings.map(item => item.suggestedField).filter(Boolean));

const countFields = (fields, expectedFields) => expectedFields.filter(field => fields.has(field)).length;

const hasMappedOrHeader = (headers, fields, aliases = []) => {
  const normalizedHeaders = headers.map(header => normalizeHeader(header));
  const compactHeaders = headers.map(header => compact(header));
  const fieldAliases = fields.flatMap(field => COLUMN_ALIASES[field] || []);
  const candidates = [...fieldAliases, ...aliases];
  return candidates.some(alias => {
    const normalizedAlias = normalizeHeader(alias);
    const compactAlias = compact(alias);
    return normalizedHeaders.includes(normalizedAlias) || compactHeaders.includes(compactAlias);
  });
};

const hasExplicitProductNameHeader = (headers) => headers.some((header) => {
  const normalized = normalizeHeader(header);
  return normalized === 'product name' || normalized === 'product' || normalized === 'item name' || normalized === 'item';
});

const detectExplicitDatasetType = (headers, fields, datasetName = '') => {
  const sheetName = normalizeHeader(datasetName);
  const hasOrderId = fields.has('orderId') || hasMappedOrHeader(headers, ['orderId']);
  const hasCustomerId = fields.has('customerId') || hasMappedOrHeader(headers, ['customerId']);
  const hasSku = fields.has('productSku') || hasMappedOrHeader(headers, ['productSku']);
  const hasProductName = fields.has('productName') || hasMappedOrHeader(headers, ['productName']);
  const hasCategory = fields.has('productCategory') || hasMappedOrHeader(headers, ['productCategory']);
  const hasPrice = fields.has('productPrice') || hasMappedOrHeader(headers, ['productPrice']);
  const hasStock = fields.has('productStock') || hasMappedOrHeader(headers, ['productStock'], ['stock quantity', 'stock qty']);
  const hasCustomerName = fields.has('customerName') || hasMappedOrHeader(headers, ['customerName']);
  const hasEmail = fields.has('customerEmail') || hasMappedOrHeader(headers, ['customerEmail']);
  const hasExplicitProductName = hasExplicitProductNameHeader(headers);

  const strongCustomerSheet = /customer|client|buyer|user/.test(sheetName);
  const strongProductSheet = /product|catalog|item|sku/.test(sheetName);
  const strongOrderSheet = /order|transaction|invoice|purchase/.test(sheetName);
  const strongInventorySheet = /inventory|stock|warehouse/.test(sheetName);

  const isInventory = hasSku && hasStock && !hasExplicitProductName && !hasCategory && !hasPrice;
  const isOrders = hasOrderId && (hasSku || hasExplicitProductName || (hasProductName && !strongCustomerSheet));
  const isProducts = (hasExplicitProductName || hasSku || hasCategory || hasPrice || hasStock) && !strongCustomerSheet;
  const isCustomers = hasCustomerId || hasEmail || (hasCustomerName && !hasExplicitProductName) || strongCustomerSheet;
  const isMixedCommerce = isOrders && (isCustomers || hasCategory || hasPrice || hasStock);

  if (strongInventorySheet && isInventory) return 'inventory';
  if (strongOrderSheet && hasOrderId) {
    return (hasCustomerId || hasEmail || hasCustomerName) ? 'mixed_commerce' : 'orders';
  }
  if (isMixedCommerce || (strongOrderSheet && isOrders)) return 'mixed_commerce';
  if (isOrders) return 'orders';
  if (isInventory) return 'inventory';
  if (strongCustomerSheet || (isCustomers && (hasCustomerId || hasEmail))) return 'customers';
  if (strongProductSheet || isProducts) return 'products';
  if (isCustomers) return 'customers';
  if (isProducts) return 'products';
  return '';
};

export const detectImportTableType = (rows = [], mappings = [], datasetName = '', tableTypeOverride = '') => {
  if (tableTypeOverride && tableTypeOverride !== 'unknown') {
    return {
      tableType: tableTypeOverride,
      confidence: 100,
      scores: {},
      sampleRows: rows.slice(0, 10),
    };
  }

  const sheetName = normalizeHeader(datasetName);
  const sample = rows.slice(0, 100);
  const headers = Array.from(new Set(
    sample.flatMap(row => (row && typeof row === 'object') ? Object.keys(row) : [])
  ));
  const mappedFields = fieldSetFromMappings(mappings);
  const explicitType = detectExplicitDatasetType(headers, mappedFields, datasetName);
  if (explicitType) {
    return {
      tableType: explicitType,
      confidence: explicitType === 'mixed_commerce' ? 98 : 96,
      scores: {},
      sampleRows: rows.slice(0, 10),
    };
  }

  let customerScore = 0;
  let productScore = 0;
  let orderScore = 0;
  let inventoryScore = 0;
  let revenueScore = 0;
  let salesScore = 0;

  // Header keyword matching
  const customerWords = ['customer', 'client', 'buyer', 'buyer id', 'email', 'phone', 'mobile', 'city', 'state', 'age', 'full name', 'first name', 'last name', 'contact', 'billing', 'shipping'];
  const productWords = ['product', 'productcode', 'product code', 'sku', 'item', 'itemcode', 'item code', 'stockcode', 'stock code', 'price', 'cost', 'mrp', 'retail', 'msrp', 'category', 'collection', 'segment', 'variant', 'description'];
  const orderWords = ['order', 'order id', 'order_id', 'order number', 'order_number', 'order date', 'order_date', 'transaction date', 'timestamp', 'quantity', 'qty', 'order total', 'order_total', 'amount', 'total amount', 'totalsales'];
  const inventoryWords = ['inventory', 'stock', 'stock level', 'reorder', 'reorder level', 'reorder qty', 'safety stock', 'on hand', 'available qty'];
  const revenueWords = ['revenue', 'gross revenue', 'net revenue', 'sales revenue', 'margin', 'profit', 'earnings'];
  const salesWords = ['sales', 'units sold', 'sold', 'quantity sold', 'sales count', 'sales volume', 'velocity'];

  headers.forEach(h => {
    const norm = normalizeHeader(h);
    if (customerWords.some(w => norm.includes(w))) customerScore += 2;
    if (productWords.some(w => norm.includes(w))) productScore += 2;
    if (orderWords.some(w => norm.includes(w))) orderScore += 2;
    if (inventoryWords.some(w => norm.includes(w))) inventoryScore += 2;
    if (revenueWords.some(w => norm.includes(w))) revenueScore += 2;
    if (salesWords.some(w => norm.includes(w))) salesScore += 2;
  });

  // Data profiling
  const profile = profileDataset(rows);
  customerScore += profile.emailCount * 5;
  customerScore += profile.phoneCount * 5;
  
  orderScore += profile.dateCount * 3;
  revenueScore += profile.dateCount * 2;
  salesScore += profile.dateCount * 2;

  productScore += profile.priceCount * 2;
  orderScore += profile.priceCount * 2;
  revenueScore += profile.priceCount * 4;

  orderScore += profile.quantityCount * 2;
  inventoryScore += profile.quantityCount * 2;
  salesScore += profile.quantityCount * 3;

  // Sheet name scoring
  if (sheetName) {
    if (sheetName.includes('customer') || sheetName.includes('client') || sheetName.includes('buyer') || sheetName.includes('user')) customerScore += 10;
    if (sheetName.includes('product') || sheetName.includes('item') || sheetName.includes('catalog')) productScore += 10;
    if (sheetName.includes('order') || sheetName.includes('transaction') || sheetName.includes('invoice') || sheetName.includes('purchase')) orderScore += 10;
    if (sheetName.includes('inventory') || sheetName.includes('stock') || sheetName.includes('warehouse')) inventoryScore += 10;
    if (sheetName.includes('revenue') || sheetName.includes('earning') || sheetName.includes('finance') || sheetName.includes('profit')) revenueScore += 10;
    if (sheetName.includes('sales') || sheetName.includes('velocity') || sheetName.includes('sold')) salesScore += 10;
  }

  // If mappings are passed, let's also score them
  if (mappings && mappings.length > 0) {
    const fields = fieldSetFromMappings(mappings);
    customerScore += countFields(fields, ['customerName', 'customerEmail', 'customerAge', 'customerDob', 'customerCity', 'customerState', 'customerStatus']) * 4;
    productScore += countFields(fields, ['productName', 'productSku', 'productCategory', 'productPrice', 'productStock', 'productSales']) * 4;
    orderScore += countFields(fields, ['orderId', 'customerId', 'productId', 'quantity', 'orderTotal', 'orderDate']) * 4;
    inventoryScore += countFields(fields, ['productId', 'productName', 'productStock', 'reorderLevel']) * 4;
    revenueScore += countFields(fields, ['revenue']) * 4;
  }

  const scores = {
    customers: customerScore,
    products: productScore,
    orders: orderScore,
    inventory: inventoryScore,
    revenue: revenueScore,
    sales: salesScore,
  };

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [tableType, score] = sorted[0];
  const nextScore = sorted[1]?.[1] || 0;
  const confidence = score > 0 ? Math.min(99, Math.max(50, 60 + score * 4 - Math.max(0, nextScore - 1) * 2)) : 0;

  return {
    tableType: score > 0 ? tableType : 'unknown',
    confidence,
    scores,
    sampleRows: rows.slice(0, 10),
  };
};

export const allowedFieldsForTable = (tableType) => {
  if (tableType === 'products') return PRODUCT_FIELDS;
  if (tableType === 'customers') return CUSTOMER_FIELDS;
  if (tableType === 'orders' || tableType === 'mixed_commerce' || tableType === 'revenue' || tableType === 'sales') return ORDER_FIELDS;
  if (tableType === 'inventory') return INVENTORY_FIELDS;
  return new Set();
};

const schemaRequirementsForTable = (tableType) => {
  if (tableType === 'products') return {
    label: 'Products',
    requiredAny: [['productName', 'Product Name'], ['productSku', 'SKU']],
    expected: ['productName', 'productSku', 'productCategory', 'productPrice', 'productStock', 'productSales'],
  };
  if (tableType === 'customers') return {
    label: 'Customers',
    requiredAny: [['customerName', 'Customer Name'], ['customerEmail', 'Email']],
    expected: ['customerName', 'customerEmail', 'customerAge', 'customerDob', 'customerCity', 'customerState', 'customerStatus'],
  };
  if (tableType === 'orders' || tableType === 'mixed_commerce' || tableType === 'revenue' || tableType === 'sales') return {
    label: 'Orders',
    requiredAny: [['orderId', 'Order ID']],
    expected: ['orderId', 'customerId', 'productSku', 'productId', 'productName', 'quantity', 'orderTotal', 'orderDate'],
  };
  if (tableType === 'inventory') return {
    label: 'Inventory',
    requiredAny: [['productId', 'Product ID'], ['productSku', 'SKU'], ['productName', 'Product Name']],
    expected: ['productId', 'productSku', 'productName', 'productStock', 'reorderLevel'],
  };
  return { label: 'Unknown', requiredAny: [], expected: [] };
};

const applyDatasetContextToMapping = (mapping, rows, tableType = '') => {
  const profile = getDatasetProfile(rows);
  const normalizedHeader = normalizeHeader(mapping.sourceColumn);
  let next = { ...mapping };

  const activeTableType = tableType || detectImportTableType(rows, [], '').tableType;

  if (isGenericNameColumn(mapping.sourceColumn)) {
    if (activeTableType === 'customers') {
      next = {
        ...next,
        suggestedField: 'customerName',
        suggestedLabel: FIELD_LABELS.customerName,
        entity: FIELD_ENTITIES.customerName,
        confidence: Math.max(next.confidence, 92),
      };
    } else if (activeTableType === 'products' || activeTableType === 'orders' || activeTableType === 'mixed_commerce') {
      next = {
        ...next,
        suggestedField: 'productName',
        suggestedLabel: FIELD_LABELS.productName,
        entity: FIELD_ENTITIES.productName,
        confidence: Math.max(next.confidence, 92),
      };
    }
  }

  if (normalizedHeader === 'id') {
    if (activeTableType === 'customers') {
      next = { ...next, suggestedField: 'customerId', suggestedLabel: FIELD_LABELS.customerId, entity: FIELD_ENTITIES.customerId, confidence: Math.max(next.confidence, 90) };
    } else if (activeTableType === 'products') {
      next = { ...next, suggestedField: 'productId', suggestedLabel: FIELD_LABELS.productId, entity: FIELD_ENTITIES.productId, confidence: Math.max(next.confidence, 90) };
    } else if (activeTableType === 'orders' || activeTableType === 'mixed_commerce' || activeTableType === 'revenue' || activeTableType === 'sales') {
      next = { ...next, suggestedField: 'orderId', suggestedLabel: FIELD_LABELS.orderId, entity: FIELD_ENTITIES.orderId, confidence: Math.max(next.confidence, 90) };
    }
  }

  return next;
};

const parseNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') return fallback;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  if (!cleaned) return fallback;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getInventoryStatus = (stockValue) => {
  const stock = parseNumber(stockValue, 0) || 0;
  if (stock < 0) return 'Backordered';
  if (stock === 0) return 'Out Of Stock';
  return 'In Stock';
};

const normalizeProductStatus = () => 'Active';

const readStock = (get) => parseNumber(get('productStock') ?? get('inventoryStockQuantity'), null);

const parseDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
};

const createMappingReport = () => {
  const report = {
    ordersImported: 0,
    totalOrderSkus: 0,
    matchedSkus: 0,
    unmatchedSkus: 0,
    unmatchedItems: [],
  };
  Object.defineProperty(report, '_orderIds', { value: new Set(), enumerable: false });
  return report;
};

const addProductAliases = (indexes, product) => {
  if (!product) return;
  const id = normalizeImportText(product.id);
  const sku = normalizeSku(product.sku);
  const name = normalizeNameKey(product.name || product.product_name);
  if (id) indexes.byId.set(id, product);
  if (sku) indexes.bySku.set(sku, product);
  if (name) indexes.byName.set(name, product);
};

const findProductMatch = (indexes, { productId = '', sku = '', productName = '' } = {}) => {
  const normalizedSku = normalizeSku(sku);
  const normalizedId = normalizeImportText(productId);
  const normalizedName = normalizeNameKey(productName);

  if (normalizedSku && indexes.bySku.has(normalizedSku)) return indexes.bySku.get(normalizedSku);
  if (normalizedId && indexes.byId.has(normalizedId)) return indexes.byId.get(normalizedId);
  if (normalizedId && indexes.bySku.has(normalizeSku(normalizedId))) return indexes.bySku.get(normalizeSku(normalizedId));
  if (normalizedName && indexes.byName.has(normalizedName)) return indexes.byName.get(normalizedName);
  return null;
};

const createProductIndexes = (products = []) => {
  const indexes = { byId: new Map(), bySku: new Map(), byName: new Map() };
  products.forEach(product => addProductAliases(indexes, product));
  return indexes;
};

const findProductByAmount = (products, lineRevenue, quantity = 1) => {
  const qty = Math.max(1, Number(quantity) || 1);
  const unitAmount = Number(lineRevenue || 0) / qty;
  if (unitAmount <= 0) return null;
  let best = null;
  let bestDiff = Infinity;
  products.forEach((product) => {
    const price = Number(product.price || 0);
    if (price <= 0) return;
    const diff = Math.abs(price - unitAmount) / price;
    if (diff <= 0.25 && diff < bestDiff) {
      best = product;
      bestDiff = diff;
    }
  });
  return best;
};

export const normalizeCustomerAge = (age, dobStr) => {
  if (hasImportValue(age)) {
    const parsed = parseInt(String(age).replace(/[^0-9]/g, ''), 10);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 120) return parsed;
  }
  if (hasImportValue(dobStr)) {
    const dob = parseDate(dobStr);
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge >= 0 && calculatedAge <= 120) return calculatedAge;
    }
  }
  return 'Unknown';
};

export const normalizeCustomerPhone = (phone) => {
  const text = String(phone || '').trim();
  if (!text || text === EMPTY_IMPORT_VALUE) return EMPTY_IMPORT_VALUE;
  const digits = text.replace(/[^\d+]/g, '');
  return digits || text;
};

export const getValueWithFallback = (row, field, columnMap) => {
  if (columnMap && columnMap[field] && row[columnMap[field]] !== undefined && row[columnMap[field]] !== '') {
    return String(row[columnMap[field]]).trim();
  }
  // Fallback: search row keys for aliases of this field
  const aliases = COLUMN_ALIASES[field] || [];
  for (const key of Object.keys(row || {})) {
    const normKey = normalizeHeader(key);
    if (aliases.some(alias => normalizeHeader(alias) === normKey)) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return String(row[key]).trim();
      }
    }
  }
  return '';
};

export const getCustomerNameFromRow = (row, columnMap) => {
  if (columnMap && columnMap.customerName && row[columnMap.customerName] !== undefined && row[columnMap.customerName] !== '') {
    return String(row[columnMap.customerName]).trim();
  }
  // Try aliases of customerName directly on the row
  const aliases = COLUMN_ALIASES.customerName || [];
  for (const alias of aliases) {
    for (const key of Object.keys(row || {})) {
      if (normalizeHeader(key) === normalizeHeader(alias) && row[key] !== undefined && row[key] !== '') {
        return String(row[key]).trim();
      }
    }
  }
  // Try first name + last name
  const firstNameKeys = ['first name', 'first_name', 'firstname', 'fname'];
  const lastNameKeys = ['last name', 'last_name', 'lastname', 'lname'];
  let firstName = '';
  let lastName = '';
  for (const key of Object.keys(row || {})) {
    const normKey = normalizeHeader(key);
    if (firstNameKeys.includes(normKey)) firstName = String(row[key]).trim();
    if (lastNameKeys.includes(normKey)) lastName = String(row[key]).trim();
  }
  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(' ');
  }
  return '';
};

export const findCustomerForOrder = ({ customerId, customerName, customerEmail, customerPhone }, customersList) => {
  // 1. Match by Customer ID first
  if (customerId && customerId !== EMPTY_IMPORT_VALUE) {
    const match = (customersList || []).find(c => c.id && c.id !== EMPTY_IMPORT_VALUE && String(c.id).trim().toLowerCase() === String(customerId).trim().toLowerCase());
    if (match) return match;
  }
  // 2. Match by email next
  if (customerEmail && customerEmail !== EMPTY_IMPORT_VALUE) {
    const match = (customersList || []).find(c => c.email && c.email !== EMPTY_IMPORT_VALUE && String(c.email).trim().toLowerCase() === String(customerEmail).trim().toLowerCase());
    if (match) return match;
  }
  // 3. Match by phone
  if (customerPhone && customerPhone !== EMPTY_IMPORT_VALUE) {
    const match = (customersList || []).find(c => c.phone && c.phone !== EMPTY_IMPORT_VALUE && normalizeCustomerPhone(c.phone) === normalizeCustomerPhone(customerPhone));
    if (match) return match;
  }
  // 4. Match by Customer Name
  if (customerName && customerName !== EMPTY_IMPORT_VALUE) {
    const match = (customersList || []).find(c => c.name && c.name !== EMPTY_IMPORT_VALUE && normalizeNameKey(c.name) === normalizeNameKey(customerName));
    if (match) return match;
  }
  return null;
};

const customerMatchesOrder = (customer, order) => {
  if (!customer || !order) return false;
  
  const custId = customer.id;
  const orderCustId = order.customerId;
  const custEmail = customer.email;
  const custPhone = customer.phone;
  const orderPhone = order.customerPhone || (order.mappedFields && order.mappedFields.customerPhone);
  const orderCust = order.customer;
  const custName = customer.name;

  if (hasImportValue(custId) && hasImportValue(orderCustId) && String(custId).trim().toLowerCase() === String(orderCustId).trim().toLowerCase()) return true;
  if (hasImportValue(custEmail) && hasImportValue(orderCust) && String(custEmail).trim().toLowerCase() === String(orderCust).trim().toLowerCase()) return true;
  if (hasImportValue(custPhone) && hasImportValue(orderPhone) && normalizeCustomerPhone(custPhone) === normalizeCustomerPhone(orderPhone)) return true;
  if (hasImportValue(custName) && hasImportValue(orderCust) && normalizeNameKey(orderCust) === normalizeNameKey(custName)) return true;

  return false;
};

export const syncCustomerMetricsFromOrders = (customers = [], orders = []) => (
  customers.map((customer) => {
    const customerOrders = orders.filter(order => customerMatchesOrder(customer, order));
    
    const sortedOrders = [...customerOrders].sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateB - dateA;
    });

    const orderCount = sortedOrders.length;
    const revenue = sortedOrders.reduce((sum, order) => sum + Number(order.total || order.amount || 0), 0);
    const aov = orderCount > 0 ? revenue / orderCount : 0;
    const lastPurchaseDate = sortedOrders.length > 0 ? sortedOrders[0].date : null;

    let cohort = 'New';
    if (orderCount === 0) {
      cohort = 'New';
    } else {
      const now = new Date();
      const lastPurchase = lastPurchaseDate ? new Date(lastPurchaseDate) : now;
      const daysSinceLastPurchase = (now - lastPurchase) / (1000 * 60 * 60 * 24);
      
      if (orderCount >= 5 && revenue > 500) {
        cohort = 'VIP';
      } else if (orderCount >= 3) {
        cohort = 'Loyal Customer';
      } else if (orderCount > 1) {
        cohort = 'Repeat Buyer';
      } else {
        cohort = 'New';
      }

      if (daysSinceLastPurchase > 90 && cohort !== 'New') {
        cohort = daysSinceLastPurchase > 180 ? 'Churned' : 'At Risk Customer';
      } else if (daysSinceLastPurchase > 90 && cohort === 'New') {
        cohort = 'At Risk Customer';
      }
    }

    return {
      ...customer,
      age: normalizeCustomerAge(customer.age, customer.dob),
      phone: normalizeCustomerPhone(customer.phone),
      state: hasImportValue(customer.state) ? String(customer.state).trim() : customer.state,
      totalPurchases: orderCount,
      revenue,
      ltv: revenue,
      averageOrderValue: aov,
      lastPurchaseDate,
      cohort,
    };
  })
);

export const deduplicateCustomerRecords = (customers = []) => {
  const merged = new Map();
  customers.forEach((customer) => {
    const existingEntry = [...merged.entries()].find(([, existing]) =>
      (customer.id && hasImportValue(customer.id) && existing.id === customer.id) ||
      (customer.email && hasImportValue(customer.email) && existing.email === customer.email) ||
      (customer.name && hasImportValue(customer.name) && normalizeNameKey(existing.name) === normalizeNameKey(customer.name))
    );
    if (existingEntry) {
      merged.delete(existingEntry[0]);
      const key = customer.id || customer.email || normalizeNameKey(customer.name);
      merged.set(key, mergeCustomerRecords(existingEntry[1], customer));
      return;
    }
    const key = customer.id || customer.email || normalizeNameKey(customer.name) || `customer-${merged.size + 1}`;
    merged.set(key, customer);
  });
  return Array.from(merged.values());
};

export const finalizeImportEntities = ({ products = [], customers = [], orders = [] } = {}) => {
  const dedupedCustomers = deduplicateCustomerRecords(customers);
  const recalculated = recalculateProductMetricsFromOrders(products, orders);
  const syncedCustomers = syncCustomerMetricsFromOrders(dedupedCustomers, recalculated.orders);

  // Build items breakdown string on every order (runs for both single-sheet and multi-sheet paths)
  recalculated.orders.forEach(order => {
    if (Array.isArray(order.items) && order.items.length > 0) {
      const validItems = order.items.filter(i => {
        const name = (i.productName || i.product_name || i.sku || '').trim();
        if (!name) return false;
        if (name === EMPTY_IMPORT_VALUE || name === 'null' || name === 'undefined') return false;
        return !isMonetaryTerm(name);
      });
      if (validItems.length > 0) {
        const aggregated = new Map();
        validItems.forEach(i => {
          const key = (i.productName || i.product_name || i.sku || '').trim();
          if (!key) return;
          const qty = Math.max(1, Number(i.qty ?? i.quantity ?? 1) || 1);
          if (aggregated.has(key)) {
            aggregated.get(key).qty += qty;
          } else {
            aggregated.set(key, { name: key, qty });
          }
        });
        order.product = Array.from(aggregated.values())
          .map(entry => `${entry.qty}x ${entry.name}`)
          .join(', ');
      } else if (!order.product || isMonetaryTerm(order.product) || order.product === EMPTY_IMPORT_VALUE) {
        order.product = '';
      }
    } else if (!order.product || isMonetaryTerm(order.product) || order.product === EMPTY_IMPORT_VALUE) {
      order.product = '';
    }
  });

  return {
    products: recalculated.products,
    orders: recalculated.orders,
    customers: syncedCustomers,
    productMappingReport: recalculated.productMappingReport,
  };
};

export const recalculateProductMetricsFromOrders = (products = [], orders = []) => {
  const normalizedProducts = (Array.isArray(products) ? products : []).map(product => {
    const name = normalizeImportText(product.name || product.product_name || product.sku);
    const sku = normalizeSku(product.sku || product.id || '');
    const baseStock = Math.max(0, Number(product.baseStock ?? product.initialStock ?? product.importedStock ?? product.stock ?? 0) || 0);
    return {
      ...product,
      id: normalizeImportText(product.id || sku) || sku || null,
      name: name || sku || '',
      product_name: normalizeImportText(product.product_name || name || sku),
      sku,
      category: normalizeImportText(product.category) || 'Uncategorized',
      price: Math.max(0, Number(product.price ?? 0) || 0),
      baseStock,
      importedStock: baseStock,
      stock: baseStock,
      salesCount: 0,
      revenue: 0,
    };
  });

  const indexes = createProductIndexes(normalizedProducts);
  const report = createMappingReport();

  const normalizedOrders = (Array.isArray(orders) ? orders : []).map(order => {
    let orderTotal = 0;
    const items = (Array.isArray(order.items) ? order.items : []).map(item => {
      const quantity = Math.max(1, parseNumber(item.quantity ?? item.qty, 1) || 1);
      const fallbackName = normalizeImportText(item.productName || item.product_name || item.product || item.sku || item.productId || order.product);
      const sku = normalizeSku(item.sku || item.productSku || item.product_sku || item.productId || item.product_id);
      let product = findProductMatch(indexes, {
        productId: item.productId || item.product_id,
        sku,
        productName: fallbackName,
      });
      const preservedLineRevenue = Number(item.lineRevenue || 0) || deriveOrderAmount({
        quantity,
        unitPrice: item.unitPrice,
        productPrice: product?.price,
        orderTotal: order.total || order.amount,
      });

      if (!product && preservedLineRevenue > 0) {
        product = findProductByAmount(normalizedProducts, preservedLineRevenue, quantity);
      }

      if (product) {
        const lineRevenue = preservedLineRevenue > 0 ? preservedLineRevenue : quantity * Number(product.price || 0);
        product.salesCount += quantity;
        product.revenue += lineRevenue;
        orderTotal += lineRevenue;
        recordOrderSkuMatch(report, { orderId: order.id, sku: product.sku || sku, product, productName: product.name });
        return {
          ...item,
          order_id: order.id,
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          product_name: product.product_name || product.name,
          qty: quantity,
          quantity,
          lineRevenue,
        };
      }

      recordOrderSkuMatch(report, { orderId: order.id, sku, product: null, productName: fallbackName });
      orderTotal += preservedLineRevenue;
      return {
        ...item,
        order_id: order.id,
        sku,
        productName: (fallbackName && !isMonetaryTerm(fallbackName)) ? fallbackName : '',
        product_name: (fallbackName && !isMonetaryTerm(fallbackName)) ? fallbackName : '',
        qty: quantity,
        quantity,
        lineRevenue: preservedLineRevenue,
        missingProductMapping: !fallbackName && preservedLineRevenue <= 0,
      };
    });

    return {
      ...order,
      items,
      total: orderTotal || Number(order.total || order.amount || 0) || 0,
      amount: orderTotal || Number(order.amount || order.total || 0) || 0,
    };
  });

  normalizedProducts.forEach(product => {
    product.stock = Math.max(0, product.baseStock - product.salesCount);
  });

  return { products: normalizedProducts, orders: normalizedOrders, productMappingReport: report };
};

const recordOrderSkuMatch = (report, { orderId, sku, product, productName }) => {
  if (orderId && !report._orderIds.has(orderId)) {
    report._orderIds.add(orderId);
    report.ordersImported += 1;
  }
  const normalizedSku = normalizeSku(sku);
  if (!normalizedSku && !productName) return;
  report.totalOrderSkus += 1;
  if (product) {
    report.matchedSkus += 1;
  } else {
    report.unmatchedSkus += 1;
    report.unmatchedItems.push({ orderId, sku: normalizedSku || normalizeImportText(sku) || 'Missing SKU' });
  }
};

const stableId = (prefix, source, index, value) => {
  // Disabled: return null to avoid fabricating IDs.
  // Callers must use real IDs from source data.
  return null;
};

const parseCsvLine = (line, delimiter = ',') => {
  const cells = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
};

const detectDelimiter = (line) => {
  const candidates = [',', '\t', ';', '|'];
  return candidates
    .map(delimiter => ({ delimiter, count: parseCsvLine(line, delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ',';
};

export const parseCsvText = (text) => {
  const lines = String(text || '').split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter);
  return lines.slice(1).map(line => {
    const cells = parseCsvLine(line, delimiter);
    return headers.reduce((row, header, index) => {
      row[header] = cells[index] || '';
      return row;
    }, {});
  });
};

export const parseSmartImportText = (text) => {
  const raw = String(text || '').trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(row => row && typeof row === 'object');
    if (parsed && typeof parsed === 'object') {
      const firstArray = Object.values(parsed).find(Array.isArray);
      return firstArray?.filter(row => row && typeof row === 'object') || [];
    }
  } catch {
    // Continue to delimited parsing.
  }

  return parseCsvText(raw);
};

const xmlElementToObject = (element) => {
  const childElements = Array.from(element.children || []);
  if (childElements.length === 0) return element.textContent?.trim() || '';

  return childElements.reduce((row, child) => {
    const value = xmlElementToObject(child);
    if (row[child.tagName] === undefined) {
      row[child.tagName] = value;
    } else if (Array.isArray(row[child.tagName])) {
      row[child.tagName].push(value);
    } else {
      row[child.tagName] = [row[child.tagName], value];
    }
    return row;
  }, {});
};

export const parseXmlImportText = (text) => {
  if (typeof DOMParser === 'undefined') return [];
  const doc = new DOMParser().parseFromString(String(text || ''), 'application/xml');
  if (doc.querySelector('parsererror')) return [];

  const groups = Array.from(doc.querySelectorAll('*')).reduce((acc, element) => {
    const children = Array.from(element.children || []);
    if (children.length === 0) return acc;
    const leafNames = children.filter(child => child.children.length === 0).map(child => child.tagName);
    if (leafNames.length >= 2) {
      acc[element.tagName] = acc[element.tagName] || [];
      acc[element.tagName].push(xmlElementToObject(element));
    }
    return acc;
  }, {});

  const best = Object.values(groups).sort((a, b) => b.length - a.length)[0];
  return Array.isArray(best) ? best : [];
};

export const detectSourceType = ({ selectedSource = 'csv', fileName = '', text = '' } = {}) => {
  const lowerName = fileName.toLowerCase();
  if (selectedSource === 'sql' || selectedSource === 'oracle') return selectedSource;
  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) return 'excel';

  const headersLine = text.split(/\r?\n/)[0] || '';
  const delimiter = headersLine.includes('\t') ? '\t' : ',';
  const headers = headersLine.split(delimiter).map(h => h.trim().toLowerCase());

  if (headers.includes('variant sku') || headers.includes('fulfillment status') || lowerName.includes('shopify')) {
    return 'shopify';
  }
  if (headers.includes('customer_user') || headers.includes('order_items') || lowerName.includes('woocommerce')) {
    return 'woocommerce';
  }
  if (headersLine.includes('\t') && !fileName) {
    return 'google_sheets';
  }
  if (lowerName.endsWith('.csv') || text.includes(',')) return 'csv';
  
  return selectedSource;
};

const scoreHeaderForField = (header, field, tableType = '') => {
  if (['productName', 'productId', 'productSku'].includes(field) && isMonetaryHeader(header)) {
    return 0;
  }
  const normalized = normalizeHeader(header);
  const headerCompact = compact(header);
  const aliases = COLUMN_ALIASES[field] || [];

  if (normalized === 'status') {
    const orderLike = ['orders', 'mixed_commerce', 'revenue', 'sales'].includes(tableType);
    if (orderLike && field === 'productStatus') return 0;
    if (orderLike && field === 'orderStatus') return 99;
    if (tableType === 'customers' && field === 'customerStatus') return 99;
    if (tableType === 'products' && field === 'productStatus') return 99;
  }

  if (normalized === 'name') {
    if (tableType === 'customers' && field === 'productName') return 0;
    if (tableType === 'customers' && field === 'customerName') return 99;
    if (tableType === 'products' && field === 'customerName') return 0;
    if (tableType === 'products' && field === 'productName') return 99;
  }

  if (normalized === 'customer id' || headerCompact === 'customerid') {
    if (field === 'productSku' || field === 'productId') return 0;
    if (field === 'customerId') return 99;
  }

  if (normalized === 'quantity' || normalized === 'qty' || normalized === 'order quantity') {
    if (field === 'quantity') return 99;
    if (field === 'orderTotal' || field === 'revenue') return 0;
  }

  if (normalized === 'gender' || normalized === 'sex') {
    if (field === 'customerGender') return 99;
    if (field === 'customerStatus' || field === 'orderTotal') return 0;
  }
  
  // Exact match with aliases gets highest score
  if (aliases.some(alias => normalizeHeader(alias) === normalized)) return 99;
  
  // High score for exact compact match
  if (aliases.some(alias => compact(alias) === headerCompact)) return 95;
  
  // Good score if one includes the other, but penalize short acronyms matching accidentally
  if (aliases.some(alias => {
    const aliasC = compact(alias);
    if (aliasC.length < 3 || headerCompact.length < 3) return false;
    return headerCompact.includes(aliasC) || aliasC.includes(headerCompact);
  })) return 85;

  const words = normalized.split(' ').filter(Boolean);
  const aliasWords = aliases.flatMap(alias => normalizeHeader(alias).split(' '));
  const overlap = words.filter(word => aliasWords.includes(word)).length;
  if (overlap > 0) return Math.min(80, 50 + overlap * 15);
  return 0;
};

const valuePatternScoreForField = (values, field, tableType = '') => {
  const safeValues = values.map(value => String(value ?? '').trim()).filter(Boolean);
  if (safeValues.length === 0) return 0;
  const ratio = (predicate) => safeValues.filter(predicate).length / safeValues.length;
  const emailRatio = ratio(value => EMAIL_RE.test(value));
  const dateRatio = ratio(isDateLikeValue);
  const currencyRatio = ratio(value => {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) && parsed >= 0 && (/[$€£₹]/.test(value) || /\d+\.\d{1,2}/.test(cleaned));
  });
  const integerRatio = ratio(value => /^\d+$/.test(value) && Number(value) >= 0);
  const skuRatio = ratio(value => /[a-z]/i.test(value) && /\d/.test(value) && /^[a-z0-9._/#-]+$/i.test(value) && value.length <= 40);
  const textRatio = ratio(value => /[a-z]/i.test(value) && value.length > 2 && value.length <= 80);
  const nameRatio = ratio(value => /^[a-z]+(?:\s+[a-z]+){1,3}$/i.test(value));

  if (field === 'customerEmail' && emailRatio >= 0.6) return 98;
  if (field === 'orderDate' && dateRatio >= 0.6) return 96;
  if ((field === 'productPrice' || field === 'orderTotal' || field === 'revenue') && currencyRatio >= 0.6) return field === 'productPrice' && tableType === 'products' ? 94 : 90;
  if ((field === 'productStock' || field === 'quantity' || field === 'productSales' || field === 'reorderLevel') && integerRatio >= 0.8) return 78;
  if (field === 'productSku' && skuRatio >= 0.6) return 92;
  if (field === 'customerName' && tableType === 'customers' && nameRatio >= 0.5) return 88;
  if (field === 'productName' && tableType === 'products' && textRatio >= 0.6 && skuRatio < 0.4) return 86;
  return 0;
};

export const autoRemapProductFields = (mappings = [], headers = []) => {
  const mappedFields = new Set(mappings.filter(m => m.suggestedField).map(m => m.suggestedField));
  
  if (!mappedFields.has('productName')) {
    const candidateColumn = headers.find(h => {
      const norm = h.toLowerCase().trim();
      return ['product name', 'product_name', 'item name', 'item_name', 'product', 'item', 'product title', 'line item', 'variant name'].includes(norm) ||
             (norm.includes('product') && !norm.includes('id') && !norm.includes('sku') && !norm.includes('total') && !norm.includes('amount') && !norm.includes('price') && !norm.includes('sales') && !norm.includes('revenue'));
    });
    if (candidateColumn) {
      const existing = mappings.find(m => m.sourceColumn === candidateColumn);
      if (existing) {
        existing.suggestedField = 'productName';
        existing.suggestedLabel = FIELD_LABELS.productName;
        existing.entity = FIELD_ENTITIES.productName;
        existing.confidence = 90;
      }
    }
  }

  if (!mappedFields.has('productSku')) {
    const candidateColumn = headers.find(h => {
      const norm = h.toLowerCase().trim();
      return ['sku', 'product sku', 'product_sku', 'variant sku', 'item sku', 'item_sku', 'sku code', 'sku_code'].includes(norm);
    });
    if (candidateColumn) {
      const existing = mappings.find(m => m.sourceColumn === candidateColumn);
      if (existing) {
        existing.suggestedField = 'productSku';
        existing.suggestedLabel = FIELD_LABELS.productSku;
        existing.entity = FIELD_ENTITIES.productSku;
        existing.confidence = 90;
      }
    }
  }
};

export const inferColumnMappings = (rows, datasetName = '', tableTypeOverride = '') => {
  const headerSet = new Set();
  const sample = rows.slice(0, 100);
  sample.forEach(row => {
    if (row && typeof row === 'object') {
      Object.keys(row).forEach(k => headerSet.add(k));
    }
  });
  const headers = Array.from(headerSet);
  
  const tableDetection = detectImportTableType(rows, [], datasetName, tableTypeOverride);
  const tableType = tableDetection.tableType;
  const allowedFields = allowedFieldsForTable(tableType);

  const mappings = headers.map(header => {
    const values = sampleValuesForColumn(rows, header, 50);
    const best = Object.keys(FIELD_LABELS)
      .map(field => {
        let confidence = Math.max(
          scoreHeaderForField(header, field, tableType),
          valuePatternScoreForField(values, field, tableType)
        );
        if (['productName', 'productId', 'productSku'].includes(field) && isMonetaryHeader(header)) {
          confidence = 0;
        }
        if (tableType && tableType !== 'unknown') {
          if (!allowedFields.has(field)) {
            confidence = 0;
          }
        }
        confidence = blockDateToIdMapping(header, values, field, confidence);
        return { field, confidence };
      })
      .sort((a, b) => b.confidence - a.confidence)[0];

    const candidate = {
      sourceColumn: header,
      suggestedField: (best && best.confidence > 0) ? best.field : '',
      suggestedLabel: (best && best.confidence > 0) ? FIELD_LABELS[best.field] : 'Unmapped',
      entity: (best && best.confidence > 0) ? FIELD_ENTITIES[best.field] : 'Unmapped',
      confidence: best?.confidence || 0,
    };

    const next = applyDatasetContextToMapping(candidate, rows, tableType);
    return next;
  });

  autoRemapProductFields(mappings, headers);
  return mappings;
};

export const mappingsToColumnMap = (mappings) => {
  const ranked = [...(mappings || [])]
    .filter(item => item.suggestedField && item.sourceColumn)
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

  const usedSources = new Set();
  const map = {};

  ranked.forEach((item) => {
    const field = item.suggestedField === 'inventoryStockQuantity' ? 'productStock' : item.suggestedField;
    if (usedSources.has(item.sourceColumn) || map[field]) return;
    usedSources.add(item.sourceColumn);
    map[field] = item.sourceColumn;
  });

  return map;
};

export const inferColumnMap = (rows) => mappingsToColumnMap(inferColumnMappings(rows));

export const buildImportColumnReport = (datasets = {}, sheetMappings = {}, sheetTableTypes = {}) => (
  Object.entries(datasets).map(([sheetName, rows]) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const mappings = sheetMappings[sheetName] || inferColumnMappings(safeRows, sheetName, sheetTableTypes[sheetName]);
    const detection = detectImportTableType(safeRows, mappings, sheetName, sheetTableTypes[sheetName]);
    const requirements = schemaRequirementsForTable(detection.tableType);
    const mappedFields = new Set(mappings.filter(item => item.suggestedField).map(item => item.suggestedField));
    const sourceColumns = Array.from(new Set(
      safeRows.slice(0, 100).flatMap(row => (row && typeof row === 'object') ? Object.keys(row) : [])
    ));

    return {
      sheetName,
      tableType: detection.tableType,
      confidence: detection.confidence,
      columns: sourceColumns,
      mappings: mappings
        .filter(item => item.suggestedField)
        .map(item => ({
          sourceColumn: item.sourceColumn,
          targetField: item.suggestedField,
          label: item.suggestedLabel,
          confidence: item.confidence,
        })),
      unmappedColumns: getUnmappedSourceColumns(mappings),
      missingExpectedFields: requirements.expected.filter(field => !mappedFields.has(field)),
      extraColumns: getUnmappedSourceColumns(mappings),
    };
  })
);

export const validateEntityMappingConsistency = (rows, mappings = inferColumnMappings(rows), datasetName = 'Imported data', tableTypeOverride = '') => {
  const issues = [];
  const profile = getDatasetProfile(rows);
  const detection = detectImportTableType(rows, mappings, datasetName, tableTypeOverride);
  const allowedFields = allowedFieldsForTable(detection.tableType);
  const requirements = schemaRequirementsForTable(detection.tableType);
  const mappedProductFields = mappings.filter(item => PRODUCT_FIELDS.has(item.suggestedField));
  const mappedCustomerFields = mappings.filter(item => CUSTOMER_FIELDS.has(item.suggestedField));

  const addIssue = ({ column, message, suggestedFix, sampleValues = [] }) => {
    issues.push({
      severity: 'warning',
      rowNumber: 'preview',
      column,
      message: `${datasetName}: ${message}`,
      suggestedFix: sampleValues.length
        ? `${suggestedFix} Preview values: ${sampleValues.join(', ')}.`
        : suggestedFix,
    });
  };

  if (detection.tableType === 'unknown') {
    addIssue({
      column: 'Sheet',
      message: 'Could not confidently detect whether this is Products, Customers, Orders, or Inventory.',
      suggestedFix: 'Use clear headers such as Product Name/SKU, Customer Name/Email, Order ID, or Product ID/Current Stock.',
    });
    return issues;
  }

  mappings
    .filter(item => item.suggestedField && !allowedFields.has(item.suggestedField))
    .forEach(item => {
      addIssue({
        column: item.sourceColumn,
        message: `"${item.sourceColumn}" is mapped to ${item.suggestedLabel}, but this sheet was detected as ${requirements.label}.`,
        suggestedFix: `Only ${requirements.label} schema fields can be imported from this sheet. Choose a ${requirements.label} field or leave it unmapped.`,
        sampleValues: sampleValuesForColumn(rows, item.sourceColumn),
      });
    });

  const fieldSet = fieldSetFromMappings(mappings);
  const hasRequiredIdentity = requirements.requiredAny.length === 0 || requirements.requiredAny.some(([field]) => fieldSet.has(field));
  if (!hasRequiredIdentity) {
    addIssue({
      column: requirements.requiredAny.map(([, label]) => label).join(' or '),
      message: `${requirements.label} sheet is missing a required identity field.`,
      suggestedFix: `Map at least one of: ${requirements.requiredAny.map(([, label]) => label).join(', ')}.`,
    });
  }

  if (profile.looksCustomerDataset && !profile.looksProductDataset && mappedProductFields.length > 0) {
    mappedProductFields.forEach(item => {
      addIssue({
        column: item.sourceColumn,
        message: `"${item.sourceColumn}" is mapped to ${item.suggestedLabel}, but this dataset looks like customer data.`,
        suggestedFix: 'Change product mappings in this dataset to customer fields, or unmap them before importing.',
        sampleValues: sampleValuesForColumn(rows, item.sourceColumn),
      });
    });
  }

  if (profile.looksProductDataset && !profile.looksCustomerDataset && detection.tableType !== 'mixed_commerce' && mappedCustomerFields.length > 0) {
    mappedCustomerFields.forEach(item => {
      addIssue({
        column: item.sourceColumn,
        message: `"${item.sourceColumn}" is mapped to ${item.suggestedLabel}, but this dataset looks like product data.`,
        suggestedFix: 'Change customer mappings in this dataset to product fields, or unmap them before importing.',
        sampleValues: sampleValuesForColumn(rows, item.sourceColumn),
      });
    });
  }

  const productNameMapping = mappings.find(item => item.suggestedField === 'productName');
  const customerNameMapping = mappings.find(item => item.suggestedField === 'customerName');
  const emailMapping = mappings.find(item => item.suggestedField === 'customerEmail');
  if (productNameMapping && emailMapping && !customerNameMapping && profile.customerScore >= profile.productScore) {
    addIssue({
      column: productNameMapping.sourceColumn,
      message: `"${productNameMapping.sourceColumn}" is mapped to Product Name while the same rows include customer email data.`,
      suggestedFix: 'Map this column to Customer Name unless the preview clearly shows product names.',
      sampleValues: sampleValuesForColumn(rows, productNameMapping.sourceColumn),
    });
  }

  return issues;
};

export const validateMultiSheetMappingConsistency = (datasets = {}, sheetMappings = {}, sheetTableTypes = {}) => (
  Object.entries(datasets).flatMap(([sheetName, sheetRows]) => (
    validateEntityMappingConsistency(sheetRows, sheetMappings[sheetName] || inferColumnMappings(sheetRows), sheetName, sheetTableTypes[sheetName])
  ))
);

export const hasBlockingImportIssues = (analysisOrIssues) => {
  const issues = Array.isArray(analysisOrIssues)
    ? analysisOrIssues
    : (analysisOrIssues?.warnings || analysisOrIssues?.issues || []);
  // Production policy: only block truly empty / unusable datasets — never block on mapping gaps.
  return issues.some(issue =>
    issue.severity === 'error' &&
    /empty dataset|empty datasets cannot|no records|cannot be imported/i.test(String(issue.message || ''))
  );
};

export const validateImportRows = (rows, columnMap = inferColumnMap(rows), tableType = detectImportTableType(rows).tableType) => {
  const warnings = [];
  const headers = Array.from(new Set(
    rows.slice(0, 100).flatMap(row => (row && typeof row === 'object') ? Object.keys(row) : [])
  ));
  const seenSkus = new Map();
  const seenEmails = new Map();
  const seenOrders = new Map();
  const seenRows = new Map();
  const addIssue = ({ column, message, suggestedFix, sampleValues = [], severity = 'warning' }) => {
    warnings.push({
      severity,
      rowNumber: 'preview',
      column,
      message,
      suggestedFix,
      sampleValues
    });
  };

  if (!rows.length) {
    addIssue({ column: 'Dataset', message: 'Empty datasets cannot be imported.', suggestedFix: 'Choose a source that contains at least one record.', severity: 'error' });
    return warnings;
  }

  const duplicateHeaders = headers
    .map(header => normalizeHeader(header))
    .filter((header, index, list) => header && list.indexOf(header) !== index);
  Array.from(new Set(duplicateHeaders)).forEach(header => {
    addIssue({ column: header, message: `Duplicate column detected: "${header}".`, suggestedFix: 'Rename or remove duplicate columns before importing.', severity: 'error' });
  });

  // Entity detection based on available columns
  const isProductDataset = tableType === 'products';
  const isOrderDataset = tableType === 'orders' || tableType === 'mixed_commerce' || tableType === 'revenue' || tableType === 'sales';
  const hasProducts = Boolean(columnMap.productName || columnMap.productSku);
  const hasCustomers = Boolean(columnMap.customerName || columnMap.customerEmail);
  const hasOrders = Boolean(columnMap.orderId || columnMap.orderDate || columnMap.orderTotal || columnMap.quantity);
  
  // Mandatory fields checking based on context
  if (isProductDataset && hasProducts) {
    if (!columnMap.productName) {
      addIssue({ column: 'Product Name', message: `Missing required field: Product Name.`, suggestedFix: `Please map a column to Product Name.`, severity: 'error' });
    }
  }
  
  if (hasCustomers) {
    if (!columnMap.customerName && !columnMap.customerEmail) {
      addIssue({ column: 'Customer Info', message: `Missing required customer identity fields.`, suggestedFix: `Please map a column to Customer Name or Customer Email.`, severity: 'error' });
    }
  }

  if (hasOrders && !columnMap.orderId) {
    addIssue({ column: 'Order ID', message: 'Missing required field: Order ID.', suggestedFix: 'Map Order ID, Invoice Number, or Transaction ID to Order ID.', severity: 'error' });
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +1 for 0-index, +1 for header row
    const get = (field) => row[columnMap[field]] ?? '';
    
    // Values
    const sku = String(get('productSku')).trim();
    const priceRaw = get('productPrice');
    const stockRaw = get('productStock');
    const email = String(get('customerEmail')).trim();
    const orderId = String(get('orderId')).trim();
    const orderDate = get('orderDate');
    const orderTotalRaw = get('orderTotal') || get('revenue');
    const quantityRaw = get('quantity');
    const firstName = String(get('firstName')).trim();
    const lastName = String(get('lastName')).trim();
    const customerName = String(get('customerName')).trim() || [firstName, lastName].filter(Boolean).join(' ');

    const rowSignature = JSON.stringify(row);
    if (seenRows.has(rowSignature)) {
      addIssue({ rowNumber, column: 'Record', message: `Duplicate record found.`, suggestedFix: `This row matches row ${seenRows.get(rowSignature)}. Remove one copy before importing.`, severity: 'error' });
    } else {
      seenRows.set(rowSignature, rowNumber);
    }

    // Price checks
    if (columnMap.productPrice && priceRaw !== '') {
      const parsedPrice = parseNumber(priceRaw, Number.NaN);
      if (Number.isNaN(parsedPrice)) {
        addIssue({ rowNumber, column: columnMap.productPrice, message: `Invalid currency value ("${priceRaw}").`, suggestedFix: 'Use a numeric currency value such as 19.99.', severity: 'error' });
      } else if (parsedPrice < 0) {
        addIssue({ rowNumber, column: columnMap.productPrice, message: 'Negative currency values are not allowed.', suggestedFix: 'Ensure price is 0 or greater.', severity: 'error' });
      }
    }

    // Stock checks
    if (columnMap.productStock && stockRaw !== '') {
      const parsedStock = parseNumber(stockRaw, Number.NaN);
      if (Number.isNaN(parsedStock)) {
        addIssue({ rowNumber, column: columnMap.productStock, message: `Invalid numeric value ("${stockRaw}").`, suggestedFix: 'Use a whole number.', severity: 'error' });
      }
    }

    if (columnMap.quantity && quantityRaw !== '') {
      const parsedQuantity = parseNumber(quantityRaw, Number.NaN);
      if (Number.isNaN(parsedQuantity)) {
        addIssue({ rowNumber, column: columnMap.quantity, message: `Invalid numeric value ("${quantityRaw}").`, suggestedFix: 'Use a whole number for quantity.', severity: 'error' });
      }
    }

    if ((columnMap.orderTotal || columnMap.revenue) && orderTotalRaw !== '') {
      const parsedAmount = parseNumber(orderTotalRaw, Number.NaN);
      if (Number.isNaN(parsedAmount)) {
        addIssue({ rowNumber, column: columnMap.orderTotal || columnMap.revenue, message: `Invalid currency value ("${orderTotalRaw}").`, suggestedFix: 'Use a numeric currency value such as 125.50.', severity: 'error' });
      }
    }

    if (columnMap.orderDate && orderDate !== '' && !parseDate(orderDate)) {
      addIssue({ rowNumber, column: columnMap.orderDate, message: `Invalid date value ("${orderDate}").`, suggestedFix: 'Use a valid date such as 2026-06-04.', severity: 'error' });
    }

    // SKU deduplication checks
    if (isProductDataset && sku) {
      if (seenSkus.has(sku)) {
        addIssue({ rowNumber, column: columnMap.productSku, message: `Duplicate SKU ("${sku}") found.`, suggestedFix: `SKU must be unique. Also found on row ${seenSkus.get(sku)}.`, severity: 'warning' });
      } else {
        seenSkus.set(sku, rowNumber);
      }
    }

    // Email checks and deduplication
    if (email) {
      if (!EMAIL_RE.test(email)) {
        addIssue({ rowNumber, column: columnMap.customerEmail, message: `Invalid email address ("${email}").`, suggestedFix: 'Use a valid email format such as name@domain.com.', severity: 'error' });
      } else if (seenEmails.has(email)) {
        addIssue({ rowNumber, column: columnMap.customerEmail, message: `Duplicate customer email ("${email}").`, suggestedFix: `Email also found on row ${seenEmails.get(email)}.`, severity: 'warning' });
      } else {
        seenEmails.set(email, rowNumber);
      }
    }

    if (orderId) {
      if (seenOrders.has(orderId)) {
        addIssue({ rowNumber, column: columnMap.orderId, message: `Duplicate order ID ("${orderId}") found.`, suggestedFix: `Order ID also appears on row ${seenOrders.get(orderId)}. Use unique order IDs or split line items consistently.`, severity: 'warning' });
      } else {
        seenOrders.set(orderId, rowNumber);
      }
    }

    // Product name check
    if (isProductDataset && hasProducts && !get('productName') && !sku) {
       addIssue({ rowNumber, column: columnMap.productName || 'Product Name', message: 'Product missing both Name and SKU.', suggestedFix: 'Provide a Name or SKU to identify the product.', severity: 'error' });
    }

    // Customer name fallback check
    if (!isOrderDataset && hasCustomers && !customerName && !email) {
      addIssue({ rowNumber, column: columnMap.customerName || 'Customer Name', message: 'Customer missing Name and Email.', suggestedFix: 'Provide a Name or Email to identify the customer.', severity: 'error' });
    }
  });

  return warnings;
};

export const analyzeBusinessData = (rows, source = 'csv', mappings = inferColumnMappings(rows), tableTypeOverride = '') => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const columnMap = mappingsToColumnMap(mappings);
  const tableDetection = detectImportTableType(safeRows, mappings, '', tableTypeOverride);
  const headers = Array.from(new Set(
    safeRows.slice(0, 100).flatMap(row => (row && typeof row === 'object') ? Object.keys(row) : [])
  ));
  const stockDataExists = hasMappedOrHeader(headers, ['productStock', 'inventoryStockQuantity']);
  const validationWarnings = [
    ...validateEntityMappingConsistency(safeRows, mappings, 'Imported data', tableTypeOverride),
    ...validateImportRows(safeRows, columnMap, tableDetection.tableType),
    ...(stockDataExists && !columnMap.productStock ? [{
      severity: 'error',
      rowNumber: 'preview',
      column: 'Stock Quantity',
      message: 'Inventory mapping failed. Stock data exists in source file but was not persisted.',
      suggestedFix: 'Map the stock source column to Stock Quantity before importing.',
    }] : []),
  ];
  const detectedEntities = {
    products: Boolean(columnMap.productName || columnMap.productSku),
    customers: Boolean(columnMap.customerName || columnMap.customerEmail || columnMap.firstName || columnMap.lastName),
    orders: Boolean(columnMap.orderId || columnMap.orderTotal || columnMap.quantity),
    inventory: Boolean(columnMap.productStock || columnMap.reorderLevel),
    suppliers: Boolean(columnMap.supplierName),
    categories: Boolean(columnMap.productCategory),
    revenue: Boolean(columnMap.revenue || columnMap.orderTotal),
    transactions: Boolean(columnMap.transactionId),
    invoices: Boolean(columnMap.invoiceId),
  };
  const confidence = mappings.length
    ? Math.round(mappings.reduce((sum, item) => sum + item.confidence, 0) / mappings.length)
    : 0;

  return {
    source,
    sourceLabel: SOURCE_LABELS[source] || SOURCE_LABELS.business_software,
    rowCount: safeRows.length,
    columnMap,
    mappings,
    detectedEntities,
    confidence,
    warnings: validationWarnings,
    tableDetection,
    stockDataExists,
    schema: NORMALIZED_SCHEMA,
    chunkSize: CHUNK_SIZE,
  };
};

export const normalizeBusinessData = (rows, source = 'csv', manualMappings, tableTypeOverride = '', existingProducts = [], existingCustomers = []) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const mappings = manualMappings || inferColumnMappings(safeRows);
  const analysis = analyzeBusinessData(safeRows, source, mappings, tableTypeOverride);
  
  const { columnMap } = analysis;
  const tableType = analysis.tableDetection.tableType;
  const productsByKey = new Map();
  const customersByKey = new Map();
  const ordersByKey = new Map();
  const inventoryByKey = new Map();
  const productIndexes = { byId: new Map(), bySku: new Map(), byName: new Map() };

  const existingProductIndexes = { byId: new Map(), bySku: new Map(), byName: new Map() };
  if (Array.isArray(existingProducts)) {
    existingProducts.forEach(p => {
      addProductAliases(existingProductIndexes, p);
    });
  }

  const existingCustomersByKey = new Map();
  if (Array.isArray(existingCustomers)) {
    existingCustomers.forEach(c => {
      const id = normalizeImportText(c.id);
      const email = normalizeImportText(c.email).toLowerCase();
      const name = normalizeImportText(c.name);
      const key = id || email || compact(name);
      if (key) {
        existingCustomersByKey.set(key, c);
      }
      if (id) existingCustomersByKey.set(id, c);
      if (email) existingCustomersByKey.set(email, c);
      if (name) existingCustomersByKey.set(compact(name), c);
    });
  }
  const productMappingReport = createMappingReport();
  const inventoryDiagnostics = [];
  const productAuditLog = createImportAuditLog();

  let skippedCustomersCount = 0;
  let skippedOrdersCount = 0;
  let skippedProductsCount = 0;
  const skippedRowWarnings = [];

  for (let start = 0; start < safeRows.length; start += CHUNK_SIZE) {
    safeRows.slice(start, start + CHUNK_SIZE).forEach((row, offset) => {
      const rowNumber = start + offset + 2;
      const get = (field) => row[columnMap[field]] ?? '';
      const mappedFields = Object.fromEntries(
        Object.entries(columnMap).map(([field, column]) => [field, row[column] ?? null])
      );
      const productId = normalizeImportText(getValueWithFallback(row, 'productId', columnMap));
      const productName = normalizeImportText(getValueWithFallback(row, 'productName', columnMap));
      const sku = normalizeSku(getValueWithFallback(row, 'productSku', columnMap));
      const productKey = productId || sku || compact(productName);
      const isOrderLike = tableType === 'orders' || tableType === 'mixed_commerce' || tableType === 'revenue' || tableType === 'sales';
      const shouldCreateProduct = (tableType === 'products' || isOrderLike) && (productName || sku);
      const existingProduct = findProductMatch(productIndexes, { productId, sku, productName });

      if (tableType === 'products' && (productName || sku)) {
        logProductAudit(productAuditLog, {
          stage: 'read',
          sheet: 'Imported Data',
          row: rowNumber,
          productKey,
          productName: productName || sku,
          source: PRODUCT_ORIGIN.UPLOADED_FILE,
        });
      }

      if (shouldCreateProduct && productKey && !existingProduct && !productsByKey.has(productKey)) {
        // Validate product has name and sku
        if (!productName || !sku) {
          skippedProductsCount += 1;
          skippedRowWarnings.push({
            severity: 'warning',
            rowNumber,
            column: 'SKU / Product Name',
            message: 'Row skipped: Product Name and SKU are required.',
            suggestedFix: 'Provide a Product Name and SKU for every product row.'
          });
          return;
        }

        const price = Math.max(0, parseNumber(getValueWithFallback(row, 'productPrice', columnMap), 0) || 0);
        const stock = parseNumber(getValueWithFallback(row, 'productStock', columnMap) || getValueWithFallback(row, 'inventoryStockQuantity', columnMap), 0) || 0;
        const product = attachExtraFields({
          id: productId || sku || null,
          name: coalesceImportValue(productName || sku),
          product_name: coalesceImportValue(productName || sku),
          sku: sku || EMPTY_IMPORT_VALUE,
          category: coalesceImportValue(normalizeImportText(getValueWithFallback(row, 'productCategory', columnMap)) || 'Uncategorized'),
          price,
          stock,
          baseStock: stock,
          importedStock: stock,
          status: normalizeProductStatus(),
          inventoryStatus: getInventoryStatus(stock),
          reorderLevel: parseNumber(getValueWithFallback(row, 'reorderLevel', columnMap), null),
          sourceSalesCount: Math.max(0, parseNumber(getValueWithFallback(row, 'productSales', columnMap), 0) || 0),
          salesCount: 0,
          revenue: 0,
          desc: '',
          mappedFields,
          source,
          sourceOrigin: PRODUCT_ORIGIN.UPLOADED_FILE,
          sourceSheet: 'Imported Data',
          createdAt: null,
        }, row, mappings);
        productsByKey.set(productKey, product);
        addProductAliases(productIndexes, product);
        logProductAudit(productAuditLog, {
          stage: 'added',
          sheet: 'Imported Data',
          row: rowNumber,
          productKey,
          productId: product.id,
          source: PRODUCT_ORIGIN.UPLOADED_FILE,
        });
      } else if (shouldCreateProduct && productKey && (existingProduct || productsByKey.has(productKey))) {
        logProductAudit(productAuditLog, {
          stage: 'duplicate',
          sheet: 'Imported Data',
          row: rowNumber,
          productKey,
          source: PRODUCT_ORIGIN.UPLOADED_FILE,
        });
      } else if (isOrderLike && (productName || sku) && productKey) {
        logProductAudit(productAuditLog, {
          stage: 'rejected',
          sheet: 'Imported Data',
          row: rowNumber,
          productKey,
          reason: 'order_row_not_product_sheet',
          source: PRODUCT_ORIGIN.ORDER_DERIVED,
        });
      }

      const customerId = String(getValueWithFallback(row, 'customerId', columnMap)).trim();
      const customerEmail = String(getValueWithFallback(row, 'customerEmail', columnMap)).trim().toLowerCase();
      const customerName = getCustomerNameFromRow(row, columnMap);
      const customerKey = customerId || customerEmail || compact(customerName);

      if ((tableType === 'customers' || isOrderLike) && (customerName || customerEmail) && customerKey && !customersByKey.has(customerKey)) {
        // For customer sheets: require at least one of name or email (not both strictly)
        // Email-only or name-only customers are allowed; name defaults to 'None' if missing

        const ageRaw = getValueWithFallback(row, 'customerAge', columnMap);
        const dobRaw = getValueWithFallback(row, 'customerDob', columnMap);
        if (ageRaw && ageRaw !== EMPTY_IMPORT_VALUE && ageRaw !== '') {
          const parsed = Number(ageRaw);
          if (isNaN(parsed)) {
            const extracted = parseInt(String(ageRaw).replace(/[^0-9]/g, ''), 10);
            if (isNaN(extracted)) {
              skippedRowWarnings.push({
                severity: 'warning',
                rowNumber,
                column: 'Age',
                message: `Age must be numeric (found: "${ageRaw}").`,
                suggestedFix: 'Provide a numeric age value.'
              });
            }
          }
        }

        customersByKey.set(customerKey, attachExtraFields({
          id: customerId || customerEmail || null,
          name: coalesceImportValue(customerName),
          email: coalesceImportValue(customerEmail),
          phone: coalesceImportValue(String(getValueWithFallback(row, 'customerPhone', columnMap) || '').trim()),
          city: coalesceImportValue(String(getValueWithFallback(row, 'customerCity', columnMap) || '').trim()),
          state: coalesceImportValue(String(getValueWithFallback(row, 'customerState', columnMap) || '').trim()),
          age: ageRaw || EMPTY_IMPORT_VALUE,
          dob: dobRaw || EMPTY_IMPORT_VALUE,
          gender: coalesceImportValue(String(getValueWithFallback(row, 'customerGender', columnMap) || '').trim()),
          status: coalesceImportValue(String(getValueWithFallback(row, 'customerStatus', columnMap) || '').trim()),
          totalPurchases: 0,
          mappedFields,
          source,
          regDate: null,
        }, row, mappings));
      }

      if (tableType === 'inventory' && (productId || sku || productName)) {
        const inventoryKey = productId || sku || compact(productName);
        inventoryByKey.set(inventoryKey, {
          productId,
          sku,
          product: productName,
          stock: readStock(get) ?? 0,
          stockQuantity: readStock(get) ?? 0,
          reorder_level: Math.max(0, parseNumber(get('reorderLevel'), 5) || 5),
          reorderLevel: Math.max(0, parseNumber(get('reorderLevel'), 5) || 5),
          status: normalizeProductStatus(),
          inventoryStatus: getInventoryStatus(readStock(get) ?? 0),
          source,
          lastUpdated: get('lastUpdated') || null,
        });
      }
      if (productName || sku || columnMap.productStock) {
        inventoryDiagnostics.push({
          rowNumber,
          detectedSku: sku || null,
          detectedProductName: productName || null,
          detectedStockQuantity: readStock(get),
          createdProductId: (productsByKey.get(productKey) || existingProduct)?.id || null,
          createdInventoryRecord: Boolean(inventoryByKey.has(productKey) || productsByKey.has(productKey)),
        });
      }

      if (!isOrderLike) return;

      const orderId = String(getValueWithFallback(row, 'orderId', columnMap)).trim();
      // Require explicit orderId — do not fabricate order keys
      if (!orderId) {
        skippedOrdersCount += 1;
        return;
      }

      const quantity = Math.max(1, parseNumber(getValueWithFallback(row, 'quantity', columnMap), 1) || 1);
      let product = findProductMatch(productIndexes, { productId, sku, productName });
      if (!product) {
        product = findProductMatch(existingProductIndexes, { productId, sku, productName });
      }
      const customerPhone = String(getValueWithFallback(row, 'customerPhone', columnMap)).trim();
      let customer = findCustomerForOrder({ customerId, customerName, customerEmail, customerPhone }, [
        ...existingCustomersByKey.values(),
        ...customersByKey.values()
      ]);

      // Only enforce customer link if there are customers available to match against.
      // For purely order-only datasets (no customer pool), allow orders to proceed unlinked.
      const customerPoolSize = existingCustomersByKey.size + customersByKey.size;
      if (!customer && customerPoolSize > 0) {
        skippedOrdersCount += 1;
        skippedRowWarnings.push({
          severity: 'warning',
          rowNumber,
          column: 'Customer Link',
          message: `Row skipped: Order ${orderId} cannot be linked to a valid customer.`,
          suggestedFix: 'Ensure every order contains customer information that matches an existing or imported customer.'
        });
        return;
      }

      if (!product) {
        skippedRowWarnings.push({
          severity: 'warning',
          rowNumber,
          column: 'Product SKU',
          message: `Product SKU "${sku || productId || productName}" in Order ${orderId} does not reference a valid product SKU.`,
          suggestedFix: 'Ensure all ordered products are created or mapped to valid SKUs.'
        });
      }

      const orderKey = orderId;
      const unitPrice = parseNumber(getValueWithFallback(row, 'productPrice', columnMap), null);
      const productPrice = parseNumber(product?.price, null);
      const orderTotal = deriveOrderAmount({
        orderTotal: getValueWithFallback(row, 'orderTotal', columnMap),
        netAmount: mappedFields.netAmount ?? mappedFields.orderTotal,
        grossAmount: mappedFields.grossAmount ?? row['Gross Amount'] ?? row['gross amount'],
        discountAmount: mappedFields.discountAmt ?? row['Discount Amt'] ?? row['Discount Amount'],
        quantity,
        unitPrice,
        productPrice,
        revenue: getValueWithFallback(row, 'revenue', columnMap),
      });
      const _derivedTotal = !(parseNumber(getValueWithFallback(row, 'orderTotal', columnMap), null) > 0);

      const orderItemsRaw = columnMap.orderItems ? getValueWithFallback(row, 'orderItems', columnMap) : null;
      const builtItems = buildOrderItemsFromRow({
        orderItemsRaw,
        sku,
        productName,
        quantity,
        product,
      });

      builtItems.forEach(item => {
        const itemProduct = findProductMatch(productIndexes, { sku: item.sku, productName: item.productName })
          || findProductMatch(existingProductIndexes, { sku: item.sku, productName: item.productName });
        if (itemProduct) {
          itemProduct.salesCount += item.quantity;
          const lineRev = deriveOrderAmount({ quantity: item.quantity, unitPrice: item.unitPrice, productPrice: itemProduct.price });
          itemProduct.revenue += lineRev;
        }
        recordOrderSkuMatch(productMappingReport, { orderId, sku: item.sku, product: itemProduct, productName: item.productName });
      });

      if (!builtItems.length && product) {
        product.salesCount += quantity;
        product.revenue += orderTotal;
        recordOrderSkuMatch(productMappingReport, { orderId, sku: sku || productId, product, productName });
      }
      if (customer) customer.totalPurchases += 1;

      const itemsToAdd = builtItems.length
        ? builtItems.map(line => ({ ...line, order_id: orderId, lineRevenue: deriveOrderAmount({ quantity: line.quantity, unitPrice: line.unitPrice, productPrice: product?.price }), mappedFields }))
        : [{
          order_id: orderId,
          productId: product?.id || productId || '',
          sku: product?.sku || sku || normalizeSku(productId),
          productName: product?.name || productName || sku || productId || '',
          product_name: product?.product_name || product?.name || productName || sku || productId || '',
          qty: quantity,
          quantity,
          unitPrice: unitPrice ?? productPrice ?? null,
          lineRevenue: orderTotal,
          mappedFields,
        }];
      const existingOrder = ordersByKey.get(orderKey);

      if (existingOrder) {
        existingOrder.items.push(...itemsToAdd);
        existingOrder.total += orderTotal;
        existingOrder.amount = existingOrder.total;
        existingOrder.quantity += quantity;
      } else {
        ordersByKey.set(orderKey, attachExtraFields({
          id: orderKey,
          customerId: (customer?.id && customer.id !== EMPTY_IMPORT_VALUE) ? customer.id : (customerId || null),
          customer: coalesceImportValue(customer?.name || customerName || customerEmail || customerId),
          customerPhone,
          product: (product?.name || productName) ? coalesceImportValue(product?.name || productName) : '',
          quantity,
          amount: orderTotal,
          date: parseDate(getValueWithFallback(row, 'orderDate', columnMap)),
          total: orderTotal,
          status: coalesceImportValue(String(getValueWithFallback(row, 'orderStatus', columnMap) || '').trim()),
          items: itemsToAdd,
          mappedFields,
          source,
          _derivedTotal,
          createdAt: null,
        }, row, mappings));
      }
    });
  }

  // Finalize order products to be the items breakdown
  for (const order of ordersByKey.values()) {
    if (order.items && order.items.length > 0) {
      // Filter out items whose names are monetary terms or placeholder "None" strings
      const validItems = order.items.filter(i => {
        const name = i.productName || i.product_name || i.sku || '';
        if (!name) return false;
        if (name === EMPTY_IMPORT_VALUE || name === 'null' || name === 'undefined') return false;
        return !isMonetaryTerm(name);
      });

      if (validItems.length > 0) {
        // Aggregate duplicate products by name
        const aggregated = new Map();
        validItems.forEach(i => {
          const key = (i.productName || i.product_name || i.sku || '').trim();
          if (!key) return;
          const qty = Math.max(1, Number(i.qty ?? i.quantity ?? 1) || 1);
          if (aggregated.has(key)) {
            aggregated.get(key).qty += qty;
          } else {
            aggregated.set(key, { name: key, qty });
          }
        });
        order.product = Array.from(aggregated.values())
          .map(entry => `${entry.qty}x ${entry.name}`)
          .join(', ');
      } else {
        order.product = '';
      }
    } else if (!order.product || isMonetaryTerm(order.product) || order.product === EMPTY_IMPORT_VALUE) {
      order.product = '';
    }
  }

  const products = Array.from(productsByKey.values()).map(product => ({
    ...product,
    salesCount: deriveProductSalesCount({ sourceSalesCount: product.sourceSalesCount, salesFromOrders: product.salesCount }),
  }));
  const uploadedProductCount = tableType === 'products' ? safeRows.length : 0;
  const productImportStats = buildProductImportStats({
    uploadedProductCount,
    importedProducts: products,
    auditLog: productAuditLog,
  });

  console.log('[Import] Product audit (single-sheet):', {
    readFromFile: productAuditLog.productsReadFromFile.length,
    addedDuringTransform: productAuditLog.productsAddedDuringTransformation.length,
    duplicatesSkipped: productAuditLog.duplicatesSkipped.length,
    rejected: productAuditLog.productsRejected.length,
    imported: productImportStats.importedProductCount,
  });

  return (() => {
    const finalized = finalizeImportEntities({
      products,
      customers: Array.from(customersByKey.values()),
      orders: Array.from(ordersByKey.values()),
    });
    return {
      analysis: { ...analysis, productMappingReport: finalized.productMappingReport || productMappingReport, inventoryDiagnostics, productAuditLog, productImportStats, warnings: [...analysis.warnings, ...skippedRowWarnings], skippedCustomersCount, skippedOrdersCount, skippedProductsCount },
      products: finalized.products,
      customers: finalized.customers,
      orders: finalized.orders,
      inventory: tableType === 'inventory'
        ? Array.from(inventoryByKey.values())
        : Array.from(productsByKey.values()).map(product => ({
          productId: product.id,
          sku: product.sku,
          product: product.name,
          stock: product.stock,
          stockQuantity: product.stock,
          reorder_level: product.reorderLevel,
          reorderLevel: product.reorderLevel,
          status: normalizeProductStatus(),
          inventoryStatus: getInventoryStatus(product.stock),
        })),
    };
  })();
};

export const generateImportAnalytics = ({ products = [], customers = [], orders = [] }) => {
  // Total revenue calculation
  const revenue = orders.reduce((sum, order) => sum + Number(order.total || order.amount || 0), 0);

  // Top-selling products (by salesCount)
  const topProducts = [...products]
    .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
    .slice(0, 5);

  // Low‑stock products for inventory recommendations
  const lowStock = products.filter(p => Number(p.stock || 0) <= Number(p.reorderLevel || 5));

  // Most common customer cities
  const customerCities = Object.entries(
    customers.reduce((acc, c) => {
      const city = (c.city || c.location || '').trim();
      if (!city) return acc; // skip fabricated/empty cities
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([city, count]) => `${city}: ${count} customer${count === 1 ? '' : 's'}`);

  // Sales trend by date
  const salesByDate = orders.reduce((acc, order) => {
    if (!order.date) return acc; // skip fabricated date buckets
    const date = String(order.date).split('T')[0];
    acc[date] = (acc[date] || 0) + Number(order.total || order.amount || 0);
    return acc;
  }, {});

  // Helper map for quick product lookup
  const productMap = new Map(products.filter(p => p.id).map(p => [p.id, p]));

  // Revenue by product category (relational)
  const revenueByCategory = (() => {
    const map = {};
    orders.forEach(order => {
      order.items?.forEach(item => {
        const prod = productMap.get(item.productId);
        if (prod) {
          const cat = prod.category || null;
          if (!cat) return; // skip uncategorized
          if (!Number.isFinite(Number(prod.price)) || !Number.isFinite(Number(item.qty))) return;
          const lineTotal = Number(prod.price) * Number(item.qty);
          map[cat] = (map[cat] || 0) + lineTotal;
        }
      });
    });
    return Object.entries(map).map(([cat, total]) => `${cat}: $${total.toFixed(2)}`);
  })();

  // Sales volume by category (relational)
  const salesByCategory = (() => {
    const map = {};
    orders.forEach(order => {
      order.items?.forEach(item => {
        const prod = productMap.get(item.productId);
        if (prod) {
          const cat = prod.category || null;
          if (!cat) return; // skip uncategorized
          if (!Number.isFinite(Number(prod.price)) || !Number.isFinite(Number(item.qty))) return;
          const lineTotal = Number(prod.price) * Number(item.qty);
          map[cat] = (map[cat] || 0) + lineTotal;
        }
      });
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, total]) => `${cat}: $${total.toFixed(2)}`);
  })();

  // Product velocity (sales per day since launch)
  const productVelocity = products
    .map(p => {
      if (!p.launchDate) return null;
      const dt = new Date(p.launchDate);
      if (!Number.isFinite(dt.getTime())) return null;
      const daysSinceLaunch = (Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24);
      if (!Number.isFinite(daysSinceLaunch) || daysSinceLaunch <= 0) return null;
      const velocity = (p.salesCount || 0) / daysSinceLaunch;
      return `${p.name}: ${velocity.toFixed(2)} units/day`;
    })
    .filter(Boolean);

  // Customer acquisition growth (new customers per month)
  const customerAcquisitionGrowth = Object.entries(
    customers.reduce((acc, c) => {
      if (!c.signupDate) return acc; // skip missing dates
      const month = String(c.signupDate).slice(0, 7);
      if (!month) return acc;
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => `${month}: ${count}`);

  // Multi‑year growth profile (revenue per year)
  const multiYearGrowthProfile = Object.entries(
    orders.reduce((acc, o) => {
      if (!o.date) return acc; // skip missing dates
      const year = String(o.date).slice(0, 4);
      if (!year) return acc;
      acc[year] = (acc[year] || 0) + Number(o.total || o.amount || 0);
      return acc;
    }, {})
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, total]) => `${year}: $${total.toFixed(2)}`);

  // Assemble final analytics object
  return {
    revenueAnalysis: `Imported revenue totals $${revenue.toFixed(2)} across ${orders.length} order${orders.length === 1 ? "" : "s"}.`,
    topProducts: topProducts.map(p => `${p.name} (${p.salesCount || 0} sold)`),
    lowStockProducts: lowStock.map(p => `${p.name} (stock ${p.stock})`),
    lowStockAlerts: lowStock.map(p => `${p.name}: ${p.stock} in stock`),
    topCustomerCities: customerCities,
    customerInsights: customerCities,
    inventoryRecommendations: lowStock.map(p => `Reorder ${p.name} above ${p.reorderLevel} units.`),
    salesTrends: Object.entries(salesByDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, total]) => `${date}: $${total.toFixed(2)}`),
    revenueByCategory,
    salesByCategory,
    productVelocity,
    customerAcquisitionGrowth,
    multiYearGrowthProfile,
  };
};

/**
 * normalizeMultiSheetData — the correct path for multi-sheet Excel workbooks.
 *
 * @param {Object} datasets  { sheetName: rows[] }  — one key per worksheet
 * @param {Object} sheetMappings { sheetName: mapping[] } — per-sheet column mappings
 * @param {string} source   source type label (e.g. 'excel')
 * @returns {{ products, customers, orders, inventory, analysis }}
 *
 * Strategy:
 *   1. Identify each sheet as Products / Customers / Orders / Inventory by detecting
 *      which fields its mappings resolve to.
 *   2. Build product and customer indexes keyed by their natural IDs first.
 *   3. Cross-link Orders to Products and Customers via those IDs.
 *   4. Pull Inventory from the Inventory sheet, falling back to product stock.
 */
export const normalizeMultiSheetData = (datasets, sheetMappings, source = 'excel', sheetTableTypes = {}, existingProducts = [], existingCustomers = []) => {
  const consistencyIssues = validateMultiSheetMappingConsistency(datasets, sheetMappings, sheetTableTypes);

  const productsByKey = new Map();   // productId string → product object
  const customersByKey = new Map();  // customerId string → customer object
  const ordersByKey = new Map();     // orderId string → order object
  const inventoryByKey = new Map();  // productId string → inventory object
  const productIndexes = { byId: new Map(), bySku: new Map(), byName: new Map() };

  const existingProductIndexes = { byId: new Map(), bySku: new Map(), byName: new Map() };
  if (Array.isArray(existingProducts)) {
    existingProducts.forEach(p => {
      addProductAliases(existingProductIndexes, p);
    });
  }

  const existingCustomersByKey = new Map();
  if (Array.isArray(existingCustomers)) {
    existingCustomers.forEach(c => {
      const id = normalizeImportText(c.id);
      const email = normalizeImportText(c.email).toLowerCase();
      const name = normalizeImportText(c.name);
      const key = id || email || compact(name);
      if (key) {
        existingCustomersByKey.set(key, c);
      }
      if (id) existingCustomersByKey.set(id, c);
      if (email) existingCustomersByKey.set(email, c);
      if (name) existingCustomersByKey.set(compact(name), c);
    });
  }
  const productMappingReport = createMappingReport();
  const inventoryDiagnostics = [];
  const productAuditLog = createImportAuditLog();

  let skippedCustomersCount = 0;
  let skippedOrdersCount = 0;
  let skippedProductsCount = 0;
  const skippedRowWarnings = [];

  // Helper: resolve a column map from mappings array
  const toColMap = (mappings) =>
    (mappings || []).reduce((map, item) => {
      if (item.suggestedField) {
        const field = item.suggestedField === 'inventoryStockQuantity' ? 'productStock' : item.suggestedField;
        map[field] = item.sourceColumn;
      }
      return map;
    }, {});

  // Classify each sheet by which entity-fields its mappings cover
  const classifySheet = (rows, mappings, sheetName) => detectImportTableType(rows, mappings, sheetName, sheetTableTypes[sheetName]);

  // Pass 1 — build product + customer indexes (needed before orders can cross-link)
  Object.entries(datasets).forEach(([sheetName, rows]) => {
    const mappings = sheetMappings[sheetName] || inferColumnMappings(rows);
    const detection = classifySheet(rows, mappings, sheetName);
    const kind = detection.tableType;
    const columnMap = toColMap(mappings);
    const safeRows = Array.isArray(rows) ? rows : [];
    let importedRows = 0;
    let skippedRows = 0;

    console.log(`[Import] Sheet detected: "${sheetName}" → ${kind} (${detection.confidence}% confidence)`);
    console.log(`[Import] Column map:`, columnMap);

    if (kind === 'products') {
      safeRows.forEach((row, index) => {
        const productId = getValueWithFallback(row, 'productId', columnMap);
        const productName = getValueWithFallback(row, 'productName', columnMap);
        const sku = normalizeSku(getValueWithFallback(row, 'productSku', columnMap) || productId);
        const productKey = productId || sku || compact(productName);
        if (!productKey) {
          skippedRows += 1;
          return;
        }

        // Validate product has name and sku
        if (!productName || !sku) {
          skippedRows += 1;
          skippedProductsCount += 1;
          skippedRowWarnings.push({
            severity: 'warning',
            rowNumber: index + 2,
            column: 'SKU / Product Name',
            message: `Sheet "${sheetName}" Row ${index + 2}: Product Name and SKU are required.`,
            suggestedFix: 'Provide a Product Name and SKU for every product row.'
          });
          return;
        }

        logProductAudit(productAuditLog, {
          stage: 'read',
          sheet: sheetName,
          row: index + 2,
          productKey,
          productName: productName || sku,
          source: PRODUCT_ORIGIN.UPLOADED_FILE,
        });
        if (!productsByKey.has(productKey)) {
          const price = Math.max(0, parseNumber(getValueWithFallback(row, 'productPrice', columnMap), 0) || 0);
          const stock = parseNumber(getValueWithFallback(row, 'productStock', columnMap) || getValueWithFallback(row, 'inventoryStockQuantity', columnMap), 0) || 0;
          const product = attachExtraFields({
            id: productId || sku || null,
            name: coalesceImportValue(productName || sku),
            product_name: coalesceImportValue(productName || sku),
            sku: sku || EMPTY_IMPORT_VALUE,
            category: coalesceImportValue(normalizeImportText(getValueWithFallback(row, 'productCategory', columnMap)) || 'Uncategorized'),
            price,
            stock,
            baseStock: stock,
            importedStock: stock,
            status: normalizeProductStatus(),
            inventoryStatus: getInventoryStatus(stock),
            reorderLevel: parseNumber(getValueWithFallback(row, 'reorderLevel', columnMap), null),
            salesCount: 0,
            revenue: 0,
            desc: '',
            source,
            sourceOrigin: PRODUCT_ORIGIN.UPLOADED_FILE,
            sourceSheet: sheetName,
            createdAt: null,
          }, row, mappings);
          productsByKey.set(productKey, product);
          addProductAliases(productIndexes, product);
          importedRows += 1;
          logProductAudit(productAuditLog, {
            stage: 'added',
            sheet: sheetName,
            row: index + 2,
            productKey,
            productId: product.id,
            source: PRODUCT_ORIGIN.UPLOADED_FILE,
          });
        } else {
          logProductAudit(productAuditLog, {
            stage: 'duplicate',
            sheet: sheetName,
            row: index + 2,
            productKey,
            source: PRODUCT_ORIGIN.UPLOADED_FILE,
          });
        }
        if (productName || sku || columnMap.productStock) {
          const product = findProductMatch(productIndexes, { productId, sku, productName });
          inventoryDiagnostics.push({
            dataset: sheetName,
            rowNumber: inventoryDiagnostics.length + 2,
            detectedSku: sku || null,
            detectedProductName: productName || null,
            detectedStockQuantity: readStock(f => getValueWithFallback(row, f, columnMap)),
            createdProductId: product?.id || null,
            createdInventoryRecord: Boolean(product),
          });
        }
      });
    }

    if (kind === 'customers') {
      safeRows.forEach((row, index) => {
        const customerId = getValueWithFallback(row, 'customerId', columnMap);
        const customerName = getCustomerNameFromRow(row, columnMap);
        const email = getValueWithFallback(row, 'customerEmail', columnMap).toLowerCase();
        const customerKey = customerId || email || compact(customerName);
        if (!customerKey) {
          skippedRows += 1;
          return;
        }

        if (!customerName && !email) {
          skippedRows += 1;
          skippedCustomersCount += 1;
          skippedRowWarnings.push({
            severity: 'warning',
            rowNumber: index + 2,
            column: 'Customer Name / Email',
            message: `Sheet "${sheetName}" Row ${index + 2}: Either Customer Name or Customer Email is required.`,
            suggestedFix: 'Provide at least a customer name or email for every row.'
          });
          return;
        }

        const ageRaw = getValueWithFallback(row, 'customerAge', columnMap);
        if (ageRaw && ageRaw !== EMPTY_IMPORT_VALUE && ageRaw !== '') {
          const parsed = Number(ageRaw);
          if (isNaN(parsed)) {
            const extracted = parseInt(String(ageRaw).replace(/[^0-9]/g, ''), 10);
            if (isNaN(extracted)) {
              skippedRowWarnings.push({
                severity: 'warning',
                rowNumber: index + 2,
                column: 'Age',
                message: `Age must be numeric (found: "${ageRaw}").`,
                suggestedFix: 'Provide a numeric age value.'
              });
            }
          }
        }

        const incomingCustomer = attachExtraFields({
          id: customerId || email || null,
          name: coalesceImportValue(customerName),
          email: coalesceImportValue(email),
          phone: coalesceImportValue(String(getValueWithFallback(row, 'customerPhone', columnMap) || '').trim()),
          city: coalesceImportValue(String(getValueWithFallback(row, 'customerCity', columnMap) || '').trim()),
          state: coalesceImportValue(String(getValueWithFallback(row, 'customerState', columnMap) || '').trim()),
          age: coalesceImportValue(String(ageRaw || '').trim()),
          gender: coalesceImportValue(String(getValueWithFallback(row, 'customerGender', columnMap) || '').trim()),
          status: coalesceImportValue(String(getValueWithFallback(row, 'customerStatus', columnMap) || '').trim()),
          totalPurchases: 0,
          source,
          regDate: null,
        }, row, mappings);
        const existingEntry = [...customersByKey.entries()].find(([key, customer]) =>
          key === customerKey ||
          (customerId && customer.id === customerId) ||
          (email && hasImportValue(customer.email) && customer.email === email) ||
          (customerName && normalizeNameKey(customer.name) === normalizeNameKey(customerName))
        );
        if (existingEntry) {
          const [existingKey, existingCustomer] = existingEntry;
          customersByKey.delete(existingKey);
          customersByKey.set(customerKey, mergeCustomerRecords(existingCustomer, incomingCustomer));
        } else {
          customersByKey.set(customerKey, incomingCustomer);
        }
        importedRows += 1;
      });
    }

    if (kind === 'orders' || kind === 'mixed_commerce' || kind === 'revenue' || kind === 'sales') {
      safeRows.forEach((row) => {
        const customerId = getValueWithFallback(row, 'customerId', columnMap);
        const customerName = getCustomerNameFromRow(row, columnMap);
        const email = getValueWithFallback(row, 'customerEmail', columnMap).toLowerCase();
        const customerKey = customerId || email || compact(customerName);
        if (customerKey && !customersByKey.has(customerKey)) {
          if (!customerName || !email) {
            return;
          }
          customersByKey.set(customerKey, attachExtraFields({
            id: customerId || email || null,
            name: coalesceImportValue(customerName),
            email: coalesceImportValue(email),
            phone: coalesceImportValue(String(getValueWithFallback(row, 'customerPhone', columnMap) || '').trim()),
            city: coalesceImportValue(String(getValueWithFallback(row, 'customerCity', columnMap) || '').trim()),
            state: coalesceImportValue(String(getValueWithFallback(row, 'customerState', columnMap) || '').trim()),
            age: coalesceImportValue(String(getValueWithFallback(row, 'customerAge', columnMap) || '').trim()),
            gender: coalesceImportValue(String(getValueWithFallback(row, 'customerGender', columnMap) || '').trim()),
            status: coalesceImportValue(String(getValueWithFallback(row, 'customerStatus', columnMap) || '').trim()),
            totalPurchases: 0,
            mappedFields: toColMap(mappings),
            source,
            regDate: null,
          }, row, mappings));
          importedRows += 1;
        }
      });
    }

    if (kind === 'inventory') {
      safeRows.forEach((row) => {
        const productId = getValueWithFallback(row, 'productId', columnMap);
        const productName = getValueWithFallback(row, 'productName', columnMap);
        const sku = normalizeSku(getValueWithFallback(row, 'productSku', columnMap) || productId);
        const productKey = productId || sku || compact(productName);
        if (!productKey) {
          skippedRows += 1;
          return;
        }
        inventoryByKey.set(productKey, {
          productId,
          sku,
          product: productName,
          stock: parseNumber(getValueWithFallback(row, 'productStock', columnMap) || getValueWithFallback(row, 'inventoryStockQuantity', columnMap), 0) || 0,
          stockQuantity: parseNumber(getValueWithFallback(row, 'productStock', columnMap) || getValueWithFallback(row, 'inventoryStockQuantity', columnMap), 0) || 0,
          reorderLevel: Math.max(0, parseNumber(getValueWithFallback(row, 'reorderLevel', columnMap), 5) || 5),
          status: normalizeProductStatus(),
          inventoryStatus: getInventoryStatus(parseNumber(getValueWithFallback(row, 'productStock', columnMap) || getValueWithFallback(row, 'inventoryStockQuantity', columnMap), 0) || 0),
          lastUpdated: getValueWithFallback(row, 'lastUpdated', columnMap) || null,
        });
        importedRows += 1;
      });
    }

    if (!['products', 'customers', 'inventory', 'orders', 'mixed_commerce', 'revenue', 'sales'].includes(kind)) {
      skippedRows += safeRows.length;
    }

    console.log(`[Import] Sheet "${sheetName}" imported rows: ${importedRows}, skipped rows: ${skippedRows}`);
  });

  // Pass 2 — apply inventory overrides back to products
  inventoryByKey.forEach((inv, productId) => {
    const product = productsByKey.get(productId) || findProductMatch(productIndexes, { productId: inv.productId, sku: inv.sku, productName: inv.product });
    if (product) {
      product.stock = inv.stock;
      product.reorderLevel = inv.reorderLevel;
      product.status = normalizeProductStatus();
      product.inventoryStatus = getInventoryStatus(inv.stock);
    }
  });

  // Pass 3 — build orders, cross-referencing products and customers
  Object.entries(datasets).forEach(([sheetName, rows]) => {
    const mappings = sheetMappings[sheetName] || inferColumnMappings(rows);
    const detection = classifySheet(rows, mappings, sheetName);
    const kind = detection.tableType;
    if (kind !== 'orders' && kind !== 'mixed_commerce' && kind !== 'revenue' && kind !== 'sales') return;
    const columnMap = toColMap(mappings);
    const safeRows = Array.isArray(rows) ? rows : [];
    let importedRows = 0;
    let skippedRows = 0;

    safeRows.forEach((row, index) => {
      const orderId = String(getValueWithFallback(row, 'orderId', columnMap)).trim();
      const customerIdRaw = getValueWithFallback(row, 'customerId', columnMap);
      const customerNameRaw = getCustomerNameFromRow(row, columnMap);
      const customerEmailRaw = getValueWithFallback(row, 'customerEmail', columnMap).toLowerCase();
      const productIdRaw = getValueWithFallback(row, 'productId', columnMap);
      const skuRaw = normalizeSku(getValueWithFallback(row, 'productSku', columnMap) || productIdRaw);
      const productNameRaw = getValueWithFallback(row, 'productName', columnMap);
      
      // Require explicit orderId — do not fabricate order keys
      if (!orderId) {
        skippedRows += 1;
        skippedOrdersCount += 1;
        return;
      }

      const quantity = Math.max(1, parseNumber(getValueWithFallback(row, 'quantity', columnMap), 1) || 1);

      let product = findProductMatch(productIndexes, { productId: productIdRaw, sku: skuRaw, productName: productNameRaw });
      if (!product) {
        product = findProductMatch(existingProductIndexes, { productId: productIdRaw, sku: skuRaw, productName: productNameRaw });
      }

      let customer = findCustomerForOrder({ customerId: customerIdRaw, customerName: customerNameRaw, customerEmail: customerEmailRaw }, [
        ...existingCustomersByKey.values(),
        ...customersByKey.values()
      ]);

      // Only enforce customer link if there are customers available to match against.
      // For purely order-only workbooks (no customer sheets), allow orders to proceed unlinked.
      const customerPoolSize = existingCustomersByKey.size + customersByKey.size;
      if (!customer && customerPoolSize > 0) {
        skippedRows += 1;
        skippedOrdersCount += 1;
        skippedRowWarnings.push({
          severity: 'warning',
          rowNumber: index + 2,
          column: 'Customer Link',
          message: `Sheet "${sheetName}" Row ${index + 2}: Order ${orderId} cannot be linked to a valid customer.`,
          suggestedFix: 'Ensure every order contains customer information that matches an existing or imported customer.'
        });
        return; // Skip this order row!
      }

      if (!product) {
        skippedRowWarnings.push({
          severity: 'warning',
          rowNumber: index + 2,
          column: 'Product SKU',
          message: `Sheet "${sheetName}" Row ${index + 2}: Product SKU "${skuRaw || productIdRaw || productNameRaw}" in Order ${orderId} does not reference a valid product SKU.`,
          suggestedFix: 'Ensure all ordered products are created or mapped to valid SKUs.'
        });
      }

      const unitPrice = parseNumber(getValueWithFallback(row, 'productPrice', columnMap), null);
      const orderItemsRaw = columnMap.orderItems ? row[columnMap.orderItems] : null;
      const builtItems = buildOrderItemsFromRow({
        orderItemsRaw,
        sku: skuRaw,
        productName: productNameRaw,
        quantity,
        product,
      });

      const amount = builtItems.length
        ? builtItems.reduce((sum, line) => sum + deriveOrderAmount({
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          productPrice: product?.price,
        }), 0)
        : deriveOrderAmount({
          orderTotal: getValueWithFallback(row, 'orderTotal', columnMap),
          netAmount: columnMap.netAmount ? row[columnMap.netAmount] : (columnMap.orderTotal ? row[columnMap.orderTotal] : null),
          grossAmount: row['Gross Amount'] || row['gross amount'],
          discountAmount: row['Discount Amt'] || row['discount amt'],
          quantity,
          unitPrice,
          productPrice: product?.price,
          revenue: getValueWithFallback(row, 'revenue', columnMap),
        });
      const _derivedTotal = !(parseNumber(getValueWithFallback(row, 'orderTotal', columnMap), null) > 0);

      builtItems.forEach(line => {
        const itemProduct = findProductMatch(productIndexes, { sku: line.sku, productName: line.productName })
          || findProductMatch(existingProductIndexes, { sku: line.sku, productName: line.productName });
        if (itemProduct) {
          itemProduct.salesCount += line.quantity;
          itemProduct.revenue += deriveOrderAmount({ quantity: line.quantity, unitPrice: line.unitPrice, productPrice: itemProduct.price });
        }
        recordOrderSkuMatch(productMappingReport, { orderId, sku: line.sku, product: itemProduct, productName: line.productName });
      });

      if (!builtItems.length && product) {
        product.salesCount += quantity;
        product.revenue += amount;
        recordOrderSkuMatch(productMappingReport, { orderId, sku: skuRaw || productIdRaw, product, productName: productNameRaw });
      }
      if (customer) customer.totalPurchases += 1;

      const itemsToAdd = builtItems.length
        ? builtItems.map(line => ({ ...line, order_id: orderId, lineRevenue: deriveOrderAmount({ quantity: line.quantity, unitPrice: line.unitPrice, productPrice: product?.price }), mappedFields: toColMap(mappings) }))
        : [{
          order_id: orderId,
          productId: product?.id || productIdRaw || '',
          sku: skuRaw || product?.sku || '',
          productName: productNameRaw || product?.name || skuRaw || productIdRaw || '',
          product_name: productNameRaw || product?.product_name || product?.name || skuRaw || productIdRaw || '',
          qty: quantity,
          quantity,
          unitPrice: unitPrice ?? parseNumber(product?.price, null),
          lineRevenue: amount,
          mappedFields: toColMap(mappings),
        }];

      const orderKey = orderId;
      const existingOrder = ordersByKey.get(orderKey);
      if (existingOrder) {
        existingOrder.items.push(...itemsToAdd);
        existingOrder.total += amount;
        existingOrder.amount = existingOrder.total;
        existingOrder.quantity += quantity;
      } else {
        ordersByKey.set(orderKey, attachExtraFields({
          id: orderKey,
          customerId: (customer?.id && customer.id !== EMPTY_IMPORT_VALUE) ? customer.id : (customerIdRaw || null),
          customer: coalesceImportValue(customer?.name || customerNameRaw || customerEmailRaw || customerIdRaw),
          product: (product?.name || productNameRaw) ? coalesceImportValue(product?.name || productNameRaw) : '',
          quantity,
          amount,
          date: parseDate(getValueWithFallback(row, 'orderDate', columnMap)),
          total: amount,
          status: coalesceImportValue(String(getValueWithFallback(row, 'orderStatus', columnMap) || '').trim()),
          items: itemsToAdd,
          mappedFields: toColMap(mappings),
          source,
          _derivedTotal,
          createdAt: null,
        }, row, mappings));
      }
      importedRows += 1;
    });

    console.log(`[Import] Sheet "${sheetName}" imported order rows: ${importedRows}, skipped rows: ${skippedRows}`);
  });

  const products = Array.from(productsByKey.values()).map(product => ({
    ...product,
    salesCount: deriveProductSalesCount({ sourceSalesCount: product.sourceSalesCount, salesFromOrders: product.salesCount }),
  }));
  const customers = Array.from(customersByKey.values());
  const orders = Array.from(ordersByKey.values());
  const inventory = [
    ...inventoryByKey.values(),
    // Fallback: any product not in the Inventory sheet
    ...products
      .filter(p => !inventoryByKey.has(p.id) && !inventoryByKey.has(p.sku))
      .map(p => ({
        productId: p.id,
        sku: p.sku,
        product: p.name,
        stock: p.stock,
        stockQuantity: p.stock,
        reorderLevel: p.reorderLevel,
        status: normalizeProductStatus(),
        inventoryStatus: getInventoryStatus(p.stock),
      })),
  ];

  const uploadedProductCount = countUploadedProductRows(datasets, sheetMappings, sheetTableTypes);
  const productImportStats = buildProductImportStats({
    uploadedProductCount,
    importedProducts: products,
    auditLog: productAuditLog,
  });

  console.log('[Import] Product audit (multi-sheet):', {
    uploadedProductCount,
    readFromFile: productAuditLog.productsReadFromFile.length,
    addedDuringTransform: productAuditLog.productsAddedDuringTransformation.length,
    duplicatesSkipped: productAuditLog.duplicatesSkipped.length,
    rejected: productAuditLog.productsRejected.length,
    imported: productImportStats.importedProductCount,
  });
  console.log(`[Import] Normalized: ${products.length} products, ${customers.length} customers, ${orders.length} orders, ${inventory.length} inventory records`);

  const finalized = finalizeImportEntities({ products, customers, orders });

  return {
    products: finalized.products,
    customers: finalized.customers,
    orders: finalized.orders,
    inventory,
    analysis: {
      source,
      sourceLabel: SOURCE_LABELS[source] || 'Excel',
      rowCount: Object.values(datasets).reduce((s, r) => s + r.length, 0),
      productMappingReport: finalized.productMappingReport || productMappingReport,
      inventoryDiagnostics,
      productAuditLog,
      productImportStats,
      warnings: [...consistencyIssues, ...skippedRowWarnings],
      skippedCustomersCount,
      skippedOrdersCount,
      skippedProductsCount,
    },
  };
};
