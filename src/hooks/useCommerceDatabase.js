import { useState, useEffect } from 'react';
import { generateImportAnalytics, normalizeImportText, normalizeNameKey, normalizeSku } from '../utils/dataImportEngine';
import { clearImportSessionCache, filterFileSourcedProducts } from '../utils/importProductGuard';
import { runProductionImport } from '../utils/productionImportEngine';

// Start with empty data — no seed/mock data
const SEED_PRODUCTS = [];
const SEED_CUSTOMERS = [];
const SEED_ORDERS = [];

const getInventoryStatus = (stockValue) => {
  const stock = Number(stockValue || 0);
  if (stock < 0) return 'Backordered';
  if (stock === 0) return 'Out Of Stock';
  return 'In Stock';
};

// Sentinel strings from coalesceImportValue that must never render in UI
const IMPORT_SENTINELS = new Set(['none', 'null', 'undefined']);

/**
 * Replace 'None', 'null', 'undefined' sentinel strings with empty string ''
 * so they are never displayed in the UI.
 */
const sanitizeValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' && IMPORT_SENTINELS.has(value.trim().toLowerCase())) return '';
  return value;
};

/** Sanitize all string fields on a flat record object. */
const sanitizeRecord = (record) => {
  if (!record || typeof record !== 'object') return record;
  const sanitized = { ...record };
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeValue(sanitized[key]);
    }
  });
  return sanitized;
};

const normalizeProductRecord = (product = {}) => {
  const stock = Number(product.stock || 0);
  return {
    ...product,
    stock,
    status: 'Active',
    inventoryStatus: product.inventoryStatus || product.inventory_status || getInventoryStatus(stock),
  };
};

/** Update stock on existing products only — never create synthetic products from inventory rows. */
const applyInventoryToProducts = (existingProducts, inventoryItems) => {
  if (!inventoryItems?.length) return existingProducts;

  const list = existingProducts.map(p => ({ ...p }));
  const productMap = new Map(list.map(p => [normalizeImportText(p.id), p]));
  const skuMap = new Map(list.filter(p => p.sku).map(p => [normalizeSku(p.sku), p]));
  const nameMap = new Map(list.map(p => [normalizeNameKey(p.name || p.product_name), p]));

  inventoryItems.forEach(item => {
    const pId = normalizeImportText(item.productId || '');
    const pName = normalizeImportText(item.product || item.product_name || '');
    const pSku = normalizeSku(item.sku || '');

    let matched = null;
    if (pId && productMap.has(pId)) matched = productMap.get(pId);
    else if (pSku && skuMap.has(pSku)) matched = skuMap.get(pSku);
    else if (pId && skuMap.has(pId)) matched = skuMap.get(pId);
    else if (pName && nameMap.has(normalizeNameKey(pName))) matched = nameMap.get(normalizeNameKey(pName));

    if (!matched) {
      console.warn('[Import] Inventory row skipped — no matching product from uploaded file:', { pId, pSku, pName });
      return;
    }

    matched.stock = Number(item.stock !== undefined ? item.stock : matched.stock);
    matched.status = 'Active';
    matched.inventoryStatus = getInventoryStatus(matched.stock);
    if (item.reorderLevel !== undefined) {
      matched.reorderLevel = Math.max(0, Number(item.reorderLevel));
    } else if (item.reorder_level !== undefined) {
      matched.reorderLevel = Math.max(0, Number(item.reorder_level));
    }
  });

  return list;
};

