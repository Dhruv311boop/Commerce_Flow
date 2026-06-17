/**
 * AI-Powered Data Mapping Assistant
 * 
 * Uses OpenAI to intelligently map CSV/Excel columns to predefined fields
 * with confidence scoring and user confirmation workflows.
 */

import {
  FIELD_LABELS,
  FIELD_ENTITIES,
  COLUMN_ALIASES,
  NORMALIZED_SCHEMA,
} from './dataImportEngine.js';

/**
 * OpenAI Integration for Column Mapping
 * Requires VITE_OPENAI_API_KEY environment variable
 */
export const getOpenAIClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('VITE_OPENAI_API_KEY not configured. AI mapping disabled.');
    return null;
  }
  return apiKey;
};

/**
 * Build a context string describing all available fields
 */
const buildFieldContext = () => {
  const fieldDescriptions = Object.entries(FIELD_LABELS).map(([field, label]) => {
    const aliases = COLUMN_ALIASES[field] || [];
    const entity = FIELD_ENTITIES[field] || 'Unknown';
    return `${field}: "${label}" (Entity: ${entity}, Aliases: ${aliases.slice(0, 3).join(', ')})`;
  });
  return fieldDescriptions.join('\n');
};

/**
 * Send a column mapping request to OpenAI
 * 
 * @param {string[]} columnNames - Array of source column names
 * @param {string} datasetName - Name/context of the dataset
 * @param {string[]} sampleValues - First few values from each column for context
 * @returns {Promise<Object>} - Mapping results with confidence scores
 */
