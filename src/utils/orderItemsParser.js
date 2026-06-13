/**
 * Parse order line-item columns in multiple formats.
 */

import { normalizeSku, normalizeImportText } from './dataImportEngine.js';

const ITEM_PATTERNS = [
  /^([A-Za-z0-9._/#\-\s]+?)\s*:\s*(\d+)\s*$/i,
  /^([A-Za-z0-9._/#\-\s]+?)\s+x\s+(\d+)\s*$/i,
  /^([A-Za-z0-9._/#\-\s]+?)\s*\(\s*(\d+)\s*\)\s*$/i,
];

const parseSingleToken = (token) => {
  const trimmed = String(token || '').trim();
  if (!trimmed) return null;
  for (const pattern of ITEM_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const rawName = match[1].trim();
      return { sku: normalizeSku(rawName), name: rawName, quantity: Math.max(1, parseInt(match[2], 10) || 1) };
    }
  }
  if (/^[A-Za-z0-9._/#\-]+$/.test(trimmed) && trimmed.length <= 40) {
    return { sku: normalizeSku(trimmed), name: trimmed, quantity: 1 };
  }
  return null;
};

/**
 * Parse order items from cell value.
 * Supports: SKU001:2, SKU001 x 2, SKU001 (2), JSON arrays, comma-separated lists.
 */
export const parseOrderItemsValue = (rawValue) => {
  if (rawValue === null || rawValue === undefined || rawValue === '') return [];

  if (Array.isArray(rawValue)) {
    return rawValue.map(item => ({
      sku: normalizeSku(item.sku || item.SKU || item.productSku || item.product_sku || item.id || ''),
      productName: normalizeImportText(item.productName || item.product_name || item.name || item.product || ''),
      quantity: Math.max(1, Number(item.qty || item.quantity || item.Qty || 1) || 1),
      unitPrice: item.unitPrice ?? item.price ?? null,
    })).filter(item => item.sku || item.productName);
  }

  const text = String(rawValue).trim();
  if (!text) return [];

  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parseOrderItemsValue(parsed);
      if (parsed && typeof parsed === 'object') return parseOrderItemsValue([parsed]);
    } catch {
      // fall through to text parsing
    }
  }

  const parts = text.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
  const items = [];
  parts.forEach(part => {
    const parsed = parseSingleToken(part);
    if (parsed) {
      // Use raw name as productName only when it contains spaces (genuine product name with words).
      // SKU-like tokens (no spaces) keep productName empty so SKU-based lookup is used downstream.
      const productName = (parsed.name && /\s/.test(parsed.name)) ? parsed.name : '';
      items.push({ sku: parsed.sku, productName, quantity: parsed.quantity, unitPrice: null });
    }
  });
  return items;
};

export const buildOrderItemsFromRow = ({ orderItemsRaw, sku, productName, quantity, product }) => {
  const parsed = parseOrderItemsValue(orderItemsRaw);
  if (parsed.length > 0) {
    return parsed.map(item => ({
      sku: item.sku || normalizeSku(sku),
      productName: item.productName || productName || product?.name || item.sku || '',
      product_name: item.productName || productName || product?.product_name || product?.name || '',
      productId: product?.id || '',
      qty: item.quantity,
      quantity: item.quantity,
      unitPrice: item.unitPrice ?? product?.price ?? null,
    }));
  }

  if (sku || productName) {
    const qty = Math.max(1, Number(quantity) || 1);
    const resolvedName = productName || product?.name || sku || '';
    return [{
      sku: normalizeSku(sku),
      productName: resolvedName,
      product_name: productName || product?.product_name || product?.name || sku || '',
      productId: product?.id || '',
      qty,
      quantity: qty,
      unitPrice: product?.price ?? null,
    }];
  }

  return [];
};
