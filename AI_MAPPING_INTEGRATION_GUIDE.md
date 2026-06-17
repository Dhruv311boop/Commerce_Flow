/\*\*

- AI Mapping Assistant Integration Guide
-
- This guide shows how to integrate the AI Data Mapping Assistant
- into your import workflow.
  \*/

// ════════════════════════════════════════════════════════════════
// 1. SETUP: Configure OpenAI API Key
// ════════════════════════════════════════════════════════════════

/\*\*

 * Add to your .env.local or .env file:
 *
 * VITE_OPENAI_API_KEY=your_openai_api_key_here
 
 *
 * Get an API key from: https://platform.openai.com/api-keys
-
- Ensure your OpenAI account has:
- - Billing enabled
- - API key with gpt-4o-mini access
    \*/

// ════════════════════════════════════════════════════════════════
// 2. BASIC USAGE IN A COMPONENT
// ════════════════════════════════════════════════════════════════

import { useState } from 'react';
import AIMappingAssistant from '../components/AIMappingAssistant';
import { inferColumnMappings } from '../utils/dataImportEngine';

function ImportFlow() {
const [showAssistant, setShowAssistant] = useState(false);
const [csvData, setCsvData] = useState([]);
const [finalMappings, setFinalMappings] = useState(null);

// Step 1: User uploads a file
const handleFileUpload = (e) => {
const file = e.target.files[0];
// Parse CSV (using your existing parser)
// then show AI assistant
const rows = parseCSV(file);
const columns = Object.keys(rows[0] || {});

    setCsvData(rows);
    setShowAssistant(true);

};

// Step 2: AI Assistant generates mappings
const handleMappingsConfirmed = (mappings) => {
setFinalMappings(mappings);
setShowAssistant(false);
// Continue with import...
importData(csvData, mappings);
};

return (
<div>
{!showAssistant ? (
<input type="file" onChange={handleFileUpload} accept=".csv,.xlsx" />
) : (
<AIMappingAssistant
columnNames={Object.keys(csvData[0] || {})}
datasetName="Product Import"
sampleValues={{
            'Product Name': csvData.slice(0, 3).map(r => r['Product Name']),
            // ... include sample values for other columns
          }}
tableType="products"
onMappingsConfirmed={handleMappingsConfirmed}
onCancel={() => setShowAssistant(false)}
/>
)}
</div>
);
}

// ════════════════════════════════════════════════════════════════
// 3. ADVANCED: Using the AI Service Directly
// ════════════════════════════════════════════════════════════════

import {
callOpenAIForMapping,
classifyByConfidence,
aggregateSalesData,
validateMappingSchema,
} from '../utils/aiMappingAssistant';

async function advancedMappingWorkflow(csvRows) {
// Get column names and sample values
const columns = Object.keys(csvRows[0]);
const samples = {};
columns.forEach(col => {
samples[col] = csvRows.slice(0, 3).map(r => String(r[col]));
});

// Call OpenAI
const result = await callOpenAIForMapping(
columns,
'Advanced Product Dataset',
samples
);

if (result.error) {
console.error('Mapping failed:', result.error);
return;
}

// Classify by confidence
const classified = classifyByConfidence(result.mappings);
console.log('Auto-mappings:', classified.auto.length);
console.log('Need confirmation:', classified.confirm.length);
console.log('Need selection:', classified.ask.length);

// Aggregate sales if present
const columnMap = Object.fromEntries(
result.mappings.map(m => [m.suggestedField, m.sourceColumn])
);
const aggregated = aggregateSalesData(csvRows, columnMap);

// Validate
const validation = validateMappingSchema(result.mappings, 'products');
console.log('Valid:', validation.valid);
console.log('Issues:', validation.issues);

return { mappings: result.mappings, aggregated, validation };
}

// ════════════════════════════════════════════════════════════════
// 4. CONFIDENCE LEVELS EXPLAINED
// ════════════════════════════════════════════════════════════════

/\*\*

- Confidence Levels:
-
- ≥ 85%: AUTO-MAP
- - Exact alias match
- - Example: "product_name" → "productName"
- - Action: Applied automatically without user intervention
-
- 60-84%: CONFIRM
- - Strong partial match
- - Example: "Item" → "productName" (60% match)
- - Action: Show to user with reasoning, ask to confirm
-
- < 60%: SELECT
- - Weak or no match
- - Example: "col_xyz" → unknown
- - Action: Show alternatives, let user choose or skip
-
- null: UNMAPPED
- - No field suggestions at all
- - Action: User can select from all available fields or skip
    \*/