export const callOpenAIForMapping = async (columnNames, datasetName = 'Imported Dataset', sampleValues = {}) => {
  const apiKey = getOpenAIClient();
  if (!apiKey) {
    return { error: 'OpenAI API key not configured', mappings: [] };
  }

  const fieldContext = buildFieldContext();
  const sampleContext = Object.entries(sampleValues)
    .map(([col, values]) => `Column "${col}": [${values.map(v => `"${v}"`).join(', ')}]`)
    .join('\n');

  const prompt = `You are a data mapping expert. Your task is to map source column names to predefined business fields.

DATASET: ${datasetName}
SOURCE COLUMNS:
${columnNames.map((col, i) => `${i + 1}. "${col}"`).join('\n')}

SAMPLE VALUES (if available):
${sampleContext || 'No samples provided'}

AVAILABLE TARGET FIELDS:
${fieldContext}

Task:
1. For each source column, suggest the best matching target field from the available fields.
2. Provide a confidence score (0-100) for each mapping.
3. Return ONLY valid JSON in this exact format - no markdown, no code blocks:
{
  "mappings": [
    {
      "sourceColumn": "exact source column name",
      "suggestedField": "field name (e.g., productName)",
      "suggestedLabel": "human readable label",
      "confidence": 95,
      "reasoning": "brief explanation of why this mapping was chosen"
    }
  ],
  "unconfident": ["sourceColumn1", "sourceColumn2"],
  "notes": "any additional notes about the mapping"
}

Rules:
- Confidence >= 85: Auto-map (high confidence)
- Confidence 60-84: Ask user to confirm (medium confidence)
- Confidence < 60: Ask user to choose (low confidence)
- Return ALL columns in the mappings array, even if unmapped
- For unmapped columns, set suggestedField to null
- Each sourceColumn must appear exactly once
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse JSON response (handle markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const result = JSON.parse(jsonStr);

    // Validate response structure
    if (!Array.isArray(result.mappings)) {
      throw new Error('Invalid response: mappings is not an array');
    }

    return {
      success: true,
      mappings: result.mappings,
      unconfident: result.unconfident || [],
      notes: result.notes || '',
      model: 'gpt-4o-mini',
      tokensUsed: data.usage?.total_tokens || 0,
    };
  } catch (error) {
    console.error('OpenAI mapping error:', error);
    return {
      success: false,
      error: error.message,
      mappings: [],
    };
  }
};

/**
 * Classify mappings by confidence level
 * 
 * @param {Object[]} mappings - Array of mapping suggestions
 * @returns {Object} - Mappings grouped by confidence level
 */
export const classifyByConfidence = (mappings = []) => {
  return {
    auto: mappings.filter(m => m.suggestedField && m.confidence >= 85),
    confirm: mappings.filter(m => m.suggestedField && m.confidence >= 60 && m.confidence < 85),
    ask: mappings.filter(m => !m.suggestedField || m.confidence < 60),
  };
};

/**
 * Apply auto-mappings and prepare user confirmation batch
 * 
 * @param {Object[]} mappings - All mappings from OpenAI
 * @returns {Object} - Auto-applied mappings and confirmation queue
 */
export const prepareUserConfirmationFlow = (mappings = []) => {
  const classified = classifyByConfidence(mappings);

  return {
    auto: classified.auto.map(m => ({
      sourceColumn: m.sourceColumn,
      suggestedField: m.suggestedField,
      suggestedLabel: m.suggestedLabel,
      confidence: m.confidence,
      reasoning: m.reasoning,
      userAction: 'auto',
    })),
    needsConfirmation: classified.confirm.map(m => ({
      sourceColumn: m.sourceColumn,
      suggestedField: m.suggestedField,
      suggestedLabel: m.suggestedLabel,
      alternatives: [], // Can be filled with similar field suggestions
      confidence: m.confidence,
      reasoning: m.reasoning,
      userAction: 'pending',
    })),
    needsSelection: classified.ask.map(m => ({
      sourceColumn: m.sourceColumn,
      suggestedField: m.suggestedField || null,
      alternatives: [], // Available fields user can choose from
      reasoning: m.reasoning || 'Could not confidently match this column',
      userAction: 'pending',
    })),
  };
};

/**
 * Get alternative field suggestions for a column
 * 
 * @param {string} sourceColumn - The source column name
 * @param {number} limit - Max suggestions to return
 * @returns {Array} - Array of alternative field suggestions
 */
export const getAlternativeSuggestions = (sourceColumn, limit = 5) => {
  const normalized = sourceColumn.toLowerCase().trim();
  const suggestions = [];

  // Find fields that could match based on aliases
  Object.entries(COLUMN_ALIASES).forEach(([field, aliases]) => {
    let score = 0;

    // Exact alias match
    if (aliases.some(a => a === normalized)) {
      score = 100;
    }
    // Partial alias match
    else if (aliases.some(a => a.includes(normalized) || normalized.includes(a))) {
      score = 75;
    }
    // Word overlap
    else {
      const sourceWords = normalized.split(/[\s_-]+/);
      const aliasWords = aliases.flatMap(a => a.split(/[\s_-]+/));
      const overlap = sourceWords.filter(w => aliasWords.includes(w)).length;
      if (overlap > 0) {
        score = 50 + overlap * 10;
      }
    }

    if (score > 0) {
      suggestions.push({
        field,
        label: FIELD_LABELS[field],
        score,
        entity: FIELD_ENTITIES[field],
      });
    }
  });

  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

/**
 * Aggregate sales data from multiple columns
 * 
 * e.g., if data has both "quantity" and "unit_price", compute total sales
 * 
 * @param {Object[]} rows - Data rows
 * @param {Object} columnMap - Mapping of fields to column names
 * @returns {Object[]} - Rows with aggregated sales field
 */
export const aggregateSalesData = (rows = [], columnMap = {}) => {
  const quantityCol = columnMap.quantity;
  const priceCol = columnMap.productPrice;
  const amountCol = columnMap.orderTotal || columnMap.revenue;

  if (!rows.length) return rows;

  return rows.map(row => {
    const rowCopy = { ...row };

    // If we have quantity and price but no amount, compute it
    if (quantityCol && priceCol && !amountCol) {
      const qty = Number(row[quantityCol] || 0);
      const price = Number(row[priceCol] || 0);
      if (qty > 0 && price > 0) {
        rowCopy._computed_sales = qty * price;
      }
    }

    return rowCopy;
  });
};

/**
 * Validate that mapped fields align with expected schema
 * 
 * @param {Object[]} mappings - User-confirmed mappings
 * @param {string} tableType - Detected table type (products, customers, orders, etc)
 * @returns {Object} - Validation result with issues and recommendations
 */
export const validateMappingSchema = (mappings = [], tableType = 'unknown') => {
  const issues = [];
  const mapped = new Set(mappings.filter(m => m.suggestedField).map(m => m.suggestedField));

  // Define required fields per table type
  const requirements = {
    products: {
      required: ['productName', 'productSku'],
      recommended: ['productCategory', 'productPrice', 'productStock'],
    },
    customers: {
      required: ['customerName', 'customerEmail'],
      recommended: ['customerCity', 'customerState', 'customerAge'],
    },
    orders: {
      required: ['orderId', 'quantity', 'orderTotal'],
      recommended: ['orderDate', 'orderStatus', 'customerId'],
    },
    inventory: {
      required: ['productId', 'productStock'],
      recommended: ['reorderLevel', 'lastUpdated'],
    },
  };

  const requirement = requirements[tableType];
  if (requirement) {
    const missingRequired = requirement.required.filter(f => !mapped.has(f));
    const missingRecommended = requirement.recommended.filter(f => !mapped.has(f));

    if (missingRequired.length > 0) {
      issues.push({
        severity: 'error',
        message: `Missing required fields for ${tableType}: ${missingRequired.map(f => FIELD_LABELS[f]).join(', ')}`,
      });
    }

    if (missingRecommended.length > 0) {
      issues.push({
        severity: 'warning',
        message: `Missing recommended fields: ${missingRecommended.map(f => FIELD_LABELS[f]).join(', ')}`,
      });
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    mappedFields: Array.from(mapped),
  };
};

/**
 * Export mapping configuration for reuse
 * 
 * @param {Object[]} mappings - Final user-confirmed mappings
 * @returns {string} - JSON string for saving/sharing
 */
export const exportMappingConfig = (mappings = []) => {
  return JSON.stringify({
    version: '1.0',
    timestamp: new Date().toISOString(),
    mappings: mappings.map(m => ({
      sourceColumn: m.sourceColumn,
      suggestedField: m.suggestedField,
      suggestedLabel: m.suggestedLabel,
    })),
  }, null, 2);
};

/**
 * Import mapping configuration from saved JSON
 * 
 * @param {string} configJson - JSON config string
 * @returns {Object[]} - Parsed mappings
 */
export const importMappingConfig = (configJson = '') => {
  try {
    const config = JSON.parse(configJson);
    if (Array.isArray(config.mappings)) {
      return config.mappings;
    }
    throw new Error('Invalid config format');
  } catch (error) {
    console.error('Failed to import mapping config:', error);
    return [];
  }
};
