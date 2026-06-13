import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase, Product, Customer, Order, Inventory } from './db.js';
import { UniversalDataIngestionEngine } from './engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 8000;

// Enable CORS for frontend integration
app.use(cors());
app.use(express.json());

// Set up file uploads
const uploadFolder = path.join(__dirname, 'data/_uploads');
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});
const upload = multer({ storage });

const ingestionEngine = new UniversalDataIngestionEngine();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'commerceflow-import-engine-node' });
});

// File upload endpoint
app.post('/api/import/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'No file uploaded.' });
    }
    
    const result = ingestionEngine.uploadFile(
      req.file.path,
      req.file.originalname,
      req.file.mimetype
    );

    // Remove the temp file after loading into the import session
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error removing upload temp file:', err);
    });

    res.json({
      import_id: result.importId,
      source_type: result.sourceType,
      datasets: result.previews
    });
  } catch (error) {
    console.error('Error in /api/import/upload:', error);
    res.status(400).json({ detail: error.message });
  }
});

// Database or API connection detection endpoint
app.post('/api/import/detect', async (req, res) => {
  try {
    const { import_id, connection } = req.body;

    if (import_id) {
      const previews = ingestionEngine.store.previews(import_id);
      const { sourceType } = ingestionEngine.store.load(import_id);
      return res.json({
        import_id,
        source_type: sourceType,
        datasets: previews
      });
    }

    if (connection) {
      let result;
      if (['mysql', 'postgresql', 'sql_server', 'sqlite', 'oracle'].includes(connection.source_type)) {
        result = await ingestionEngine.discoverDatabase(connection);
      } else if (['google_sheets', 'woocommerce', 'shopify'].includes(connection.source_type)) {
        result = await ingestionEngine.importApiSource(connection);
      } else {
        return res.status(400).json({ detail: 'Unsupported source type in connection configuration.' });
      }

      return res.json({
        import_id: result.importId,
        source_type: result.sourceType,
        datasets: result.previews
      });
    }

    res.status(400).json({ detail: 'Provide either import_id or connection details.' });
  } catch (error) {
    console.error('Error in /api/import/detect:', error);
    res.status(400).json({ detail: error.message });
  }
});

// Column Synonym Mapping mapping endpoint
app.post('/api/import/map', async (req, res) => {
  try {
    const { import_id, manual_mappings } = req.body;
    if (!import_id) {
      return res.status(400).json({ detail: 'import_id is required.' });
    }

    const { mappings, detectedEntities, confidence } = ingestionEngine.mapImport(import_id, manual_mappings);
    res.json({
      import_id,
      mappings,
      detected_entities: detectedEntities,
      confidence
    });
  } catch (error) {
    console.error('Error in /api/import/map:', error);
    res.status(400).json({ detail: error.message });
  }
});

// Validation check endpoint
app.post('/api/import/validate', async (req, res) => {
  try {
    const { import_id, mappings } = req.body;
    if (!import_id) {
      return res.status(400).json({ detail: 'import_id is required.' });
    }

    const issues = ingestionEngine.validateImport(import_id, mappings);
    const hasErrors = issues.some(issue => issue.severity === 'error');

    res.json({
      import_id,
      issues,
      valid: !hasErrors
    });
  } catch (error) {
    console.error('Error in /api/import/validate:', error);
    res.status(400).json({ detail: error.message });
  }
});

// Suggest mapping auto-fixes
app.post('/api/import/autofix', async (req, res) => {
  try {
    const { import_id, mappings } = req.body;
    if (!import_id) {
      return res.status(400).json({ detail: 'import_id is required.' });
    }

    const result = ingestionEngine.suggestAutoFixes(import_id, mappings);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/import/autofix:', error);
    res.status(400).json({ detail: error.message });
  }
});

// Generate missing demo/sample fields
app.post('/api/import/generate-fields', async (req, res) => {
  try {
    const { import_id, fields } = req.body;
    if (!import_id) {
      return res.status(400).json({ detail: 'import_id is required.' });
    }
    if (!fields || !Array.isArray(fields)) {
      return res.status(400).json({ detail: 'fields array is required.' });
    }

    const result = ingestionEngine.generateMissingFields(import_id, fields);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/import/generate-fields:', error);
    res.status(400).json({ detail: error.message });
  }
});

// Save imports to local database
app.post('/api/import/save', async (req, res) => {
  try {
    const { import_id, mappings, replace_existing } = req.body;
    if (!import_id) {
      return res.status(400).json({ detail: 'import_id is required.' });
    }

    const result = await ingestionEngine.saveImport(import_id, mappings, replace_existing);
    res.json({
      import_id,
      saved: result.saved,
      counts: result.counts,
      validation_issues: result.validationIssues,
      report: result.report,
    });
  } catch (error) {
    console.error('Error in /api/import/save:', error);
    res.status(400).json({ detail: error.message });
  }
});