export function useCommerceDatabase() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [lastImportAnalytics, setLastImportAnalytics] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dataError, setDataError] = useState('');

  const refreshDatabase = async () => {
    try {
      const [prodRes, custRes, ordRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/customers'),
        fetch('/api/orders')
      ]);
      if (prodRes.ok && custRes.ok && ordRes.ok) {
        const prods = await prodRes.json();
        const custs = await custRes.json();
        const ords = await ordRes.json();
        setProducts((Array.isArray(prods) ? prods : []).map(normalizeProductRecord));
        setCustomers(custs);
        setOrders(ords);
      }
    } catch (error) {
      console.warn('Failed to load data from backend server, using local state:', error);
    }
  };

  // Initialize with a clean, zeroed session.
  useEffect(() => {
    // IMPORTANT: Clear all storage on every page load to ensure data never persists
    localStorage.clear(); // Clear ALL localStorage keys
    sessionStorage.clear(); // Clear all session storage
    
    // Also remove specific keys explicitly
    localStorage.removeItem('commerce_products');
    localStorage.removeItem('commerce_customers');
    localStorage.removeItem('commerce_orders');
    localStorage.removeItem('commerce_analytics');
    localStorage.removeItem('commerce_imports');
    
    // Start fresh with empty state
    setProducts([]);
    setCustomers([]);
    setOrders([]);
    setLastImportAnalytics(null);
    setDataError('');
    
    setIsLoaded(true);
  }, []);

  // DISABLED: Save to local storage on change
  // All data is intentionally NOT persisted between sessions.
  // Every reload clears all data to ensure clean, fresh start.
  useEffect(() => {
    // Intentionally empty — data is NOT saved to localStorage
    // This ensures data is completely cleared on page reload
  }, [products, customers, orders, isLoaded]);

  const isEmpty = products.length === 0 && customers.length === 0 && orders.length === 0;

  const importSeedData = () => {
    setProducts(SEED_PRODUCTS);
    setCustomers(SEED_CUSTOMERS);
    setOrders(SEED_ORDERS);
    setDataError('');
  };

  const applyProductionResult = (result) => {
    const fileProducts = filterFileSourcedProducts(result.products || []);
    const withInventory = applyInventoryToProducts(fileProducts, result.inventory || []);

    // Full replace — imported state mirrors the uploaded file, never merged with prior session data
    setProducts(withInventory.map(normalizeProductRecord));
    setCustomers((result.customers || []).map(sanitizeRecord));
    setOrders((result.orders || []).map(sanitizeRecord));

    console.log('[Import] Real data applied to state:', {
      products: withInventory.length,
      customers: (result.customers || []).length,
      orders: (result.orders || []).length,
      uploadedProducts: result.productImportStats?.uploadedProductCount,
      importedProducts: result.productImportStats?.importedProductCount,
      duplicates: result.productImportStats?.duplicateCount,
      rejected: result.productImportStats?.rejectedCount,
    });

    setLastImportAnalytics(result.analytics);
    setDataError('');
    return result;
  };

  const importBusinessData = async (rows, source = 'csv', mappings, tableTypeOverride = '') => {
    clearImportSessionCache();
    const result = await runProductionImport({
      rows,
      source,
      manualMappings: mappings,
      sheetTableTypes: { 'Imported Data': tableTypeOverride },
      existingProducts: products,
      existingCustomers: customers,
    });
    return applyProductionResult(result);
  };

  const importMultiSheetData = async (datasets, sheetMappings, source = 'excel', sheetTableTypes = {}) => {
    clearImportSessionCache();
    const result = await runProductionImport({
      datasets,
      source,
      sheetMappings,
      sheetTableTypes,
      existingProducts: products,
      existingCustomers: customers,
    });
    return applyProductionResult(result);
  };

  /* ─── PRODUCTS ─── */
  const addProduct = (p) => {
    setProducts(prev => [{
      ...p,
      id: 'p-' + Date.now(),
      name: normalizeImportText(p.name || p.product_name),
      product_name: normalizeImportText(p.product_name || p.name),
      sku: normalizeSku(p.sku || `SKU-${Date.now()}`),
      category: normalizeImportText(p.category) || 'Uncategorized',
      price: Math.max(0, Number(p.price || 0)),
      stock: Number(p.stock || 0),
      status: 'Active',
      inventoryStatus: getInventoryStatus(p.stock || 0),
      createdAt: new Date().toISOString(),
      salesCount: 0
    }, ...prev]);
  };
  const editProduct = (id, updates) => {
    setProducts(prev => prev.map(p => p.id === id ? {
      ...p,
      ...updates,
      name: normalizeImportText(updates.name ?? updates.product_name ?? p.name),
      product_name: normalizeImportText(updates.product_name ?? updates.name ?? p.product_name ?? p.name),
      sku: normalizeSku(updates.sku ?? p.sku),
      category: normalizeImportText(updates.category ?? p.category) || 'Uncategorized',
      price: Math.max(0, Number(updates.price ?? p.price ?? 0)),
      stock: Number(updates.stock ?? p.stock ?? 0),
      status: 'Active',
      inventoryStatus: getInventoryStatus(updates.stock ?? p.stock ?? 0),
      updatedAt: new Date().toISOString()
    } : p));
  };
  const deleteProduct = (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  /* ─── CUSTOMERS ─── */
  const addCustomer = (c) => {
    setCustomers(prev => [{ ...c, id: 'c-' + Date.now(), totalPurchases: 0, regDate: new Date().toISOString() }, ...prev]);
  };
  const editCustomer = (id, updates) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c));
  };

  /* ─── ORDERS ─── */
  const addOrder = (order) => {
    // order should have { customerId, items: [{productId, qty}], total }
    const newOrder = {
      ...order,
      id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      createdAt: new Date().toISOString()
    };
    
    setOrders(prev => [newOrder, ...prev]);

    // Reserve inventory
    setProducts(prev => prev.map(p => {
      const item = (order.items || []).find(i => i.productId === p.id);
      if (item) {
        return { ...p, stock: Math.max(0, p.stock - item.qty) }; // Deduct stock immediately as "reserved"
      }
      return p;
    }));
  };

  const updateOrderStatus = (id, newStatus) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    
    const oldStatus = order.status;
    
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o));

    // Handle inventory logic based on status changes
    if (newStatus === 'Delivered' && oldStatus !== 'Delivered') {
      // Increase sales count
      setProducts(prev => prev.map(p => {
        const item = (order.items || []).find(i => i.productId === p.id);
        if (item) {
          return { ...p, salesCount: (p.salesCount || 0) + item.qty };
        }
        return p;
      }));
      // Increase customer total purchases
      setCustomers(prev => prev.map(c => c.id === order.customerId ? { ...c, totalPurchases: (c.totalPurchases || 0) + 1, lastPurchaseDate: new Date().toISOString() } : c));
    }

    if (newStatus === 'Cancelled') {
      // Restore inventory
      setProducts(prev => prev.map(p => {
        const item = (order.items || []).find(i => i.productId === p.id);
        if (item) {
          return { ...p, stock: p.stock + item.qty };
        }
        return p;
      }));
    }
  };

  const deleteOrder = (id) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    
    // Restore inventory if order was NOT cancelled or already restored
    if (order.status !== 'Cancelled') {
      setProducts(prev => prev.map(p => {
        const item = (order.items || []).find(i => i.productId === p.id);
        if (item) {
          return { ...p, stock: p.stock + item.qty };
        }
        return p;
      }));
    }
    
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  // Clear all data and storage
  const clearAllData = () => {
    // Clear React state
    setProducts([]);
    setCustomers([]);
    setOrders([]);
    setLastImportAnalytics(null);
    setDataError('');
    
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Remove specific keys explicitly
    localStorage.removeItem('commerce_products');
    localStorage.removeItem('commerce_customers');
    localStorage.removeItem('commerce_orders');
    localStorage.removeItem('commerce_analytics');
    localStorage.removeItem('commerce_imports');
  };

  return {
    products, customers, orders, isEmpty, isLoaded, dataError, lastImportAnalytics,
    importSeedData, importBusinessData, importMultiSheetData, refreshDatabase,
    addProduct, editProduct, deleteProduct,
    addCustomer, editCustomer,
    addOrder, updateOrderStatus, deleteOrder,
    clearAllData
  };
}
