/**
 * AI-Powered Data Mapping Service
 * Uses pattern matching and heuristics to suggest column mappings
 */

const FIELD_SYNONYMS = {
  productId: ['product id', 'product_id', 'pid', 'item id', 'product code', 'sku id'],
  productName: ['product', 'product name', 'item', 'name', 'title', 'description', 'product_name'],
  productSku: ['sku', 'code', 'barcode', 'item code', 'product code', 'item_id'],
  productCategory: ['category', 'type', 'department', 'collection', 'segment', 'group'],
  productPrice: ['price', 'cost', 'amount', 'rate', 'selling price', 'unit price', 'mrp'],
  productStock: ['stock', 'inventory', 'quantity', 'qty', 'available', 'stock quantity', 'on hand'],
  productStatus: ['status', 'active', 'published', 'availability'],
  customerId: ['customer id', 'cust id', 'buyer id', 'user id'],
  customerName: ['customer', 'customer name', 'name', 'full name', 'buyer'],
  customerEmail: ['email', 'customer email', 'e-mail', 'contact email'],
  customerCity: ['city', 'location', 'customer city'],
  customerPhone: ['phone', 'mobile', 'contact', 'telephone'],
  orderId: ['order id', 'order_id', 'order number', 'transaction id'],
  orderDate: ['date', 'order date', 'transaction date', 'order_date'],
  orderTotal: ['total', 'amount', 'order total', 'revenue', 'sales'],
  quantity: ['quantity', 'qty', 'units', 'count', 'volume'],
};

/**
 * Calculate similarity between two strings (0-100)
 */
function calculateSimilarity(str1, str2) {
  const s1 = String(str1).toLowerCase().trim();
  const s2 = String(str2).toLowerCase().trim();
  
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 85;
  
  // Levenshtein distance
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 100;
  
  const editDistance = getEditDistance(longer, shorter);
  return ((longer.length - editDistance) / longer.length) * 100;
}

function getEditDistance(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

/**
 * Suggest field mapping for a column header
 * Returns { field, confidence, reason }
 */
export function suggestFieldMapping(columnHeader) {
  if (!columnHeader) return null;
  
  const header = String(columnHeader).toLowerCase().trim();
  const suggestions = [];

  // Check each predefined field
  for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS)) {
    // Check exact matches and close matches
    for (const synonym of synonyms) {
      const similarity = calculateSimilarity(header, synonym);
      if (similarity >= 50) {
        suggestions.push({
          field,
          confidence: Math.min(100, similarity + (synonym === header ? 20 : 0)),
          reason: similarity === 100 ? 'Exact match' : `Similar to "${synonym}"`,
          similarity,
        });
      }
    }
  }

  if (suggestions.length === 0) return null;

  // Return best match
  suggestions.sort((a, b) => b.confidence - a.confidence);
  const best = suggestions[0];

  return {
    field: best.field,
    confidence: Math.round(best.confidence),
    reason: best.reason,
  };
}

/**
 * Analyze dataset and suggest mappings for all columns
 */
export function analyzeMappings(columns = []) {
  if (!Array.isArray(columns)) return [];
  
  return columns.map(column => {
    const suggestion = suggestFieldMapping(column);
    return {
      sourceColumn: column,
      suggestedField: suggestion?.field || null,
      confidence: suggestion?.confidence || 0,
      reason: suggestion?.reason || 'No match found',
      userConfirmed: false,
    };
  });
}

/**
 * Validate mappings have required fields
 */
export function validateMappings(mappings = [], entityType = 'products') {
  const requiredFields = {
    products: ['productName', 'productSku'],
    customers: ['customerName', 'customerEmail'],
    orders: ['orderId', 'quantity'],
  };

  const required = requiredFields[entityType] || [];
  const mappedFields = mappings
    .filter(m => m.userConfirmed || m.confidence >= 80)
    .map(m => m.suggestedField)
    .filter(Boolean);

  const missing = required.filter(f => !mappedFields.includes(f));
  
  return {
    isValid: missing.length === 0,
    missing,
    coverage: (mappedFields.length / required.length) * 100,
  };
}

/**
 * Get high-confidence mappings (auto-map)
 */
export function getAutoMappings(mappings = [], threshold = 85) {
  return mappings
    .filter(m => m.confidence >= threshold)
    .map(m => ({
      sourceColumn: m.sourceColumn,
      suggestedField: m.suggestedField,
      confidence: m.confidence,
    }));
}

/**
 * Get low-confidence mappings (require user confirmation)
 */
export function getLowConfidenceMappings(mappings = [], threshold = 85) {
  return mappings
    .filter(m => m.confidence < threshold && m.confidence > 0)
    .map(m => ({
      sourceColumn: m.sourceColumn,
      suggestedField: m.suggestedField,
      confidence: m.confidence,
      reason: m.reason,
    }));
}