// ════════════════════════════════════════════════════════════════
// 5. EXAMPLE: MAPPING DIFFERENT DATA TYPES
// ════════════════════════════════════════════════════════════════

/\*\*

- Products CSV:
- item_name, item_sku, unit_price, stock_qty, category
- → productName, productSku, productPrice, productStock, productCategory
-
- Customers CSV:
- first_name, last_name, email_address, phone_number, city
- → customerName, customerEmail, customerPhone, customerCity
-
- Orders CSV:
- order_id, customer_email, product_sku, qty, total_amount
- → orderId, customerId, productId, quantity, orderTotal
-
- Sales CSV:
- date, product, units_sold, revenue_usd
- → orderDate, productId, quantity, orderTotal
  \*/

// ════════════════════════════════════════════════════════════════
// 6. SAVE & REUSE MAPPINGS
// ════════════════════════════════════════════════════════════════

import { exportMappingConfig, importMappingConfig } from '../utils/aiMappingAssistant';

// Save mapping for reuse
function saveMappingTemplate(mappings, templateName) {
const config = exportMappingConfig(mappings);
localStorage.setItem(`mapping_${templateName}`, config);
}

// Load and reuse mapping
function loadMappingTemplate(templateName) {
const config = localStorage.getItem(`mapping_${templateName}`);
return importMappingConfig(config);
}

// ════════════════════════════════════════════════════════════════
// 7. ERROR HANDLING & FALLBACKS
// ════════════════════════════════════════════════════════════════

/\*\*

- If OpenAI API fails or is not configured:
-
- 1.  Component gracefully shows error message
- 2.  User can cancel and use manual mapping
- 3.  Falls back to inferColumnMappings() from dataImportEngine
- 4.  Displays standard mapping UI
      \*/

async function intelligentMappingWithFallback(columns, datasetName) {
try {
// Try AI-powered mapping
const result = await callOpenAIForMapping(columns, datasetName);
if (!result.error) {
return result.mappings;
}
} catch (error) {
console.warn('AI mapping failed, falling back to rules-based:', error);
}

// Fallback to rule-based mapping
const fallbackMappings = inferColumnMappings(
columns.map(c => ({ [c]: '' }))
);
return fallbackMappings;
}

// ════════════════════════════════════════════════════════════════
// 8. AGGREGATING SALES DATA
// ════════════════════════════════════════════════════════════════

/\*\*

- If a dataset has both Quantity and Price (but no Total):
-
- aggregateSalesData() computes: Total = Quantity × Price
-
- This is useful for:
- - Order data with line items
- - Revenue calculations
- - Sales metrics
    \*/

const sampleOrderData = [
{ order_id: '1', product: 'Widget', qty: 2, price: 49.99 },
{ order_id: '2', product: 'Gadget', qty: 1, price: 99.99 },
];

const columnMap = {
quantity: 'qty',
productPrice: 'price',
};

const aggregated = aggregateSalesData(sampleOrderData, columnMap);
// Result: Each row gets a \_computed_sales field:
// [
// { ..., _computed_sales: 99.98 },
// { ..., _computed_sales: 99.99 },
// ]

// ════════════════════════════════════════════════════════════════
// 9. SCHEMA VALIDATION
// ════════════════════════════════════════════════════════════════

/\*\*

- validateMappingSchema() checks that required fields are mapped:
-
- Products: MUST have productName + productSku
- Customers: MUST have customerName + customerEmail
- Orders: MUST have orderId + quantity + orderTotal
- Inventory: MUST have productId + productStock
-
- Returns:
- {
- valid: true/false,
- issues: [ { severity: 'error'|'warning', message: '...' } ],
- mappedFields: ['productName', 'productSku', ...]
- }
  \*/

// ════════════════════════════════════════════════════════════════
// 10. PERFORMANCE TIPS
// ════════════════════════════════════════════════════════════════

/\*\*

- - OpenAI API calls cost tokens (~0.01-0.05 cents per call)
- - Each mapping request: ~500-1500 tokens
- - Cache results: Save mappings for reuse
- - Batch columns: Group related imports to single request
- - Sample wisely: Include 2-3 sample values per column (not entire dataset)
- - Disable AI: Set VITE_OPENAI_API_KEY="" to use fallback mapping
    \*/

export { advancedMappingWorkflow, intelligentMappingWithFallback };