// Production import pipeline (map + normalize + persist with warnings-only policy)
app.post('/api/import/run', async (req, res) => {
  try {
    const { import_id, mappings, replace_existing, use_openai } = req.body;
    if (!import_id) {
      return res.status(400).json({ detail: 'import_id is required.' });
    }
    const result = await ingestionEngine.saveImport(import_id, mappings, replace_existing !== false);
    res.json({
      import_id,
      saved: result.saved,
      counts: result.counts,
      warnings: result.validationIssues,
      report: result.report,
    });
  } catch (error) {
    console.error('Error in /api/import/run:', error);
    res.status(400).json({ detail: error.message });
  }
});

// Fetch persisted import report
app.get('/api/import/:import_id/datasets', async (req, res) => {
  try {
    const { import_id } = req.params;
    const { datasets, sourceType } = ingestionEngine.store.load(import_id);
    res.json({
      import_id,
      source_type: sourceType,
      datasets,
    });
  } catch (error) {
    console.error('Error in GET /api/import/:import_id/datasets:', error);
    res.status(400).json({ detail: error.message });
  }
});

app.get('/api/import/:import_id/report', async (req, res) => {
  try {
    const report = await ingestionEngine.getImportReport(req.params.import_id);
    if (!report) {
      return res.status(404).json({ detail: 'Import report not found.' });
    }
    res.json({ import_id: req.params.import_id, report });
  } catch (error) {
    console.error('Error in GET /api/import/:import_id/report:', error);
    res.status(400).json({ detail: error.message });
  }
});

// Import analytics endpoint
app.post('/api/import/analyze', async (req, res) => {
  try {
    const { import_id } = req.body;
    const analytics = await ingestionEngine.analyzeImport(import_id);
    res.json(analytics);
  } catch (error) {
    console.error('Error in /api/import/analyze:', error);
    res.status(400).json({ detail: error.message });
  }
});

// Customer Acquisition analytics
app.get('/api/analytics/customer-acquisition', async (req, res) => {
  try {
    const data = await ingestionEngine.customerAcquisition();
    res.json(data);
  } catch (error) {
    console.error('Error in /api/analytics/customer-acquisition:', error);
    res.status(400).json({ detail: error.message });
  }
});

// Customer Acquisition Growth analytics
app.get('/api/analytics/customer-acquisition-growth', async (req, res) => {
  try {
    const granularity = req.query.granularity || 'month';
    const data = await ingestionEngine.customerAcquisitionGrowth(granularity);
    res.json(data);
  } catch (error) {
    console.error('Error in /api/analytics/customer-acquisition-growth:', error);
    res.status(400).json({ detail: error.message });
  }
});

// ─── Direct CRUD reads for Frontend ───

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.findAll();
    // Add salesCount field expected by frontend analytics
    const transformed = products.map(p => {
      const plain = p.get({ plain: true });
      let extraFields = {};
      try { extraFields = JSON.parse(plain.extra_fields || '{}'); } catch(e) {}
      return {
        ...plain,
        ...extraFields,
        salesCount: extraFields.salesCount || plain.salesCount || 0,
      };
    });
    res.json(transformed);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

app.get('/api/customers', async (req, res) => {
  try {
    const customers = await Customer.findAll();
    const transformed = customers.map(c => {
      const plain = c.get({ plain: true });
      let extraFields = {};
      try { extraFields = JSON.parse(plain.extra_fields || '{}'); } catch(e) {}
      return {
        ...plain,
        ...extraFields,
      };
    });
    res.json(transformed);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.findAll();
    // Transform DB fields to match frontend expectations
    const transformed = orders.map(o => {
      const plain = o.get({ plain: true });
      let extraFields = {};
      try { extraFields = JSON.parse(plain.extra_fields || '{}'); } catch(e) {}
      return {
        ...plain,
        ...extraFields,
        date: plain.order_date || plain.date || null,
        total: plain.amount || plain.total || 0,
        customerId: plain.customer_id || plain.customerId || null,
        items: extraFields.items || [], 
      };
    });
    res.json(transformed);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

app.get('/api/inventory', async (req, res) => {
  try {
    const inventory = await Inventory.findAll();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// Initialize database schema and start server
async function startServer() {
  try {
    await initDatabase();
    app.listen(port, () => {
      console.log(`🚀 CommerceFlow Node.js backend server listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start Node.js server:', error);
    process.exit(1);
  }
}

startServer();
