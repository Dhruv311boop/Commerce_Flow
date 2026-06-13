/**
 * Derive order amounts and product sales from available fields.
 */

const parseNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') return fallback;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const deriveOrderAmount = ({
  orderTotal = null,
  netAmount = null,
  grossAmount = null,
  discountAmount = null,
  quantity = 1,
  unitPrice = null,
  productPrice = null,
  revenue = null,
} = {}) => {
  const qty = Math.max(1, parseNumber(quantity, 1) || 1);
  const price = parseNumber(unitPrice, null) ?? parseNumber(productPrice, null);
  const explicitTotal = parseNumber(orderTotal, null);
  if (explicitTotal !== null && explicitTotal > 0) {
    if (price !== null && price > 0 && explicitTotal === qty && explicitTotal < price) {
      return Math.max(0, qty * price);
    }
    return explicitTotal;
  }

  const net = parseNumber(netAmount, null);
  if (net !== null && net > 0) return net;

  const gross = parseNumber(grossAmount, null);
  const discount = parseNumber(discountAmount, null);
  if (gross !== null && gross > 0) {
    const afterDiscount = gross - (discount !== null ? discount : 0);
    if (afterDiscount > 0) return afterDiscount;
    return gross;
  }

  const rev = parseNumber(revenue, null);
  if (rev !== null && rev > 0) return rev;

  if (price !== null && price > 0) return Math.max(0, qty * price);

  return 0;
};

export const deriveProductSalesCount = ({ sourceSalesCount, salesFromOrders = 0 } = {}) => {
  const fromColumn = parseNumber(sourceSalesCount, null);
  if (fromColumn !== null && fromColumn > 0) return fromColumn;
  if (salesFromOrders > 0) return salesFromOrders;
  return fromColumn !== null ? fromColumn : 0;
};

export const buildDerivedMetricsReport = ({ products = [], orders = [] } = {}) => ({
  productsWithDerivedSales: products.filter(p => Number(p.salesCount || 0) > 0 && !Number(p.sourceSalesCount || 0)).length,
  ordersWithDerivedTotals: orders.filter(o => o._derivedTotal).length,
  totalDerivedRevenue: orders.reduce((sum, o) => sum + Number(o.total || o.amount || 0), 0),
});
