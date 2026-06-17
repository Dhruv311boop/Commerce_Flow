import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  LayoutDashboard, ShoppingBag, ClipboardList, Warehouse, Users,
  Sparkles, Settings, Plus, Upload, X, DollarSign,
  Package, TrendingUp, AlertTriangle, Star, Brain, ArrowUpRight,
  ArrowDownRight, ChevronRight, FileSpreadsheet, CheckCircle2,
  Table2, ChevronDown, ChevronUp, Search, Command, Bell, PanelLeftClose,
  PanelLeftOpen, Building2, Shield, CreditCard, SlidersHorizontal, Globe2,
  KeyRound, ReceiptText, Boxes, Bot, Download, UserPlus, LockKeyhole,
  TerminalSquare, History, Moon, Sun, Monitor, Check, RefreshCw
} from 'lucide-react';

import { useCommerceDatabase } from '../hooks/useCommerceDatabase';
import {
  FIELD_LABELS,
  IMPORT_SOURCES,
  analyzeBusinessData,
  detectImportTableType,
  hasBlockingImportIssues,
  inferColumnMappings,
  parseCsvText,
  parseSmartImportText,
  parseXmlImportText,
  validateMultiSheetMappingConsistency,
} from '../utils/dataImportEngine';
import ProductsTab from './tabs/ProductsTab';
import CustomersTab from './tabs/CustomersTab';
import OrdersTab from './tabs/OrdersTab';
import InventoryTab from './tabs/InventoryTab';
import InsightsTab from './tabs/InsightsTab';
import RawDataExplorer from './RawDataExplorer';
import ImportReportPanel from './ImportReportPanel';
import { runProductionImport } from '../utils/productionImportEngine';
import { clearImportSessionCache, countUploadedProductRows } from '../utils/importProductGuard';
import { validateMappingsPreImport, validateWorkbookMappingsPreImport } from '../utils/mappingValidation.js';
import {
  inferMappingsHybrid,
  inferMappingsWithLocalAI,
  inferWorkbookMappings,
  inferWorkbookMappingsHybrid,
} from '../utils/intelligentImportMapper';

/* ───────────────────── Status Badge ───────────────────── */
function StatusBadge({ status }) {
  const colors = {
    Processing: { bg: 'rgba(79,70,229,0.12)', text: '#4f46e5' },
    Shipped: { bg: 'rgba(37,99,235,0.12)', text: '#2563eb' },
    Delivered: { bg: 'rgba(16,185,129,0.12)', text: '#10b981' },
  };
  const c = colors[status] || colors.Processing;
  return (
    <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 600, background: c.bg, color: c.text }}>
      {status}
    </span>
  );
}

function MetricCard({ icon, label, value, trend, trendUp }) {
  return (
    <motion.div
      className="glass cf-premium-card"
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
        <div className="cf-icon-tile">{icon}</div>
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{value}</div>
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: trendUp ? 'var(--accent-green)' : 'var(--text-muted)' }}>
          {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {trend}
        </div>
      )}
    </motion.div>
  );
}

/* ───────────────────── Quick-Add Product Modal ───────────────────── */
function AddProductModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', price: '', stock: '', sku: '', category: 'General' });
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return;
    onAdd({
      id: 'p-' + Date.now(),
      name: form.name,
      price: parseFloat(form.price),
      stock: parseInt(form.stock || '0', 10),
      salesCount: 0,
      sku: form.sku || 'SKU-' + Date.now(),
      category: form.category,
    });
    onClose();
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '1px solid var(--border-input)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none',
  };
  const labelStyle = { fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', display: 'block' };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-overlay)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.form
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        onClick={e => e.stopPropagation()} onSubmit={handleSubmit}
        className="glass"
        style={{ width: '100%', maxWidth: '440px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '18px', background: 'var(--bg-modal)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>Add Product</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div>
          <label style={labelStyle}>Product Name *</label>
          <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Premium Hoodie" required />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Price ($) *</label>
            <input style={inputStyle} type="number" step="0.01" min="0" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" required />
          </div>
          <div>
            <label style={labelStyle}>Stock</label>
            <input style={inputStyle} type="number" min="0" value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="0" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>SKU</label>
            <input style={inputStyle} value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="Auto-generated" />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <input style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)} placeholder="General" />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '4px' }}>
          <Plus size={14} /> Add Product
        </button>
      </motion.form>
    </motion.div>
  );
}

const SOURCE_LABELS = Object.fromEntries(IMPORT_SOURCES);

const DATABASE_SOURCES = new Set(['mysql', 'postgresql', 'sql_server', 'oracle', 'sqlite']);
const TEXT_PAYLOAD_SOURCES = new Set(['csv', 'json', 'xml', 'rest_api', 'erp', 'crm', 'business_software']);
const ENTITY_LABELS_BY_FIELD = {
  productId: 'Products',
  productName: 'Products',
  productSku: 'Products',
  productCategory: 'Products',
  productPrice: 'Products',
  productStock: 'Inventory',
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

const getFieldLabel = (field) => FIELD_LABELS[field] || field || 'Unmapped';
const getFieldEntity = (field) => ENTITY_LABELS_BY_FIELD[field] || 'Unmapped';
const getMappingSource = (item) => item.source_column ?? item.sourceColumn ?? '';
const getMappingTarget = (item) => item.target_field ?? item.suggestedField ?? '';
const toUiMapping = (item, dataset = '') => {
  const target = getMappingTarget(item);
  return {
    ...item,
    dataset: item.dataset || dataset || undefined,
    source_column: getMappingSource(item),
    target_field: target,
    display_name: item.display_name || item.suggestedLabel || getFieldLabel(target),
    entity: item.entity || getFieldEntity(target),
    confidence: Number(item.confidence || 0),
  };
};
const toEngineMapping = (item) => {
  const target = getMappingTarget(item);
  return {
    sourceColumn: getMappingSource(item),
    suggestedField: target,
    suggestedLabel: getFieldLabel(target),
    entity: getFieldEntity(target),
    confidence: Number(item.confidence || 0),
  };
};
const toServerMapping = (item) => ({
  ...item,
  source_column: getMappingSource(item),
  target_field: getMappingTarget(item),
  display_name: getFieldLabel(getMappingTarget(item)),
  entity: getFieldEntity(getMappingTarget(item)),
});
const normalizeIssue = (issue) => ({
  ...issue,
  row_number: issue.row_number ?? issue.rowNumber,
  suggested_fix: issue.suggested_fix ?? issue.suggestedFix,
});
const flattenDetectedEntities = (detected = {}) => (
  Object.entries(detected)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key.replace(/_/g, ' '))
);

const parseUploadedFileToDatasets = async (file) => {
  const extension = file.name.toLowerCase().split('.').pop();
  if (['xlsx', 'xls', 'xlsm'].includes(extension)) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const datasets = {};
    workbook.SheetNames.forEach(sheetName => {
      datasets[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    });
    return datasets;
  }
  if (['csv', 'tsv', 'txt'].includes(extension)) {
    return { 'Imported Data': parseCsvText(await file.text()) };
  }
  return null;
};

const fetchFullDatasetsFromServer = async (importId) => {
  const res = await fetch(`/api/import/${importId}/datasets`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.datasets || null;
};

function SmartImportModal({ onClose, onImportSuccess, onImportRows, onImportWorkbook }) {
  const recordAction = (msg) => console.log('[SmartImportModal]', msg);
  const [importId, setImportId] = useState(null);
  const [source, setSource] = useState('csv');
  const [importText, setImportText] = useState('');
  const [dbConfig, setDbConfig] = useState({ engine: 'postgresql', host: '', port: '', serviceName: '', database: '', username: '', password: '', sqlite_path: '', selected_tables: '' });
  const [apiConfig, setApiConfig] = useState({ spreadsheetId: '', worksheet: '', credentialsJson: '', url: '', apiKey: '', apiSecret: '', accessToken: '' });
  const [rows, setRows] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [status, setStatus] = useState(null);
  const [importAnalytics, setImportAnalytics] = useState(null);
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Advanced features states
  const [sheetsAuthMethod, setSheetsAuthMethod] = useState('service_account');
  const [sheetsSelectedSpreadsheet, setSheetsSelectedSpreadsheet] = useState('simulated_store');
  const [sheetsScheduledSync, setSheetsScheduledSync] = useState('none');
  
  const [shopifyAuthMethod, setShopifyAuthMethod] = useState('custom_token');
  const [shopifyImportOptions, setShopifyImportOptions] = useState({ products: true, orders: true, customers: true, collections: true, inventory: true, revenue: true });
  const [shopifyAutoSync, setShopifyAutoSync] = useState('none');
  
  const [woocommerceImportOptions, setWoocommerceImportOptions] = useState({ products: true, orders: true, customers: true, categories: true, inventory: true, revenue: true });
  const [woocommerceIncrementalSync, setWoocommerceIncrementalSync] = useState(false);
  
  const [sqlRelationshipDetection, setSqlRelationshipDetection] = useState(true);
  const [sqlIncrementalImports, setSqlIncrementalImports] = useState(false);
  const [sqlCustomQuery, setSqlCustomQuery] = useState('');
  
  const [oracleSid, setOracleSid] = useState('');
  const [oracleSchemaBrowsing, setOracleSchemaBrowsing] = useState(true);
  const [oracleIncrementalSync, setOracleIncrementalSync] = useState(false);
  
  const [businessSoftwareEngine, setBusinessSoftwareEngine] = useState('quickbooks');
  const [businessSoftwareAuthType, setBusinessSoftwareAuthType] = useState('oauth');
  const [businessSoftwareImportOptions, setBusinessSoftwareImportOptions] = useState({ financeSales: true, customers: true, inventory: true });

  // Overrides & Logs
  const [tableTypeOverride, setTableTypeOverride] = useState('');
  const [sheetTableTypes, setSheetTableTypes] = useState({});
  const [importLogs, setImportLogs] = useState(null);
  const [proposedFixes, setProposedFixes] = useState(null);

  // Multi-sheet state
  const [workbookDatasets, setWorkbookDatasets] = useState(null); // { sheetName: rows[] }
  const [sheetMappings, setSheetMappings] = useState({});          // { sheetName: mapping[] }
  const [expandedSheet, setExpandedSheet] = useState(null);        // sheet name whose preview is open
  const [mappingMeta, setMappingMeta] = useState(null);
  const [isAiMapping, setIsAiMapping] = useState(false);
  const [showRawExplorer, setShowRawExplorer] = useState(true);
  const [mappingApproved, setMappingApproved] = useState(false);
  const [mappingValidationPreview, setMappingValidationPreview] = useState(null);

  const isDatabaseSource = DATABASE_SOURCES.has(source);
  const isExcelMultiSheet = (source === 'excel' || source === 'excel_xls') && workbookDatasets !== null;
  const fieldOptions = Object.entries(FIELD_LABELS);

  const previewProductRowCount = useMemo(() => {
    if (isExcelMultiSheet && workbookDatasets) {
      const engineMappings = Object.fromEntries(
        Object.entries(sheetMappings).map(([name, list]) => [name, list.map(toEngineMapping)])
      );
      return countUploadedProductRows(workbookDatasets, engineMappings, sheetTableTypes);
    }
    if (rows.length) {
      const engineMappings = mappings.map(toEngineMapping);
      const detection = detectImportTableType(rows, engineMappings, 'Imported Data', tableTypeOverride);
      return detection.tableType === 'products' ? rows.length : 0;
    }
    return 0;
  }, [isExcelMultiSheet, workbookDatasets, sheetMappings, sheetTableTypes, rows, mappings, tableTypeOverride]);

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '1px solid var(--border-input)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none',
  };
  const labelStyle = { fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '5px', display: 'block' };

  const resetImportState = () => {
    clearImportSessionCache();
    setImportId(null);
    setWorkbookDatasets(null);
    setSheetMappings({});
    setExpandedSheet(null);
    setRows([]);
    setMappings([]);
    setStatus(null);
    setImportLogs(null);
    setImportAnalytics(null);
    setProposedFixes(null);
    setMappingMeta(null);
    setShowRawExplorer(true);
    setMappingApproved(false);
    setMappingValidationPreview(null);
    setError('');
  };

  const applyIntelligentMappings = (datasets = null, singleRows = null, fileName = '', sourceType = source) => {
    if (datasets) {
      const intelligentMappings = inferWorkbookMappings(datasets, sheetTableTypes);
      const nextSheetMappings = {};
      const sheetStatuses = {};
      Object.entries(datasets).forEach(([name, sheetRows]) => {
        const engineMappings = (intelligentMappings[name] || []).map(item => toEngineMapping(toUiMapping(item, name)));
        const uiMappings = (intelligentMappings[name] || []).map(item => toUiMapping(item, name));
        const analysis = analyzeBusinessData(sheetRows, sourceType, engineMappings, sheetTableTypes[name]);
        nextSheetMappings[name] = uiMappings;
        sheetStatuses[name] = {
          tableDetection: detectImportTableType(sheetRows, engineMappings, name, sheetTableTypes[name]),
          warnings: (analysis.warnings || []).map(normalizeIssue),
          detectedEntities: analysis.detectedEntities,
        };
      });
      const allMappings = Object.values(nextSheetMappings).flat();
      setSheetMappings(nextSheetMappings);
      setMappingMeta({ provider: 'local-ai' });
      setStatus(prev => ({
        ...prev,
        confidence: allMappings.length
          ? Math.round(allMappings.reduce((sum, item) => sum + item.confidence, 0) / allMappings.length)
          : 0,
        warnings: Object.values(sheetStatuses).flatMap(item => item.warnings),
        sheetStatuses,
        detectedEntities: Object.values(sheetStatuses).reduce((acc, item) => {
          Object.entries(item.detectedEntities || {}).forEach(([key, value]) => {
            acc[key] = acc[key] || value;
          });
          return acc;
        }, {}),
      }));
      return nextSheetMappings;
    }

    if (singleRows?.length) {
      const intelligent = inferMappingsWithLocalAI(singleRows, fileName || 'Imported data', tableTypeOverride);
      const uiMappings = intelligent.map(item => toUiMapping(item));
      setMappings(uiMappings);
      setMappingMeta({ provider: 'local-ai' });
      setStatus(buildStatusFromRows(singleRows, sourceType, uiMappings, fileName || 'Imported data'));
      return uiMappings;
    }
    return null;
  };

  const handleAIMapping = async () => {
    setIsAiMapping(true);
    setError('');
    try {
      if (isExcelMultiSheet && workbookDatasets) {
        const { sheetMappings: aiMappings, meta } = await inferWorkbookMappingsHybrid(workbookDatasets, sheetTableTypes, { useOpenAI: true });
        const nextSheetMappings = Object.fromEntries(
          Object.entries(aiMappings).map(([name, sheetMap]) => [name, sheetMap.map(item => toUiMapping(item, name))])
        );
        setSheetMappings(nextSheetMappings);
        setMappingMeta({ provider: Object.values(meta)[0]?.provider || 'local-ai' });
        const allMappings = Object.values(nextSheetMappings).flat();
        setStatus(prev => ({
          ...prev,
          confidence: allMappings.length
            ? Math.round(allMappings.reduce((sum, item) => sum + item.confidence, 0) / allMappings.length)
            : 0,
        }));
        return;
      }
      if (rows.length) {
        const { mappings, provider } = await inferMappingsHybrid(rows, 'Imported data', tableTypeOverride, { useOpenAI: true });
        const uiMappings = mappings.map(item => toUiMapping(item));
        setMappings(uiMappings);
        setMappingMeta({ provider });
        setStatus(buildStatusFromRows(rows, source, uiMappings, 'Imported data'));
      }
    } catch (err) {
      setError(err.message || 'AI mapping failed. Local mapping is still active.');
    } finally {
      setIsAiMapping(false);
    }
  };

  const buildStatusFromRows = (safeRows, sourceType, uiMappings, datasetName = 'Imported data') => {
    const engineMappings = uiMappings.map(toEngineMapping);
    const analysis = analyzeBusinessData(safeRows, sourceType, engineMappings, tableTypeOverride);
    return {
      ...analysis,
      sourceLabel: SOURCE_LABELS[sourceType] || SOURCE_LABELS.business_software || 'Import',
      rowCount: safeRows.length,
      columnCount: safeRows[0] ? Object.keys(safeRows[0]).length : 0,
      detectedEntities: analysis.detectedEntities,
      detectedEntityList: flattenDetectedEntities(analysis.detectedEntities),
      warnings: (analysis.warnings || []).map(normalizeIssue),
      tableDetection: detectImportTableType(safeRows, engineMappings, datasetName, tableTypeOverride),
    };
  };

  const createLocalImportSession = ({ sourceType = source, nextRows = [], datasets = null, fileName = '' }) => {
    if (datasets) {
      const nextSheetMappings = {};
      const sheetStatuses = {};
      setImportId(`local-${Date.now()}`);
      setWorkbookDatasets(datasets);
      setExpandedSheet(Object.keys(datasets)[0] || null);
      setStatus({
        source: sourceType,
        sourceLabel: SOURCE_LABELS[sourceType] || 'Import',
        rowCount: Object.values(datasets).reduce((sum, sheetRows) => sum + sheetRows.length, 0),
        columnCount: Object.values(datasets).reduce((sum, sheetRows) => sum + (sheetRows[0] ? Object.keys(sheetRows[0]).length : 0), 0),
        confidence: 0,
        warnings: [],
        sheetStatuses: {},
        detectedEntities: {},
      });
      applyIntelligentMappings(datasets, null, fileName, sourceType);
      return;
    }

    const safeRows = Array.isArray(nextRows) ? nextRows : [];
    if (!safeRows.length) {
      throw new Error('Import failed. Please review the highlighted fields. The selected source does not contain any records.');
    }
    setImportId(`local-${Date.now()}`);
    setRows(safeRows);
    applyIntelligentMappings(null, safeRows, fileName || SOURCE_LABELS[sourceType] || '', sourceType);
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetImportState();
    setIsConnecting(true);

    try {
      const extension = file.name.toLowerCase().split('.').pop();

      const bootstrapServerImport = async (uploadedFile) => {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        const uploadRes = await fetch('/api/import/upload', { method: 'POST', body: formData });
        if (!uploadRes.ok) return false;
        const uploadData = await uploadRes.json();
        const mapRes = await fetch('/api/import/map', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ import_id: uploadData.import_id }),
        });
        if (!mapRes.ok) return false;
        const mapData = await mapRes.json();
        setImportId(uploadData.import_id);
        setSource(uploadData.source_type === 'excel_xls' ? 'excel_xls' : uploadData.source_type);
        const fullDatasets = await parseUploadedFileToDatasets(uploadedFile);
        if (uploadData.source_type === 'excel' && fullDatasets) {
          const mappingsPerSheet = {};
          uploadData.datasets.forEach(d => {
            mappingsPerSheet[d.name] = mapData.mappings.filter(m => m.dataset === d.name).map(m => toUiMapping(m, d.name));
          });
          setWorkbookDatasets(fullDatasets);
          setSheetMappings(mappingsPerSheet);
          setExpandedSheet(uploadData.datasets[0]?.name || null);
        } else if (fullDatasets) {
          const singleRows = Object.values(fullDatasets)[0] || [];
          setRows(singleRows);
          setMappings(mapData.mappings.map(toUiMapping));
        } else {
          const dataset = uploadData.datasets[0];
          setRows(dataset?.sample_rows || []);
          setMappings(mapData.mappings.map(toUiMapping));
        }
        const uploadedProductCount = fullDatasets
          ? countUploadedProductRows(
            fullDatasets,
            Object.fromEntries(uploadData.datasets.map(d => [
              d.name,
              mapData.mappings.filter(m => m.dataset === d.name).map(m => toEngineMapping(toUiMapping(m, d.name))),
            ]))
          )
          : 0;
        setStatus({
          sourceLabel: SOURCE_LABELS[uploadData.source_type] || 'Import',
          rowCount: uploadData.datasets.reduce((sum, d) => sum + d.rows, 0),
          uploadedProductCount,
          confidence: mapData.confidence,
          detectedEntities: mapData.detected_entities,
          warnings: [],
        });
        setMappingMeta({ provider: 'server+local-ai' });
        return true;
      };

      if (['xlsx', 'xls', 'xlsm', 'csv', 'tsv'].includes(extension)) {
        try {
          const serverReady = await bootstrapServerImport(file);
          if (serverReady) return;
        } catch {
          // Fall back to browser-local parsing for offline/dev mode.
        }
      }

      if (['xlsx', 'xls', 'xlsm'].includes(extension)) {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
        const datasets = {};
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const sheetRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          datasets[sheetName] = sheetRows;
        });
        setSource(extension === 'xls' ? 'excel_xls' : 'excel');
        createLocalImportSession({ sourceType: extension === 'xls' ? 'excel_xls' : 'excel', datasets, fileName: file.name });
        return;
      }

      const text = await file.text();
      if (extension === 'xml') {
        setSource('xml');
        createLocalImportSession({ sourceType: 'xml', nextRows: parseXmlImportText(text), fileName: file.name });
        return;
      }
      if (extension === 'json') {
        setSource('json');
        createLocalImportSession({ sourceType: 'json', nextRows: parseSmartImportText(text), fileName: file.name });
        return;
      }
      if (['csv', 'tsv', 'txt'].includes(extension)) {
        setSource('csv');
        createLocalImportSession({ sourceType: 'csv', nextRows: parseCsvText(text), fileName: file.name });
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/import/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Upload and parse failed.');
      }
      const data = await res.json();
      setImportId(data.import_id);

      // Sync frontend source state with backend-detected source type
      const detectedSource = data.source_type === 'json' ? 'business_software' : data.source_type;
      if (detectedSource && SOURCE_LABELS[detectedSource]) {
        setSource(detectedSource);
      }

      // Auto-fetch mapping suggestions
      const mapRes = await fetch('/api/import/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ import_id: data.import_id })
      });
      if (!mapRes.ok) {
        const err = await mapRes.json();
        throw new Error(err.detail || 'Mapping generation failed.');
      }
      const mapData = await mapRes.json();

      const fullDatasets = await parseUploadedFileToDatasets(file);
      if (data.source_type === 'excel' && fullDatasets) {
        const mappingsPerSheet = {};
        data.datasets.forEach(d => {
          mappingsPerSheet[d.name] = mapData.mappings.filter(m => m.dataset === d.name).map(m => toUiMapping(m, d.name));
        });
        setWorkbookDatasets(fullDatasets);
        setSheetMappings(mappingsPerSheet);
        setExpandedSheet(data.datasets[0].name);
        setStatus({
          sourceLabel: 'Excel',
          rowCount: data.datasets.reduce((s, d) => s + d.rows, 0),
          uploadedProductCount: countUploadedProductRows(
            fullDatasets,
            Object.fromEntries(data.datasets.map(d => [
              d.name,
              mapData.mappings.filter(m => m.dataset === d.name).map(m => toEngineMapping(toUiMapping(m, d.name))),
            ]))
          ),
          confidence: mapData.confidence,
          detectedEntities: mapData.detected_entities,
          warnings: []
        });
      } else if (fullDatasets) {
        const singleRows = Object.values(fullDatasets)[0] || [];
        setRows(singleRows);
        setMappings(mapData.mappings.map(toUiMapping));
        setStatus({
          sourceLabel: SOURCE_LABELS[data.source_type] || 'Import',
          rowCount: singleRows.length,
          columnCount: singleRows[0] ? Object.keys(singleRows[0]).length : 0,
          uploadedProductCount: countUploadedProductRows(
            fullDatasets,
            { 'Imported Data': mapData.mappings.map(m => toEngineMapping(toUiMapping(m))) }
          ),
          confidence: mapData.confidence,
          detectedEntities: mapData.detected_entities,
          warnings: []
        });
      } else {
        const dataset = data.datasets[0];
        setRows(dataset.sample_rows);
        setMappings(mapData.mappings.map(toUiMapping));
        setStatus({
          sourceLabel: SOURCE_LABELS[data.source_type] || 'Import',
          rowCount: dataset.rows,
          columnCount: dataset.columns?.length || Object.keys(dataset.sample_rows?.[0] || {}).length,
          confidence: mapData.confidence,
          detectedEntities: mapData.detected_entities,
          warnings: []
        });
      }
    } catch (err) {
      setError(err.message || 'Import failed. Please review the highlighted fields.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    resetImportState();
    setIsConnecting(true);

    try {
      if (TEXT_PAYLOAD_SOURCES.has(source)) {
        const trimmed = importText.trim();
        if (!trimmed) {
          throw new Error('Connection could not be established. Paste records or choose a file before previewing.');
        }
        const sourceType = source === 'business_software' ? businessSoftwareEngine : source;
        const parsedRows = source === 'xml'
          ? parseXmlImportText(trimmed)
          : source === 'csv'
            ? parseCsvText(trimmed)
            : parseSmartImportText(trimmed);
        createLocalImportSession({ sourceType: source === 'business_software' ? 'business_software' : source, nextRows: parsedRows, fileName: sourceType });
        return;
      }

      let connectionPayload = { source_type: source };

      if (isDatabaseSource) {
        connectionPayload = {
          ...connectionPayload,
          source_type: source,
          host: dbConfig.host,
          port: dbConfig.port ? parseInt(dbConfig.port, 10) : null,
          database: dbConfig.database,
          service_name: dbConfig.serviceName,
          username: dbConfig.username,
          password: dbConfig.password,
          sqlite_path: dbConfig.sqlite_path,
          selected_tables: dbConfig.selected_tables ? dbConfig.selected_tables.split(',').map(s => s.trim()) : null
        };
      } else if (source === 'google_sheets') {
        let creds = null;
        try {
          creds = apiConfig.credentialsJson ? JSON.parse(apiConfig.credentialsJson) : null;
        } catch {
          throw new Error('Google Credentials JSON must be a valid JSON string.');
        }
        connectionPayload = {
          ...connectionPayload,
          spreadsheet_id: apiConfig.spreadsheetId,
          worksheet: apiConfig.worksheet,
          credentials_json: creds
        };
      } else if (source === 'woocommerce') {
        connectionPayload = {
          ...connectionPayload,
          url: apiConfig.url,
          api_key: apiConfig.apiKey,
          api_secret: apiConfig.apiSecret
        };
      } else if (source === 'shopify') {
        connectionPayload = {
          ...connectionPayload,
          url: apiConfig.url,
          access_token: apiConfig.accessToken
        };
      }

      const res = await fetch('/api/import/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection: connectionPayload })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Source connection failed.');
      }
      const data = await res.json();
      setImportId(data.import_id);

      // Fetch mappings
      const mapRes = await fetch('/api/import/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ import_id: data.import_id })
      });
      const mapData = await mapRes.json();

      const fullDatasets = await fetchFullDatasetsFromServer(data.import_id);
      if (data.datasets.length > 1 && fullDatasets) {
        const mappingsPerSheet = {};
        data.datasets.forEach(d => {
          mappingsPerSheet[d.name] = mapData.mappings.filter(m => m.dataset === d.name).map(m => toUiMapping(m, d.name));
        });
        setWorkbookDatasets(fullDatasets);
        setSheetMappings(mappingsPerSheet);
        setExpandedSheet(data.datasets[0].name);
        setStatus({
          sourceLabel: SOURCE_LABELS[source],
          rowCount: data.datasets.reduce((s, d) => s + d.rows, 0),
          uploadedProductCount: countUploadedProductRows(
            fullDatasets,
            Object.fromEntries(data.datasets.map(d => [
              d.name,
              mapData.mappings.filter(m => m.dataset === d.name).map(m => toEngineMapping(toUiMapping(m, d.name))),
            ]))
          ),
          confidence: mapData.confidence,
          detectedEntities: mapData.detected_entities,
          warnings: []
        });
      } else if (fullDatasets) {
        const singleRows = Object.values(fullDatasets)[0] || [];
        setRows(singleRows);
        setMappings(mapData.mappings.map(toUiMapping));
        setStatus({
          sourceLabel: SOURCE_LABELS[data.source_type] || 'Import',
          rowCount: singleRows.length,
          columnCount: singleRows[0] ? Object.keys(singleRows[0]).length : 0,
          uploadedProductCount: countUploadedProductRows(
            fullDatasets,
            { [Object.keys(fullDatasets)[0]]: mapData.mappings.map(m => toEngineMapping(toUiMapping(m))) }
          ),
          confidence: mapData.confidence,
          detectedEntities: mapData.detected_entities,
          warnings: []
        });
      } else {
        const dataset = data.datasets[0];
        setRows(dataset.sample_rows);
        setMappings(mapData.mappings.map(toUiMapping));
        setStatus({
          sourceLabel: SOURCE_LABELS[data.source_type] || 'Import',
          rowCount: dataset.rows,
          columnCount: dataset.columns?.length || Object.keys(dataset.sample_rows?.[0] || {}).length,
          confidence: mapData.confidence,
          detectedEntities: mapData.detected_entities,
          warnings: []
        });
      }
    } catch (err) {
      setError(err.message || 'Connection could not be established.');
    } finally {
      setIsConnecting(false);
    }
  };

  const updateSheetMapping = useCallback((sheetName, sourceColumn, newField) => {
    setSheetMappings(prev => {
      const updated = (prev[sheetName] || []).map(item =>
        getMappingSource(item) === sourceColumn
          ? {
              ...item,
              target_field: newField,
              display_name: getFieldLabel(newField),
              entity: getFieldEntity(newField),
              confidence: newField ? 85 : 0
            }
          : item
      );
      return { ...prev, [sheetName]: updated };
    });
  }, []);

  const updateMapping = (sourceColumn, targetField) => {
    const nextMappings = mappings.map(item =>
      getMappingSource(item) === sourceColumn
        ? {
            ...item,
            target_field: targetField,
            display_name: getFieldLabel(targetField),
            entity: getFieldEntity(targetField),
            confidence: targetField ? 85 : 0
          }
        : item
    );
    setMappings(nextMappings);
  };

  const handleTableTypeOverrideChange = (newType) => {
    setTableTypeOverride(newType);
    if (rows.length > 0) {
      const nextMappings = inferColumnMappings(rows, 'Imported data', newType).map(toUiMapping);
      setMappings(nextMappings);
      const analysis = analyzeBusinessData(rows, source, nextMappings.map(toEngineMapping), newType);
      setStatus(prev => ({
        ...prev,
        ...analysis,
        sourceLabel: prev?.sourceLabel || SOURCE_LABELS[source] || 'Import',
        warnings: (analysis.warnings || []).map(normalizeIssue),
        tableDetection: detectImportTableType(rows, nextMappings.map(toEngineMapping), 'Imported data', newType),
      }));
    }
  };

  const updateSheetTableType = useCallback((sheetName, newType) => {
    setSheetTableTypes(prev => ({ ...prev, [sheetName]: newType }));
  }, []);

  const triggerValidation = async (currentMappings) => {
    if (!importId) return;
    if (importId.startsWith('local-')) {
      if (isExcelMultiSheet) {
        const sheetMaps = Object.fromEntries(
          Object.entries(sheetMappings).map(([name, list]) => [name, list.map(toEngineMapping)])
        );
        const mappingValidation = validateWorkbookMappingsPreImport(workbookDatasets || {}, sheetMaps);
        setMappingValidationPreview(mappingValidation);
        setMappingApproved(!mappingValidation.requiresApproval);
        const issues = Object.entries(workbookDatasets || {}).flatMap(([sheetName, sheetRows]) => {
          const sheetMap = (sheetMappings[sheetName] || []).map(toEngineMapping);
          return analyzeBusinessData(sheetRows, source, sheetMap, sheetTableTypes[sheetName]).warnings || [];
        });
        setStatus(prev => ({
          ...prev,
          warnings: [
            ...issues.map(normalizeIssue),
            ...mappingValidation.warnings.map(w => normalizeIssue({ message: `${w.uploadedColumn}: ${w.validationMessage}`, severity: 'warning' })),
          ],
        }));
        return;
      }
      const engineMappings = currentMappings.map(toEngineMapping);
      const mappingValidation = validateMappingsPreImport(engineMappings, rows, 'Imported Data');
      setMappingValidationPreview(mappingValidation);
      setMappingApproved(!mappingValidation.requiresApproval);
      const analysis = analyzeBusinessData(rows, source, engineMappings, tableTypeOverride);
      setStatus(prev => ({
        ...prev,
        ...analysis,
        warnings: [
          ...(analysis.warnings || []).map(normalizeIssue),
          ...mappingValidation.warnings.map(w => normalizeIssue({ message: `${w.uploadedColumn}: ${w.validationMessage}`, severity: 'warning' })),
        ],
        tableDetection: detectImportTableType(rows, engineMappings, 'Imported data', tableTypeOverride),
      }));
      return;
    }
    try {
      const valRes = await fetch('/api/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ import_id: importId, mappings: currentMappings.map(toServerMapping) })
      });
      if (valRes.ok) {
        const valData = await valRes.json();
        setStatus(prev => ({ ...prev, warnings: (valData.issues || []).map(normalizeIssue) }));
      }
    } catch (err) {
      setError('Import failed. Please review the highlighted fields.');
    }
  };

  const handleAutoFix = async () => {
    if (!importId) return;
    setError('');
    if (importId.startsWith('local-')) {
      if (isExcelMultiSheet) {
        const fixes = Object.entries(workbookDatasets || {}).flatMap(([sheetName, sheetRows]) => {
          const inferred = inferMappingsWithLocalAI(sheetRows, sheetName, sheetTableTypes[sheetName]).map(item => toUiMapping(item, sheetName));
          return inferred
            .filter(item => {
              const current = (sheetMappings[sheetName] || []).find(m => getMappingSource(m) === item.source_column);
              return current && getMappingTarget(current) !== item.target_field && item.confidence >= 70;
            })
            .map(item => ({
              dataset: sheetName,
              source_column: item.source_column,
              suggested_field: item.target_field,
              suggested_label: item.display_name,
              confidence: item.confidence,
              current_label: getFieldLabel(getMappingTarget((sheetMappings[sheetName] || []).find(m => getMappingSource(m) === item.source_column))),
              reason: 'Detected from column name and sample values.',
            }));
        });
        setProposedFixes(fixes.length ? fixes : null);
        if (!fixes.length) setError('All mappings look good. No auto-fixes suggested.');
        return;
      }

      const inferred = inferMappingsWithLocalAI(rows, 'Imported data', tableTypeOverride).map(toUiMapping);
      const fixes = inferred
        .filter(item => {
          const current = mappings.find(m => getMappingSource(m) === item.source_column);
          return current && getMappingTarget(current) !== item.target_field && item.confidence >= 70;
        })
        .map(item => ({
          source_column: item.source_column,
          suggested_field: item.target_field,
          suggested_label: item.display_name,
          confidence: item.confidence,
          current_label: getFieldLabel(getMappingTarget(mappings.find(m => getMappingSource(m) === item.source_column))),
          reason: 'Detected from column name and sample values.',
        }));
      setProposedFixes(fixes.length ? fixes : null);
      if (!fixes.length) setError('All mappings look good. No auto-fixes suggested.');
      return;
    }

    try {
      let finalMappings = mappings;
      if (isExcelMultiSheet) {
        finalMappings = Object.values(sheetMappings).flat();
      }
      const res = await fetch('/api/import/autofix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ import_id: importId, mappings: finalMappings.map(toServerMapping) })
      });
      if (!res.ok) throw new Error('Failed to get mapping auto-fixes');
      const data = await res.json();
      
      if (data.fixes && data.fixes.length > 0) {
        setProposedFixes(data.fixes);
      } else {
        setError('All mappings look good. No auto-fixes suggested.');
      }
    } catch (err) {
      setError(`Unable to map required columns. ${err.message}`);
    }
  };

  const applyAutoFixes = () => {
    if (!proposedFixes) return;
    
    if (isExcelMultiSheet) {
      setSheetMappings(prev => {
        const next = { ...prev };
        proposedFixes.forEach(fix => {
          if (next[fix.dataset]) {
            next[fix.dataset] = next[fix.dataset].map(m => {
              if (getMappingSource(m) === fix.source_column) {
                return {
                  ...m,
                  target_field: fix.suggested_field,
                  display_name: fix.suggested_label,
                  entity: getFieldEntity(fix.suggested_field),
                  confidence: fix.confidence
                };
              }
              return m;
            });
          }
        });
        return next;
      });
    } else {
      setMappings(prev => {
        const next = prev.map(m => {
          const fix = proposedFixes.find(f => f.source_column === getMappingSource(m));
          if (fix) {
            return {
              ...m,
              target_field: fix.suggested_field,
              display_name: fix.suggested_label,
              entity: getFieldEntity(fix.suggested_field),
              confidence: fix.confidence
            };
          }
          return m;
        });
        return next;
      });
    }
    
    setProposedFixes(null);
  };

  const getGenerateFieldForWarning = (w) => {
    const msg = (w.message || '').toLowerCase();
    const col = (w.column || '').toLowerCase();
    
    if (col.includes('customer name') || msg.includes('customer name') || w.type === 'missing_name_with_email') {
      return { key: 'customer_name', label: 'Customer Name' };
    }
    if (col.includes('email') || msg.includes('customer email')) {
      return { key: 'customer_email', label: 'Customer Email' };
    }
    if (col.includes('sku') || msg.includes('sku')) {
      return { key: 'sku', label: 'SKU' };
    }
    if (col.includes('stock') || col.includes('inventory') || msg.includes('stock') || msg.includes('inventory')) {
      return { key: 'stock', label: 'Stock Quantity' };
    }
    return null;
  };

  const handleGenerateField = async (fieldKey) => {
    if (!importId) return;
    setError('');
    if (importId.startsWith('local-')) {
      setError('Unable to map required columns. Add the missing field in the source data or choose an existing column before importing.');
      return;
    }
    try {
      const res = await fetch('/api/import/generate-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ import_id: importId, fields: [fieldKey] })
      });
      if (!res.ok) throw new Error('Failed to generate missing fields');
      
      const mapRes = await fetch('/api/import/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ import_id: importId })
      });
      if (!mapRes.ok) throw new Error('Failed to re-generate mappings after field generation');
      const mapData = await mapRes.json();
      
      if (isExcelMultiSheet) {
        const detRes = await fetch('/api/import/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ import_id: importId })
        });
        const fullDatasets = await fetchFullDatasetsFromServer(importId);
        if (fullDatasets) {
          const mappingsPerSheet = {};
          Object.keys(fullDatasets).forEach(name => {
            mappingsPerSheet[name] = mapData.mappings.filter(m => m.dataset === name).map(m => toUiMapping(m, name));
          });
          setWorkbookDatasets(fullDatasets);
          setSheetMappings(mappingsPerSheet);
          setStatus(prev => ({
            ...prev,
            rowCount: Object.values(fullDatasets).reduce((sum, sheetRows) => sum + sheetRows.length, 0),
            uploadedProductCount: countUploadedProductRows(
              fullDatasets,
              Object.fromEntries(Object.keys(fullDatasets).map(name => [
                name,
                mapData.mappings.filter(m => m.dataset === name).map(m => toEngineMapping(toUiMapping(m, name))),
              ]))
            ),
            confidence: mapData.confidence,
            detectedEntities: mapData.detected_entities,
          }));
        }
      } else {
        const fullDatasets = await fetchFullDatasetsFromServer(importId);
        if (fullDatasets) {
          const singleRows = Object.values(fullDatasets)[0] || [];
          setRows(singleRows);
          setMappings(mapData.mappings.map(toUiMapping));
          setStatus(prev => ({
            ...prev,
            rowCount: singleRows.length,
            uploadedProductCount: countUploadedProductRows(
              fullDatasets,
              { [Object.keys(fullDatasets)[0]]: mapData.mappings.map(m => toEngineMapping(toUiMapping(m))) }
            ),
            confidence: mapData.confidence,
            detectedEntities: mapData.detected_entities,
          }));
        }
      }
    } catch (err) {
      setError(`Field generation failed: ${err.message}`);
    }
  };

  useEffect(() => {
    if (!importId) return;
    const finalMappings = isExcelMultiSheet ? Object.values(sheetMappings).flat() : mappings;
    if (finalMappings.length > 0) {
      const debounced = setTimeout(() => {
        triggerValidation(finalMappings);
      }, 300);
      return () => clearTimeout(debounced);
    }
  }, [mappings, sheetMappings, importId, isExcelMultiSheet]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!importId) {
      setError('Please upload a file or connect to a data source first, then click "Import and Map Data".');
      return;
    }

    setError('');
    try {
      let finalMappings = mappings;
      if (isExcelMultiSheet) {
        finalMappings = Object.values(sheetMappings).flat();
      }

      if (mappingValidationPreview?.requiresApproval && !mappingApproved) {
        setError('Mapping warnings require review. Confirm the mapping approval checkbox before importing.');
        return;
      }

      if (importId.startsWith('local-')) {
        if (isExcelMultiSheet) {
          const localIssues = Object.entries(workbookDatasets || {}).flatMap(([sheetName, sheetRows]) => {
            const engineMappings = (sheetMappings[sheetName] || []).map(toEngineMapping);
            return analyzeBusinessData(sheetRows, source, engineMappings, sheetTableTypes[sheetName]).warnings || [];
          }).map(normalizeIssue);

          setStatus(prev => ({ ...prev, warnings: localIssues }));
          if (hasBlockingImportIssues(localIssues)) {
            setError('Import failed. Please review the highlighted fields.');
            return;
          }

          const result = await (onImportWorkbook?.(
            workbookDatasets,
            Object.fromEntries(Object.entries(sheetMappings).map(([sheetName, sheetMap]) => [sheetName, sheetMap.map(toEngineMapping)])),
            source,
            sheetTableTypes
          ) || runProductionImport({
            datasets: workbookDatasets,
            source,
            sheetMappings: Object.fromEntries(Object.entries(sheetMappings).map(([sheetName, sheetMap]) => [sheetName, sheetMap.map(toEngineMapping)])),
            sheetTableTypes,
          }));
          if (!result) throw new Error('Import failed. Please review the highlighted fields.');
          const importedCount = Object.values(workbookDatasets || {}).reduce((sum, sheetRows) => sum + sheetRows.length, 0);
          setImportAnalytics(result.analytics);
          setImportLogs({
            sourceLabel: SOURCE_LABELS[source] || 'Import',
            importedCount,
            skippedCount: 0,
            mappingReport: result.analytics?.productMappingReport,
            warnings: result.warnings || localIssues,
            report: result.report,
            mappingDecisions: finalMappings.filter(m => getMappingTarget(m)).map(m => ({
              source: getMappingSource(m),
              target: getFieldLabel(getMappingTarget(m)),
              tableType: getFieldEntity(getMappingTarget(m)),
              sheet: m.dataset,
            })),
          });
          setStatus(prev => ({ ...prev, warnings: [], importedCount }));
          return;
        }

        const engineMappings = finalMappings.map(toEngineMapping);
        const analysis = analyzeBusinessData(rows, source, engineMappings, tableTypeOverride);
        const issues = (analysis.warnings || []).map(normalizeIssue);
        setStatus(prev => ({ ...prev, ...analysis, warnings: issues }));
        if (hasBlockingImportIssues(issues)) {
          setError('Import failed. Please review the highlighted fields.');
          return;
        }

        const result = await (onImportRows?.(rows, source, engineMappings, tableTypeOverride) || runProductionImport({
          rows,
          source,
          manualMappings: engineMappings,
          sheetTableTypes: { 'Imported Data': tableTypeOverride },
        }));
        if (!result) throw new Error('Import failed. Please review the highlighted fields.');
        const importedCount = rows.length;
        setImportAnalytics(result.analytics);
        setImportLogs({
          sourceLabel: SOURCE_LABELS[source] || 'Import',
          importedCount,
          skippedCount: 0,
          mappingReport: result.analytics?.productMappingReport,
          warnings: result.warnings || issues,
          report: result.report,
          mappingDecisions: finalMappings.filter(m => getMappingTarget(m)).map(m => ({
            source: getMappingSource(m),
            target: getFieldLabel(getMappingTarget(m)),
            tableType: getFieldEntity(getMappingTarget(m)),
          })),
        });
        setStatus(prev => ({ ...prev, warnings: [], importedCount }));
        return;
      }

      // Step 1: Validate import
      const valRes = await fetch('/api/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ import_id: importId, mappings: finalMappings.map(toServerMapping) })
      });
      const valData = await valRes.json();

      const serverWarnings = (valData.issues || []).map(normalizeIssue);
      if (serverWarnings.length) {
        setStatus(prev => ({ ...prev, warnings: serverWarnings }));
      }

      if (hasBlockingImportIssues(valData.issues || [])) {
        setError('Import failed. The dataset appears to be empty or unusable.');
        return;
      }

      // Step 2: Save normalized data (warnings never block save)
      const saveRes = await fetch('/api/import/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          import_id: importId,
          mappings: finalMappings.map(toServerMapping),
          replace_existing: true
        })
      });
      const saveData = await saveRes.json();
      if (!saveData.saved) {
        throw new Error(saveData.validation_issues?.[0]?.message || 'Server failed to save records.');
      }

      // Step 3: Fetch analytics
      const analRes = await fetch('/api/import/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ import_id: importId })
      });
      const analData = await analRes.json();

      setImportAnalytics({
        revenueAnalysis: `Imported revenue totals $${(analData.revenue_analysis.total_revenue || 0).toFixed(2)} across ${analData.revenue_analysis.order_count || 0} order(s).`,
        topProducts: (analData.top_products || []).map(p => `${p.name || p.sku} ($${(p.revenue || 0).toFixed(2)})`),
        lowStockAlerts: (analData.low_stock_alerts || []).map(l => `${l.product}: ${l.stock} units left`),
        customerInsights: [`Acquired ${analData.customer_insights.customer_count || 0} new customer(s).`],
        inventoryRecommendations: (analData.inventory_recommendations || []).map(r => r.recommendation),
        salesTrends: [`Average Order Value: $${(analData.revenue_analysis.average_order_value || 0).toFixed(2)}`]
      });

      // Audit logs
      const mappingDecisions = finalMappings.filter(m => getMappingTarget(m)).map(m => ({
        source: getMappingSource(m),
        target: getFieldLabel(getMappingTarget(m)),
        tableType: getFieldEntity(getMappingTarget(m)),
        sheet: m.dataset
      }));

      setImportLogs({
        sourceLabel: SOURCE_LABELS[source] || 'Import',
        importedCount: (saveData.counts.products + saveData.counts.customers + saveData.counts.orders + saveData.counts.inventory),
        skippedCount: 0,
        warnings: saveData.validation_issues || [],
        report: saveData.report,
        mappingReport: saveData.report?.relationshipResolution,
        mappingDecisions
      });

      // Reload database values in dashboard
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err) {
      setError(err.message || 'Import failed. Please review the highlighted fields.');
    }
  };

  const confidenceColor = (c) => c >= 90 ? 'var(--accent-green)' : c >= 70 ? '#d97706' : 'var(--text-muted)';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-overlay)', backdropFilter: 'blur(6px)', padding: '20px' }}
      onClick={onClose}
    >
      <motion.form
        initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
        onClick={e => e.stopPropagation()} onSubmit={handleSubmit}
        noValidate
        className="glass"
        style={{
          width: '100%', maxWidth: '960px',
          height: 'min(90vh, 860px)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-modal)', overflow: 'hidden',
        }}
      >
        {/* ── Fixed Header ── */}
        <div style={{ flexShrink: 0, padding: '24px 28px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={18} style={{ color: 'var(--accent-purple)' }} /> Smart Data Import Engine
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Import commerce data dynamically from files, APIs, WooCommerce, Shopify, or SQL Databases.
              </p>
            </div>
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}><X size={18} /></button>
          </div>

          {/* ── Source selector ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px', marginTop: '14px' }}>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <button
                type="button" key={value}
                onClick={() => {
                  setSource(value);
                  setTableTypeOverride('');
                  setSheetTableTypes({});
                  resetImportState();
                }}
                style={{
                  padding: '8px 10px', borderRadius: '8px', border: '1px solid',
                  borderColor: source === value ? 'var(--accent-purple)' : 'var(--border-input)',
                  background: source === value ? 'var(--accent-purple-glow)' : 'var(--bg-input)',
                  color: source === value ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 150ms ease',
                }}
              >{label}</button>
            ))}
          </div>
        </div>

        <div className="cf-import-modal-body" data-lenis-prevent tabIndex={0} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          
          {/* File Picker / CSV Form */}
          {(source === 'csv' || source === 'excel' || source === 'excel_xls' || source === 'json' || source === 'xml' || source === 'rest_api' || source === 'erp' || source === 'crm') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'rgba(15,23,42,0.02)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {source === 'csv'
                  ? 'Select a CSV or TSV file, or paste delimited rows.'
                  : source === 'excel' || source === 'excel_xls'
                    ? 'Select an Excel workbook. Sheets and columns will be detected automatically.'
                    : 'Upload a source export or paste structured records for preview.'}
              </div>
              <input
                type="file"
                accept={
                  source === 'csv' ? '.csv,.txt,.tsv'
                    : source === 'excel' || source === 'excel_xls' ? '.xlsx,.xls,.xlsm'
                      : source === 'xml' ? '.xml'
                        : '.json,.csv,.txt,.xml'
                }
                onChange={handleFile}
                style={inputStyle}
              />
              {TEXT_PAYLOAD_SOURCES.has(source) && (
                <>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '6px' }}>Or Paste Records:</div>
                  <textarea
                    style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', resize: 'vertical' }}
                    rows={5}
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder={source === 'xml'
                      ? '<products><product><Product Name>Wireless Earbuds Pro</Product Name><SKU>WEP-01</SKU></product></products>'
                      : source === 'csv'
                        ? 'Product Name,SKU,Price,Stock\nWireless Earbuds Pro,WEP-01,79.99,100'
                        : '[{"Product Name":"Wireless Earbuds Pro","SKU":"WEP-01","Price":79.99,"Stock":100}]'}
                  />
                  <button type="button" className="btn btn-secondary" onClick={handleConnect} disabled={isConnecting}>
                    {isConnecting ? 'Processing...' : 'Detect Columns and Preview'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* DB Config details */}
          {isDatabaseSource && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(15,23,42,0.02)' }}>
              {source === 'sqlite' ? (
                <label style={{ gridColumn: 'span 2' }}>
                  <span style={labelStyle}>SQLite DB File Path</span>
                  <input style={inputStyle} value={dbConfig.sqlite_path} onChange={e => setDbConfig(prev => ({ ...prev, sqlite_path: e.target.value }))} placeholder="/absolute/path/to/commerceflow.db" />
                </label>
              ) : (
                <>
                  <label><span style={labelStyle}>Host</span><input style={inputStyle} value={dbConfig.host} onChange={e => setDbConfig(prev => ({ ...prev, host: e.target.value }))} placeholder="localhost" /></label>
                  <label><span style={labelStyle}>Port</span><input style={inputStyle} value={dbConfig.port} onChange={e => setDbConfig(prev => ({ ...prev, port: e.target.value }))} placeholder={source === 'oracle' ? '1521' : source === 'mysql' ? '3306' : source === 'sql_server' ? '1433' : '5432'} /></label>
                  <label><span style={labelStyle}>Database/SID Name</span><input style={inputStyle} value={dbConfig.database} onChange={e => setDbConfig(prev => ({ ...prev, database: e.target.value }))} placeholder="commerce_db" /></label>
                  <label><span style={labelStyle}>Username</span><input style={inputStyle} value={dbConfig.username} onChange={e => setDbConfig(prev => ({ ...prev, username: e.target.value }))} placeholder="db_user" /></label>
                  <label><span style={labelStyle}>Password</span><input style={inputStyle} type="password" value={dbConfig.password} onChange={e => setDbConfig(prev => ({ ...prev, password: e.target.value }))} placeholder="********" /></label>
                </>
              )}
              
              {source === 'oracle' && (
                <>
                  <label><span style={labelStyle}>Service Name</span><input style={inputStyle} value={dbConfig.serviceName} onChange={e => setDbConfig(prev => ({ ...prev, serviceName: e.target.value }))} placeholder="ORCLPDB1" /></label>
                  <label><span style={labelStyle}>Oracle SID</span><input style={inputStyle} value={oracleSid} onChange={e => setOracleSid(e.target.value)} placeholder="ORCL" /></label>
                  <label style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={oracleSchemaBrowsing} onChange={e => setOracleSchemaBrowsing(e.target.checked)} />
                    Enable Schema Browsing & Table Discovery
                  </label>
                  <label style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={oracleIncrementalSync} onChange={e => setOracleIncrementalSync(e.target.checked)} />
                    Enable Incremental Sync (Sync modified rows only)
                  </label>
                </>
              )}

              {['mysql', 'postgresql', 'sql_server', 'sqlite'].includes(source) && (
                <>
                  <label style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={sqlRelationshipDetection} onChange={e => setSqlRelationshipDetection(e.target.checked)} />
                    Auto-detect Table Relationships & Foreign Keys
                  </label>
                  <label style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={sqlIncrementalImports} onChange={e => setSqlIncrementalImports(e.target.checked)} />
                    Enable Incremental Imports
                  </label>
                  <label style={{ gridColumn: 'span 2' }}>
                    <span style={labelStyle}>Custom SQL Query Override (Optional query preview)</span>
                    <textarea style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', resize: 'vertical' }} rows={2} value={sqlCustomQuery} onChange={e => setSqlCustomQuery(e.target.value)} placeholder="SELECT * FROM orders WHERE created_at > date('now', '-30 days')" />
                  </label>
                </>
              )}

              <label style={{ gridColumn: 'span 2' }}>
                <span style={labelStyle}>Selected Tables (Optional, comma-separated)</span>
                <input style={inputStyle} value={dbConfig.selected_tables || ''} onChange={e => setDbConfig(prev => ({ ...prev, selected_tables: e.target.value }))} placeholder="products, orders, customers" />
              </label>
              
              <button type="button" className="btn btn-primary" onClick={handleConnect} style={{ gridColumn: 'span 2', marginTop: '6px' }} disabled={isConnecting}>
                {isConnecting ? 'Connecting...' : `Connect and Discover ${SOURCE_LABELS[source] || 'Database'} Schema`}
              </button>
            </div>
          )}

          {/* Google Sheets Config details */}
          {source === 'google_sheets' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(15,23,42,0.02)' }}>
              <label style={{ gridColumn: 'span 2' }}>
                <span style={labelStyle}>Authorization Method</span>
                <select style={inputStyle} value={sheetsAuthMethod} onChange={e => setSheetsAuthMethod(e.target.value)}>
                  <option value="service_account">Google Service Account (JSON Key)</option>
                  <option value="oauth">Google OAuth 2.0 (Direct Sign In)</option>
                </select>
              </label>

              {sheetsAuthMethod === 'oauth' ? (
                <>
                  <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.2)', backgroundColor: 'rgba(168,85,247,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 650 }}>OAuth Status: Connected</span>
                      <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.72rem' }} onClick={() => recordAction('Triggered OAuth Re-Authentication')}>Re-authorize</button>
                    </div>
                    <label>
                      <span style={labelStyle}>Browse User Spreadsheets</span>
                      <select style={inputStyle} value={sheetsSelectedSpreadsheet} onChange={e => { setSheetsSelectedSpreadsheet(e.target.value); setApiConfig(prev => ({ ...prev, spreadsheetId: e.target.value })); }}>
                        <option value="simulated_store">Sales & Inventory Sheets 2026</option>
                        <option value="marketing_tracker">Marketing Funnel Leads</option>
                        <option value="woocommerce_copy">WooCommerce Catalog Export Backup</option>
                      </select>
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <label><span style={labelStyle}>Spreadsheet ID</span><input style={inputStyle} value={apiConfig.spreadsheetId} onChange={e => setApiConfig(prev => ({ ...prev, spreadsheetId: e.target.value }))} placeholder="1BxiMVs0XRA5nFMd..." /></label>
                  <label style={{ gridColumn: 'span 2' }}>
                    <span style={labelStyle}>Credentials JSON (Service Account Key content)</span>
                    <textarea style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', resize: 'vertical' }} rows={3} value={apiConfig.credentialsJson} onChange={e => setApiConfig(prev => ({ ...prev, credentialsJson: e.target.value }))} placeholder='{"type": "service_account", ...}' />
                  </label>
                </>
              )}

              <label><span style={labelStyle}>Worksheet/Tab Name (Optional)</span><input style={inputStyle} value={apiConfig.worksheet} onChange={e => setApiConfig(prev => ({ ...prev, worksheet: e.target.value }))} placeholder="Sheet1" /></label>
              
              <label>
                <span style={labelStyle}>Scheduled Sync / Auto-Refresh</span>
                <select style={inputStyle} value={sheetsScheduledSync} onChange={e => setSheetsScheduledSync(e.target.value)}>
                  <option value="none">Manual Sync Only</option>
                  <option value="hourly">Hourly Auto-Refresh</option>
                  <option value="daily">Daily Auto-Refresh</option>
                  <option value="weekly">Weekly Auto-Refresh</option>
                </select>
              </label>

              <button type="button" className="btn btn-primary" onClick={handleConnect} style={{ gridColumn: 'span 2', marginTop: '6px' }} disabled={isConnecting}>
                {isConnecting ? 'Connecting...' : 'Connect Google Sheets and Preview'}
              </button>
            </div>
          )}

          {/* WooCommerce Config details */}
          {source === 'woocommerce' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(15,23,42,0.02)' }}>
              <label><span style={labelStyle}>WooCommerce Store URL</span><input style={inputStyle} value={apiConfig.url} onChange={e => setApiConfig(prev => ({ ...prev, url: e.target.value }))} placeholder="https://my-store-domain.com" /></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label><span style={labelStyle}>Consumer Key</span><input style={inputStyle} value={apiConfig.apiKey} onChange={e => setApiConfig(prev => ({ ...prev, apiKey: e.target.value }))} placeholder="ck_..." /></label>
                <label><span style={labelStyle}>Consumer Secret</span><input style={inputStyle} type="password" value={apiConfig.apiSecret} onChange={e => setApiConfig(prev => ({ ...prev, apiSecret: e.target.value }))} placeholder="cs_..." /></label>
              </div>

              <div style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={labelStyle}>Select WooCommerce Entities to Import</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {Object.keys(woocommerceImportOptions).map(opt => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', textTransform: 'capitalize' }}>
                      <input type="checkbox" checked={woocommerceImportOptions[opt]} onChange={e => setWoocommerceImportOptions(prev => ({ ...prev, [opt]: e.target.checked }))} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={woocommerceIncrementalSync} onChange={e => setWoocommerceIncrementalSync(e.target.checked)} />
                Enable Incremental Sync (Only fetch modified WooCommerce records since last sync)
              </label>

              <button type="button" className="btn btn-primary" onClick={handleConnect} style={{ marginTop: '6px' }} disabled={isConnecting}>
                {isConnecting ? 'Connecting...' : 'Connect WooCommerce API and Import'}
              </button>
            </div>
          )}

          {/* Shopify Config details */}
          {source === 'shopify' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(15,23,42,0.02)' }}>
              <label style={{ gridColumn: 'span 2' }}>
                <span style={labelStyle}>Authentication Method</span>
                <select style={inputStyle} value={shopifyAuthMethod} onChange={e => setShopifyAuthMethod(e.target.value)}>
                  <option value="custom_token">Shopify Admin API Access Token (Custom App)</option>
                  <option value="oauth">Shopify OAuth 2.0 OAuth (Public App Sync)</option>
                </select>
              </label>

              <label><span style={labelStyle}>Shopify Shop Domain URL</span><input style={inputStyle} value={apiConfig.url} onChange={e => setApiConfig(prev => ({ ...prev, url: e.target.value }))} placeholder="https://my-shop.myshopify.com" /></label>
              
              {shopifyAuthMethod === 'custom_token' ? (
                <label><span style={labelStyle}>Admin API Access Token</span><input style={inputStyle} type="password" value={apiConfig.accessToken} onChange={e => setApiConfig(prev => ({ ...prev, accessToken: e.target.value }))} placeholder="shpat_..." /></label>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(168,85,247,0.03)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>OAuth Flow: Connected via CommerceFlow App</span>
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.72rem', alignSelf: 'flex-start', marginTop: '4px' }} onClick={() => recordAction('Triggered Shopify OAuth Sync')}>Re-connect Shopify Store</button>
                </div>
              )}

              <div style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={labelStyle}>Shopify Import Datasets</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {Object.keys(shopifyImportOptions).map(opt => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', textTransform: 'capitalize' }}>
                      <input type="checkbox" checked={shopifyImportOptions[opt]} onChange={e => setShopifyImportOptions(prev => ({ ...prev, [opt]: e.target.checked }))} />
                      {opt === 'collections' ? 'Collections' : opt}
                    </label>
                  ))}
                </div>
              </div>

              <label>
                <span style={labelStyle}>Automatic Sync Frequency</span>
                <select style={inputStyle} value={shopifyAutoSync} onChange={e => setShopifyAutoSync(e.target.value)}>
                  <option value="none">Manual Trigger Only</option>
                  <option value="webhooks">Real-time Sync via Webhooks</option>
                  <option value="6h">Every 6 Hours</option>
                  <option value="daily">Daily Sync</option>
                </select>
              </label>

              <button type="button" className="btn btn-primary" onClick={handleConnect} style={{ marginTop: '6px' }} disabled={isConnecting}>
                {isConnecting ? 'Connecting...' : 'Connect Shopify API and Sync'}
              </button>
            </div>
          )}

          {/* Configurable Business Software (JSON Mapping) details */}
          {source === 'business_software' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(15,23,42,0.02)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  <span style={labelStyle}>Business Software Platform</span>
                  <select style={inputStyle} value={businessSoftwareEngine} onChange={e => setBusinessSoftwareEngine(e.target.value)}>
                    <option value="quickbooks">QuickBooks</option>
                    <option value="zoho">Zoho Books</option>
                    <option value="sap">SAP Business One</option>
                    <option value="netsuite">NetSuite ERP</option>
                    <option value="xero">Xero Accountant</option>
                    <option value="dynamics">Microsoft Dynamics 365</option>
                    <option value="odoo">Odoo CRM & Inventory</option>
                  </select>
                </label>
                <label>
                  <span style={labelStyle}>Authentication Type</span>
                  <select style={inputStyle} value={businessSoftwareAuthType} onChange={e => setBusinessSoftwareAuthType(e.target.value)}>
                    <option value="oauth">OAuth 2.0 Credentials</option>
                    <option value="apikey">Personal API Token</option>
                  </select>
                </label>
              </div>

              <div style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={labelStyle}>Specify Records to Fetch & Normalize</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={businessSoftwareImportOptions.financeSales} onChange={e => setBusinessSoftwareImportOptions(prev => ({ ...prev, financeSales: e.target.checked }))} />
                    Finance & Sales
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={businessSoftwareImportOptions.customers} onChange={e => setBusinessSoftwareImportOptions(prev => ({ ...prev, customers: e.target.checked }))} />
                    Customers
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={businessSoftwareImportOptions.inventory} onChange={e => setBusinessSoftwareImportOptions(prev => ({ ...prev, inventory: e.target.checked }))} />
                    Inventory Data
                  </label>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '5px' }}>
                Upload exported JSON export file, or paste a JSON array of raw software records:
              </div>
              <input type="file" accept=".json" onChange={handleFile} style={inputStyle} />
              
              <textarea
                style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', resize: 'vertical' }}
                rows={4}
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder='[{"item_name": "Premium Hoodie", "sku_code": "PH-001", "cost": 45.00, "qty": 30}]'
              />
              <button type="button" className="btn btn-primary" onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? 'Processing...' : `Connect ${businessSoftwareEngine.charAt(0).toUpperCase() + businessSoftwareEngine.slice(1)} and Import`}
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.18)', background: 'rgba(239,68,68,0.06)', color: '#dc2626', fontSize: '0.82rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} /> {error}
            </div>
          )}

          {/* loading message */}
          {isConnecting && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              <span className="cf-spinner" /> Connecting to source and generating synonym mappings...
            </div>
          )}

          {importLogs && (
            <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.06)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--accent-green)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>Data connected successfully.</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Import completed successfully. {importLogs.importedCount} records imported. Dashboard updated.</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                {['Connected', 'Validated', 'Mapped', 'Imported', 'Analytics Generated'].map(step => (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.16)', background: 'var(--bg-card)', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={13} style={{ color: 'var(--accent-green)', flexShrink: 0 }} /> {step}
                  </div>
                ))}
              </div>
              {importLogs.report && (
                <ImportReportPanel report={importLogs.report} warnings={importLogs.warnings} />
              )}
              {importLogs.mappingReport && importLogs.mappingReport.totalOrderSkus > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-card)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>Product Mapping Report</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                    {[
                      ['Orders imported', importLogs.mappingReport.ordersImported],
                      ['Order SKUs', importLogs.mappingReport.totalOrderSkus],
                      ['Matched SKUs', importLogs.mappingReport.matchedSkus],
                      ['Unmatched SKUs', importLogs.mappingReport.unmatchedSkus],
                    ].map(([label, value]) => (
                      <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>{label}</span>
                        <span style={{ fontSize: '0.86rem', color: label === 'Unmatched SKUs' && value > 0 ? '#b91c1c' : 'var(--text-primary)', fontWeight: 800 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  {importLogs.mappingReport.unmatchedItems?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {importLogs.mappingReport.unmatchedItems.slice(0, 3).map((item, idx) => (
                        <div key={`${item.orderId}-${item.sku}-${idx}`} style={{ fontSize: '0.72rem', color: '#b91c1c', lineHeight: 1.4 }}>
                          Missing Product Mapping: SKU {item.sku}, Order {item.orderId}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Proposed Fixes Banner */}
          {proposedFixes && (
            <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.05)', display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '14px' }}>
              <Sparkles size={16} style={{ color: 'var(--accent-purple)', marginTop: '2px', flexShrink: 0 }} />
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Proposed Mapping Auto-Fixes ({proposedFixes.length})
                </div>
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {proposedFixes.map((fix, idx) => (
                    <div key={idx} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.5)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      {isExcelMultiSheet && <span style={{ fontWeight: 700 }}>[{fix.dataset}] </span>}
                      Change column <code style={{ fontFamily: 'var(--font-mono)' }}>{fix.source_column}</code> from <strong>{fix.current_label}</strong> to <strong style={{ color: 'var(--accent-green)' }}>{fix.suggested_label}</strong> ({fix.confidence}% confidence).
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>Reason: {fix.reason}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button type="button" onClick={applyAutoFixes} className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.75rem' }}>
                    Apply Fixes
                  </button>
                  <button type="button" onClick={() => setProposedFixes(null)} className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '0.75rem' }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {status && !importLogs && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'rgba(15,23,42,0.02)' }}>
                {[
                  ['Total records', status.rowCount ?? 0],
                  ['Product rows in file', status.uploadedProductCount ?? previewProductRowCount],
                  ['Preview product rows', previewProductRowCount],
                  ['Total columns', status.columnCount ?? (rows[0] ? Object.keys(rows[0]).length : Object.values(workbookDatasets || {}).reduce((sum, sheetRows) => sum + (sheetRows[0] ? Object.keys(sheetRows[0]).length : 0), 0))],
                  ['Detected entities', flattenDetectedEntities(status.detectedEntities).join(', ') || status.tableDetection?.tableType || 'Review needed'],
                  ['Mapping summary', `${(isExcelMultiSheet ? Object.values(sheetMappings).flat() : mappings).filter(m => getMappingTarget(m)).length} mapped`],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>{label}</span>
                    <span style={{ fontSize: '0.86rem', color: 'var(--text-primary)', fontWeight: 700 }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleAIMapping}
                  disabled={isAiMapping}
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Sparkles size={13} />
                  {isAiMapping ? 'Running AI mapping...' : 'Re-run AI Mapping'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRawExplorer(prev => !prev)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Table2 size={13} />
                  {showRawExplorer ? 'Hide All Data' : 'Show All Data'}
                </button>
                {mappingMeta?.provider && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                    Mapper: {mappingMeta.provider}
                  </span>
                )}
              </div>
              {showRawExplorer && (isExcelMultiSheet ? workbookDatasets : (rows.length ? { 'Imported Data': rows } : null)) && (
                <RawDataExplorer
                  datasets={isExcelMultiSheet ? workbookDatasets : { 'Imported Data': rows }}
                  mappingMeta={mappingMeta}
                />
              )}
            </div>
          )}

          {/* ═══════════════════ MULTI-SHEET WORKBOOK / DB UI ═══════════════════ */}
          {isExcelMultiSheet && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.18)' }}>
                <Table2 size={16} style={{ color: 'var(--accent-purple)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {Object.keys(workbookDatasets).length} sheet(s) / table(s) detected
                </span>
              </div>

              {Object.entries(workbookDatasets).map(([sheetName, sheetRows]) => {
                const sheetMap = sheetMappings[sheetName] || [];
                const avgConfidence = sheetMap.length
                  ? Math.round(sheetMap.reduce((s, m) => s + m.confidence, 0) / sheetMap.length)
                  : 0;
                const isOpen = expandedSheet === sheetName;
                const headers = sheetRows[0] ? Object.keys(sheetRows[0]) : [];

                return (
                  <div key={sheetName} style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                    
                    <button
                      type="button"
                      onClick={() => setExpandedSheet(isOpen ? null : sheetName)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: isOpen ? 'rgba(79,70,229,0.05)' : 'rgba(15,23,42,0.02)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <Table2 size={16} style={{ color: 'var(--accent-purple)', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{sheetName}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '10px' }}>
                          {sheetRows.length} record(s) · {headers.length} column(s)
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: confidenceColor(avgConfidence), marginRight: '8px' }}>
                        {avgConfidence}% mapping confidence
                      </span>
                      {isOpen ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                    </button>

                    {isOpen && (
                      <div style={{ padding: '0 16px 16px' }}>
                        
                        {/* Target Schema Selector */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(15,23,42,0.02)', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Target Schema:</span>
                            <select
                              style={{ ...inputStyle, padding: '4px 8px', fontSize: '0.78rem', width: 'auto' }}
                              value={sheetTableTypes[sheetName] || (sheetMap[0]?.entity?.toLowerCase() || 'unknown')}
                              onChange={e => {
                                updateSheetTableType(sheetName, e.target.value);
                                // Auto re-arrange entities on change
                                setSheetMappings(prev => {
                                  const list = (prev[sheetName] || []).map(item => ({
                                    ...item,
                                    entity: e.target.value.toUpperCase()
                                  }));
                                  return { ...prev, [sheetName]: list };
                                });
                              }}
                            >
                              <option value="unknown">Unknown / Ignore</option>
                              <option value="products">Products</option>
                              <option value="customers">Customers</option>
                              <option value="orders">Orders</option>
                              <option value="inventory">Inventory</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={handleAutoFix}
                            className="btn btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Sparkles size={12} style={{ color: 'var(--accent-purple)' }} /> Auto Fix Mappings
                          </button>
                        </div>

                        {/* Sample Rows Preview */}
                        <div style={{ marginTop: '12px', marginBottom: '14px' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Data Preview (first 10 records)</div>
                          <div className="cf-scroll-both" data-lenis-prevent style={{ borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                              <thead>
                                <tr style={{ background: 'rgba(15,23,42,0.04)' }}>
                                  {headers.map(h => (
                                    <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sheetRows.slice(0, 10).map((row, ri) => (
                                  <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                                    {headers.map(h => (
                                      <td key={h} style={{ padding: '6px 10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {String(row[h] ?? '')}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Mappings selection */}
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Column Mapping Configuration</div>
                        <div className="cf-scroll-both" data-lenis-prevent style={{ border: '1px solid var(--border)', borderRadius: '8px', maxHeight: '360px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 80px 110px', gap: '8px', padding: '8px 12px', background: 'rgba(15,23,42,0.03)', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, position: 'sticky', top: 0, zIndex: 2, borderBottom: '1px solid var(--border)' }}>
                            <span>Source Column</span><span>Mapped normalized field</span><span>Confidence</span><span>Status</span>
                          </div>
                          {sheetMap.map((item, idx) => {
                            const mappingStatus = (() => {
                              if (!item.target_field) return { label: 'Skipped', color: 'var(--text-muted)' };
                              if (item.confidence >= 90) return { label: 'Auto-mapped', color: 'var(--accent-green)' };
                              return { label: 'Needs Review', color: '#d97706' };
                            })();
                            return (
                              <div key={item.source_column} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 80px 110px', gap: '8px', padding: '7px 12px', borderTop: idx > 0 ? '1px solid var(--border)' : 'none', alignItems: 'center', background: item.confidence < 70 && item.target_field ? 'rgba(234,179,8,0.03)' : 'transparent' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.source_column}</span>
                                <select
                                  style={{ ...inputStyle, padding: '6px 8px', fontSize: '0.78rem', borderColor: item.confidence < 70 && item.target_field ? 'rgba(234,179,8,0.3)' : 'var(--border)' }}
                                  value={item.target_field || ''}
                                  onChange={e => updateSheetMapping(sheetName, item.source_column, e.target.value)}
                                >
                                  <option value="">Unmapped (Skip)</option>
                                  {fieldOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: confidenceColor(item.confidence) }} />
                                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: confidenceColor(item.confidence) }}>{item.confidence}%</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: mappingStatus.color, fontWeight: 600 }}>
                                  <span>{mappingStatus.label}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══════════════════ FLAT CSV / TSV / SINGLE SHEET UI ═══════════════════ */}
          {!isExcelMultiSheet && rows.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Target Schema dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(15,23,42,0.02)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Target Schema:</span>
                <select
                  style={{ ...inputStyle, padding: '4px 8px', fontSize: '0.78rem', width: 'auto' }}
                  value={tableTypeOverride || status?.tableDetection?.tableType || 'unknown'}
                  onChange={e => handleTableTypeOverrideChange(e.target.value)}
                >
                  <option value="unknown">Unknown / Select Type</option>
                  <option value="products">Products</option>
                  <option value="customers">Customers</option>
                  <option value="orders">Orders</option>
                  <option value="inventory">Inventory</option>
                </select>
              </div>

              {/* Data Preview */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Import Preview (first 10 rows)</div>
                <div className="cf-scroll-both" data-lenis-prevent style={{ borderRadius: '8px', border: '1px solid var(--border)', maxHeight: '180px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(15,23,42,0.04)' }}>
                        {Object.keys(rows[0] || {}).map(h => (
                          <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 10).map((row, ri) => (
                        <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                          {Object.keys(rows[0] || {}).map(h => (
                            <td key={h} style={{ padding: '6px 10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {String(row[h] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mappings */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AI Column Mapping Suggestions</div>
                  <button
                    type="button"
                    onClick={handleAutoFix}
                    className="btn btn-secondary"
                    style={{ padding: '5px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Sparkles size={12} style={{ color: 'var(--accent-purple)' }} /> Auto Fix Mappings
                  </button>
                </div>
                <div className="cf-mapping-table-wrap" data-lenis-prevent tabIndex={0} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 80px 110px', gap: '8px', padding: '10px 12px', background: 'rgba(15,23,42,0.03)', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, position: 'sticky', top: 0, zIndex: 2, borderBottom: '1px solid var(--border)' }}>
                    <span>Source Column</span><span>AI Suggested field</span><span>Confidence</span><span>Status</span>
                  </div>
                  {mappings.map((item, idx) => {
                    const mappingStatus = (() => {
                      if (!item.target_field) return { label: 'Skipped', color: 'var(--text-muted)' };
                      if (item.confidence >= 90) return { label: 'Auto-mapped', color: 'var(--accent-green)' };
                      return { label: 'Needs Review', color: '#d97706' };
                    })();
                    return (
                      <div key={item.source_column} style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 80px 110px', gap: '8px', padding: '8px 12px', borderTop: idx > 0 ? '1px solid var(--border)' : 'none', alignItems: 'center', background: item.confidence < 70 && item.target_field ? 'rgba(234,179,8,0.03)' : 'transparent' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.source_column}</span>
                        <select
                          style={{ ...inputStyle, padding: '8px 10px', borderColor: item.confidence < 70 && item.target_field ? 'rgba(234,179,8,0.3)' : 'var(--border)' }}
                          value={item.target_field || ''}
                          onChange={e => updateMapping(item.source_column, e.target.value)}
                        >
                          <option value="">Unmapped (Skip)</option>
                          {fieldOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: confidenceColor(item.confidence) }} />
                          <span style={{ fontSize: '0.8rem', color: confidenceColor(item.confidence), fontWeight: 700 }}>{item.confidence}%</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: mappingStatus.color, fontWeight: 600 }}>
                          <span>{mappingStatus.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* Validation Warnings/Errors/Suggestions Box */}
          {status && status.warnings && status.warnings.length > 0 && (() => {
            const errors = status.warnings.filter(w => w.severity === 'error');
            const warnings = status.warnings.filter(w => w.severity === 'warning');
            const suggestions = status.warnings.filter(w => w.severity === 'suggestion' || w.severity === 'info');

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* 1. Errors section */}
                {errors.length > 0 && (
                  <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.18)', background: 'rgba(239,68,68,0.04)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ width: '100%' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#991b1b' }}>
                        Validation Errors Identified ({errors.length} issue(s) - save blocked)
                      </div>
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {errors.map((w, i) => (
                          <div key={i} style={{ padding: '8px 10px', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.15)' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#991b1b', marginBottom: '2px' }}>
                              {w.row_number ? `Row ${w.row_number}` : 'Schema mapping'} {w.column && <><span style={{ opacity: 0.5 }}>•</span> {w.column}</>}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginBottom: '4px' }}>
                              {w.message}
                            </div>
                            {w.suggested_fix && (
                              <div style={{ fontSize: '0.7rem', color: '#7f1d1d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontWeight: 600 }}>Fix:</span> {w.suggested_fix}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Warnings section */}
                {warnings.length > 0 && (
                  <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid rgba(217,119,6,0.18)', background: 'rgba(217,119,6,0.04)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <AlertTriangle size={16} style={{ color: '#d97706', marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ width: '100%' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e' }}>
                        Validation Warnings Identified ({warnings.length} issue(s))
                      </div>
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {warnings.slice(0, 10).map((w, i) => {
                          const genInfo = getGenerateFieldForWarning(w);
                          return (
                            <div key={i} style={{ padding: '8px 10px', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid rgba(180,83,9,0.15)' }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#92400e', marginBottom: '2px' }}>
                                {w.row_number ? `Row ${w.row_number}` : 'Schema mapping'} {w.column && <><span style={{ opacity: 0.5 }}>•</span> {w.column}</>}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#b45309', marginBottom: '4px' }}>
                                {w.message}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#78350f', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                                <span><span style={{ fontWeight: 600 }}>Fix:</span> {w.suggested_fix}</span>
                                {genInfo && (
                                  <button
                                    type="button"
                                    onClick={() => handleGenerateField(genInfo.key)}
                                    className="btn btn-secondary"
                                    style={{ padding: '2px 6px', fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '3px', height: 'auto', border: '1px solid rgba(180,83,9,0.3)' }}
                                  >
                                    <Sparkles size={10} style={{ color: 'var(--accent-purple)' }} /> Auto-Generate {genInfo.label}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {warnings.length > 10 && (
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#b45309', padding: '4px 0' }}>
                            +{warnings.length - 10} more warnings (showing top 10)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Suggestions section */}
                {suggestions.length > 0 && (
                  <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.18)', background: 'rgba(59,130,246,0.04)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <Sparkles size={16} style={{ color: '#3b82f6', flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ width: '100%' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a' }}>
                        Mapping Insights & Auto-Fix Suggestions ({suggestions.length} suggestion(s))
                      </div>
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {suggestions.slice(0, 5).map((w, i) => (
                          <div key={i} style={{ padding: '8px 10px', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid rgba(59,130,246,0.15)' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e3a8a', marginBottom: '2px' }}>
                              {w.column && <><span style={{ opacity: 0.5 }}>Column •</span> {w.column}</>}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#2563eb', marginBottom: '4px' }}>
                              {w.message}
                            </div>
                            {w.suggested_fix && (
                              <div style={{ fontSize: '0.7rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontWeight: 600 }}>Tip:</span> {w.suggested_fix}
                              </div>
                            )}
                          </div>
                        ))}
                        {suggestions.length > 5 && (
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', padding: '4px 0' }}>
                            +{suggestions.length - 5} more suggestions
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })()}
      </div>{/* end .cf-import-modal-body */}

      {/* ── Sticky Footer: Import Button ── */}
      <div className="cf-import-modal-footer" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {mappingValidationPreview?.requiresApproval && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={mappingApproved}
              onChange={(e) => setMappingApproved(e.target.checked)}
              style={{ marginTop: '2px' }}
            />
            <span>
              I reviewed {mappingValidationPreview.warnings?.length || 0} mapping warning(s)
              {mappingValidationPreview.errors?.length ? ` and ${mappingValidationPreview.errors.length} rejected mapping(s)` : ''}.
              Approve mappings before import.
            </span>
          </label>
        )}
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
          <Upload size={14} /> Import and Map Data
        </button>
      </div>
      </motion.form>
    </motion.div>
  );
}

/* ───────────────────── Mini SVG Sales Chart ───────────────────── */
function SalesChart({ orders }) {
  const dailyRevenue = useMemo(() => {
    const map = {};
    orders.forEach(o => { if (o.date) map[o.date] = (map[o.date] || 0) + (o.total || 0); });
    const sorted = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
    return sorted.map(([date, total]) => ({ date, total }));
  }, [orders]);

  const maxVal = Math.max(0, ...dailyRevenue.map(d => d.total));
  const hasSeries = dailyRevenue.length >= 2 && maxVal > 0;
  const chartScale = maxVal * 1.15;
  const w = 100, h = 100;
  const points = hasSeries ? dailyRevenue.map((d, i) => {
    const x = (i / (dailyRevenue.length - 1)) * w;
    const y = h - (d.total / chartScale) * h;
    return { x, y, ...d };
  }) : [];

  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = lineD + ` L ${w} ${h} L 0 ${h} Z`;

  return (
    <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Sales Analytics</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Revenue per day</p>
        </div>
        <TrendingUp size={16} style={{ color: 'var(--accent-purple)' }} />
      </div>
      <div style={{ height: '180px', position: 'relative', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(15,23,42,0.01)', overflow: 'hidden' }}>
        {hasSeries && (
          <>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px 0', pointerEvents: 'none' }}>
              <div style={{ borderTop: '1px dashed rgba(15,23,42,0.06)' }} />
              <div style={{ borderTop: '1px dashed rgba(15,23,42,0.06)' }} />
              <div style={{ borderTop: '1px dashed rgba(15,23,42,0.06)' }} />
            </div>
            <svg style={{ width: '100%', height: '100%', position: 'absolute' }} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-purple)" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={areaD} fill="url(#salesGrad)" />
              <path d={lineD} fill="none" stroke="var(--accent-purple)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ position: 'absolute', bottom: '6px', left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 12px', pointerEvents: 'none' }}>
              {points.map((p, i) => (
                <span key={i} style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                  {p.date.slice(5)}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const DEFAULT_PREFERENCES = {
  theme: 'dark',
  language: 'English',
  dateFormat: 'MMM D, YYYY',
  timeFormat: '12-hour',
  defaultDashboardView: 'Dashboard',
  orderNotifications: true,
  lowStockNotifications: true,
  failedPaymentNotifications: true,
  dailySummaryReports: false,
  weeklyAnalyticsReports: true,
  pushNotifications: false,
  emailNotifications: true,
  orderSort: 'date_desc',
  workspaceName: 'CommerceFlow HQ',
  companyLogoName: '',
  businessEmail: 'ops@commerceflow.local',
  phoneNumber: '',
  businessAddress: '',
  currency: 'USD',
  timeZone: 'Asia/Kolkata',
  defaultOrderStatus: 'Pending',
  orderPrefix: 'ORD',
  autoRefreshOrders: true,
  autoArchiveCompletedOrders: false,
  invoiceFormat: 'INV-{YYYY}-{####}',
  inventoryTracking: true,
  lowStockThreshold: 5,
  autoStockDeduction: true,
  skuRules: 'Category prefix + sequence',
  stockAlertSettings: 'When stock drops below threshold',
  aiConfidenceThreshold: 80,
  autoCategorization: true,
  autoStatusDetection: true,
  autoCustomerMatching: true,
  aiImportSuggestions: true,
  aiErrorDetection: true,
  saveMappingTemplates: true,
  defaultImportMapping: 'AI detected',
  csvImportOptions: 'Headers in first row',
  excelImportOptions: 'All sheets',
  googleSheetsImportSettings: 'Selected worksheet',
  sqlImportSettings: 'Read-only tables',
  oracleImportSettings: 'Service connection',
  exportFormat: 'CSV',
  inviteEmail: '',
  defaultRole: 'Analyst',
  permissionMatrix: 'Role based',
  activityLogs: true,
  twoFactorAuth: false,
  activeSessions: true,
  loginHistory: true,
  apiKeyManagement: false,
  currentPlan: 'Growth',
  usageStatistics: true,
  billingHistory: true,
  paymentMethods: 'Primary card',
  debugMode: false,
  systemLogs: false,
  dataRetentionPolicy: '365 days',
  backupRestore: true,
};

const SETTINGS_SECTIONS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'workspace', label: 'Workspace', icon: Building2 },
  { id: 'orders', label: 'Orders', icon: ReceiptText },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'ai', label: 'AI Automation', icon: Bot },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'import', label: 'Import & Export', icon: Download },
  { id: 'team', label: 'Team & Permissions', icon: UserPlus },
  { id: 'security', label: 'Security', icon: LockKeyhole },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'advanced', label: 'Advanced', icon: TerminalSquare },
];

function ToggleControl({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`cf-toggle ${checked ? 'is-on' : ''}`}
      aria-pressed={checked}
    >
      <motion.span layout transition={{ type: 'spring', stiffness: 450, damping: 30 }} />
    </button>
  );
}

function SettingsField({ title, description, children }) {
  return (
    <div className="cf-setting-row">
      <div>
        <h4>{title}</h4>
        {description && <p>{description}</p>}
      </div>
      <div className="cf-setting-control">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder = '', type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="cf-input"
    />
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="cf-input">
      {options.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
}

function EnterpriseSettings({ preferences, updatePreference }) {
  const [activeSection, setActiveSection] = useState('general');
  const [settingsSearch, setSettingsSearch] = useState('');
  const activeMeta = SETTINGS_SECTIONS.find(section => section.id === activeSection) || SETTINGS_SECTIONS[0];
  const SectionIcon = activeMeta.icon;

  const matchesSearch = (terms) => {
    if (!settingsSearch.trim()) return true;
    return terms.toLowerCase().includes(settingsSearch.trim().toLowerCase());
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <>
            {matchesSearch('theme light dark system') && (
              <SettingsField title="Theme" description="Choose how CommerceFlow appears across your workspace.">
                <div className="cf-segmented">
                  {[
                    ['light', Sun],
                    ['dark', Moon],
                    ['system', Monitor],
                  ].map(([theme, Icon]) => (
                    <button key={theme} type="button" className={preferences.theme === theme ? 'is-active' : ''} onClick={() => updatePreference('theme', theme)}>
                      <Icon size={14} /> {theme}
                    </button>
                  ))}
                </div>
              </SettingsField>
            )}
            {matchesSearch('language') && <SettingsField title="Language" description="Set the default interface language."><SelectInput value={preferences.language} onChange={value => updatePreference('language', value)} options={['English', 'Hindi', 'Spanish', 'French', 'German']} /></SettingsField>}
            {matchesSearch('date format') && <SettingsField title="Date Format" description="Control how dates appear in dashboards and reports."><SelectInput value={preferences.dateFormat} onChange={value => updatePreference('dateFormat', value)} options={['MMM D, YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']} /></SettingsField>}
            {matchesSearch('time format') && <SettingsField title="Time Format" description="Control time display across activity and import logs."><SelectInput value={preferences.timeFormat} onChange={value => updatePreference('timeFormat', value)} options={['12-hour', '24-hour']} /></SettingsField>}
            {matchesSearch('default dashboard view') && <SettingsField title="Default Dashboard View" description="Pick the first view to show when opening the console."><SelectInput value={preferences.defaultDashboardView} onChange={value => updatePreference('defaultDashboardView', value)} options={['Dashboard', 'Products', 'Orders', 'Inventory', 'AI Insights']} /></SettingsField>}
          </>
        );
      case 'workspace':
        return (
          <>
            <SettingsField title="Workspace Name" description="The name shown in the workspace switcher."><TextInput value={preferences.workspaceName} onChange={value => updatePreference('workspaceName', value)} /></SettingsField>
            <SettingsField title="Company Logo Upload" description="Keep a logo reference for your workspace profile."><TextInput value={preferences.companyLogoName} onChange={value => updatePreference('companyLogoName', value)} placeholder="logo-file.png" /></SettingsField>
            <SettingsField title="Business Email" description="Primary contact for operations and reports."><TextInput type="email" value={preferences.businessEmail} onChange={value => updatePreference('businessEmail', value)} /></SettingsField>
            <SettingsField title="Phone Number" description="Customer support or operations phone number."><TextInput value={preferences.phoneNumber} onChange={value => updatePreference('phoneNumber', value)} placeholder="+91 ..." /></SettingsField>
            <SettingsField title="Business Address" description="Used for invoice and workspace records."><TextInput value={preferences.businessAddress} onChange={value => updatePreference('businessAddress', value)} placeholder="Address" /></SettingsField>
            <SettingsField title="Currency Selection" description="Default currency for reporting labels."><SelectInput value={preferences.currency} onChange={value => updatePreference('currency', value)} options={['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD']} /></SettingsField>
            <SettingsField title="Time Zone" description="Time zone for operational timestamps."><SelectInput value={preferences.timeZone} onChange={value => updatePreference('timeZone', value)} options={['Asia/Kolkata', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London']} /></SettingsField>
          </>
        );
      case 'orders':
        return (
          <>
            <SettingsField title="Default Order Status" description="Initial status for manually created orders."><SelectInput value={preferences.defaultOrderStatus} onChange={value => updatePreference('defaultOrderStatus', value)} options={['Pending', 'Processing', 'Shipped', 'Delivered']} /></SettingsField>
            <SettingsField title="Order Number Prefix" description="Prefix displayed before generated order numbers."><TextInput value={preferences.orderPrefix} onChange={value => updatePreference('orderPrefix', value)} /></SettingsField>
            <SettingsField title="Auto Refresh Orders" description="Keep order views fresh while you work."><ToggleControl checked={preferences.autoRefreshOrders} onChange={value => updatePreference('autoRefreshOrders', value)} /></SettingsField>
            <SettingsField title="Auto Archive Completed Orders" description="Move delivered orders out of daily views automatically."><ToggleControl checked={preferences.autoArchiveCompletedOrders} onChange={value => updatePreference('autoArchiveCompletedOrders', value)} /></SettingsField>
            <SettingsField title="Default Order Sorting" description="Controls the existing Orders page display order."><SelectInput value={preferences.orderSort} onChange={value => updatePreference('orderSort', value)} options={['date_desc', 'date_asc', 'status']} /></SettingsField>
            <SettingsField title="Invoice Number Format" description="Template used for invoice display."><TextInput value={preferences.invoiceFormat} onChange={value => updatePreference('invoiceFormat', value)} /></SettingsField>
          </>
        );
      case 'inventory':
        return (
          <>
            <SettingsField title="Enable Inventory Tracking" description="Show stock state and inventory alerts."><ToggleControl checked={preferences.inventoryTracking} onChange={value => updatePreference('inventoryTracking', value)} /></SettingsField>
            <SettingsField title="Low Stock Threshold" description="Threshold used for low stock warnings."><TextInput type="number" value={preferences.lowStockThreshold} onChange={value => updatePreference('lowStockThreshold', value)} /></SettingsField>
            <SettingsField title="Auto Stock Deduction" description="Deduct inventory when orders are booked."><ToggleControl checked={preferences.autoStockDeduction} onChange={value => updatePreference('autoStockDeduction', value)} /></SettingsField>
            <SettingsField title="SKU Generation Rules" description="Preferred naming convention for new SKU references."><TextInput value={preferences.skuRules} onChange={value => updatePreference('skuRules', value)} /></SettingsField>
            <SettingsField title="Stock Alert Settings" description="How inventory warnings are presented."><TextInput value={preferences.stockAlertSettings} onChange={value => updatePreference('stockAlertSettings', value)} /></SettingsField>
          </>
        );
      case 'ai':
        return (
          <>
            <SettingsField title="AI Mapping Confidence Threshold" description="Minimum confidence used to trust AI import mappings."><TextInput type="number" value={preferences.aiConfidenceThreshold} onChange={value => updatePreference('aiConfidenceThreshold', value)} /></SettingsField>
            <SettingsField title="Auto Categorization" description="Let AI classify imported catalog records."><ToggleControl checked={preferences.autoCategorization} onChange={value => updatePreference('autoCategorization', value)} /></SettingsField>
            <SettingsField title="Auto Status Detection" description="Detect fulfillment status from imported records."><ToggleControl checked={preferences.autoStatusDetection} onChange={value => updatePreference('autoStatusDetection', value)} /></SettingsField>
            <SettingsField title="Auto Customer Matching" description="Match repeat customer records during imports."><ToggleControl checked={preferences.autoCustomerMatching} onChange={value => updatePreference('autoCustomerMatching', value)} /></SettingsField>
            <SettingsField title="AI Import Suggestions" description="Show AI recommendations during imports."><ToggleControl checked={preferences.aiImportSuggestions} onChange={value => updatePreference('aiImportSuggestions', value)} /></SettingsField>
            <SettingsField title="AI Error Detection" description="Flag anomalies before records are imported."><ToggleControl checked={preferences.aiErrorDetection} onChange={value => updatePreference('aiErrorDetection', value)} /></SettingsField>
          </>
        );
      case 'notifications':
        return (
          <>
            <SettingsField title="New Order Alerts" description="Notify when new orders enter the system."><ToggleControl checked={preferences.orderNotifications} onChange={value => updatePreference('orderNotifications', value)} /></SettingsField>
            <SettingsField title="Low Stock Alerts" description="Notify when inventory drops below threshold."><ToggleControl checked={preferences.lowStockNotifications} onChange={value => updatePreference('lowStockNotifications', value)} /></SettingsField>
            <SettingsField title="Failed Payment Alerts" description="Notify when payment records fail validation."><ToggleControl checked={preferences.failedPaymentNotifications} onChange={value => updatePreference('failedPaymentNotifications', value)} /></SettingsField>
            <SettingsField title="Daily Summary Reports" description="Receive a daily operational summary."><ToggleControl checked={preferences.dailySummaryReports} onChange={value => updatePreference('dailySummaryReports', value)} /></SettingsField>
            <SettingsField title="Weekly Analytics Reports" description="Receive weekly AI analytics reports."><ToggleControl checked={preferences.weeklyAnalyticsReports} onChange={value => updatePreference('weeklyAnalyticsReports', value)} /></SettingsField>
            <SettingsField title="Push Notifications" description="Enable browser push notifications."><ToggleControl checked={preferences.pushNotifications} onChange={value => updatePreference('pushNotifications', value)} /></SettingsField>
            <SettingsField title="Email Notifications" description="Send notification emails to workspace contacts."><ToggleControl checked={preferences.emailNotifications} onChange={value => updatePreference('emailNotifications', value)} /></SettingsField>
          </>
        );
      case 'import':
        return (
          <>
            <SettingsField title="Save Mapping Templates" description="Retain import mapping choices for reuse."><ToggleControl checked={preferences.saveMappingTemplates} onChange={value => updatePreference('saveMappingTemplates', value)} /></SettingsField>
            <SettingsField title="Default Import Mapping" description="Preferred mapping mode for incoming data."><SelectInput value={preferences.defaultImportMapping} onChange={value => updatePreference('defaultImportMapping', value)} options={['AI detected', 'Last used', 'Manual review']} /></SettingsField>
            <SettingsField title="CSV Import Options" description="Default handling for CSV files."><SelectInput value={preferences.csvImportOptions} onChange={value => updatePreference('csvImportOptions', value)} options={['Headers in first row', 'No headers', 'Auto detect delimiter']} /></SettingsField>
            <SettingsField title="Excel Import Options" description="Default handling for Excel workbooks."><SelectInput value={preferences.excelImportOptions} onChange={value => updatePreference('excelImportOptions', value)} options={['All sheets', 'First sheet only', 'Manual sheet selection']} /></SettingsField>
            <SettingsField title="Google Sheets Import Settings" description="Default Google Sheets behavior."><TextInput value={preferences.googleSheetsImportSettings} onChange={value => updatePreference('googleSheetsImportSettings', value)} /></SettingsField>
            <SettingsField title="SQL Import Settings" description="Default SQL import mode."><TextInput value={preferences.sqlImportSettings} onChange={value => updatePreference('sqlImportSettings', value)} /></SettingsField>
            <SettingsField title="Oracle Import Settings" description="Default Oracle import mode."><TextInput value={preferences.oracleImportSettings} onChange={value => updatePreference('oracleImportSettings', value)} /></SettingsField>
            <SettingsField title="Export Format Selection" description="Preferred export file format."><SelectInput value={preferences.exportFormat} onChange={value => updatePreference('exportFormat', value)} options={['CSV', 'Excel', 'JSON', 'PDF']} /></SettingsField>
          </>
        );
      case 'team':
        return (
          <>
            <SettingsField title="Invite Team Members" description="Prepare an invite email for teammates."><TextInput type="email" value={preferences.inviteEmail} onChange={value => updatePreference('inviteEmail', value)} placeholder="teammate@company.com" /></SettingsField>
            <SettingsField title="User Role Management" description="Default role assigned to new users."><SelectInput value={preferences.defaultRole} onChange={value => updatePreference('defaultRole', value)} options={['Admin', 'Manager', 'Analyst', 'Viewer']} /></SettingsField>
            <SettingsField title="Permission Matrix" description="Permission model used across modules."><SelectInput value={preferences.permissionMatrix} onChange={value => updatePreference('permissionMatrix', value)} options={['Role based', 'Custom per user', 'Read-only team']} /></SettingsField>
            <SettingsField title="Activity Logs" description="Record notable workspace activity."><ToggleControl checked={preferences.activityLogs} onChange={value => updatePreference('activityLogs', value)} /></SettingsField>
          </>
        );
      case 'security':
        return (
          <>
            <SettingsField title="Change Password" description="Password changes are handled by your auth provider."><button type="button" className="btn btn-secondary"><KeyRound size={14} /> Manage</button></SettingsField>
            <SettingsField title="Two-Factor Authentication" description="Add an extra sign-in verification step."><ToggleControl checked={preferences.twoFactorAuth} onChange={value => updatePreference('twoFactorAuth', value)} /></SettingsField>
            <SettingsField title="Active Sessions" description="Show currently signed-in sessions."><ToggleControl checked={preferences.activeSessions} onChange={value => updatePreference('activeSessions', value)} /></SettingsField>
            <SettingsField title="Login History" description="Track recent account sign-ins."><ToggleControl checked={preferences.loginHistory} onChange={value => updatePreference('loginHistory', value)} /></SettingsField>
            <SettingsField title="API Key Management" description="Manage API key access from this workspace."><ToggleControl checked={preferences.apiKeyManagement} onChange={value => updatePreference('apiKeyManagement', value)} /></SettingsField>
          </>
        );
      case 'billing':
        return (
          <>
            <SettingsField title="Current Plan" description="Workspace plan label."><SelectInput value={preferences.currentPlan} onChange={value => updatePreference('currentPlan', value)} options={['Starter', 'Growth', 'Scale', 'Enterprise']} /></SettingsField>
            <SettingsField title="Usage Statistics" description="Show usage metrics in billing."><ToggleControl checked={preferences.usageStatistics} onChange={value => updatePreference('usageStatistics', value)} /></SettingsField>
            <SettingsField title="Billing History" description="Show billing history cards."><ToggleControl checked={preferences.billingHistory} onChange={value => updatePreference('billingHistory', value)} /></SettingsField>
            <SettingsField title="Payment Methods" description="Primary payment method label."><TextInput value={preferences.paymentMethods} onChange={value => updatePreference('paymentMethods', value)} /></SettingsField>
          </>
        );
      default:
        return (
          <>
            <SettingsField title="Debug Mode" description="Expose extra diagnostics in development views."><ToggleControl checked={preferences.debugMode} onChange={value => updatePreference('debugMode', value)} /></SettingsField>
            <SettingsField title="System Logs" description="Show operational system logs."><ToggleControl checked={preferences.systemLogs} onChange={value => updatePreference('systemLogs', value)} /></SettingsField>
            <SettingsField title="Data Retention Policy" description="How long operational records are retained."><SelectInput value={preferences.dataRetentionPolicy} onChange={value => updatePreference('dataRetentionPolicy', value)} options={['90 days', '180 days', '365 days', 'Forever']} /></SettingsField>
            <SettingsField title="Backup & Restore" description="Keep backup controls visible."><ToggleControl checked={preferences.backupRestore} onChange={value => updatePreference('backupRestore', value)} /></SettingsField>
            <SettingsField title="Clear Cache" description="Clear local workspace cache without deleting business data."><button type="button" className="btn btn-secondary"><RefreshCw size={14} /> Clear Cache</button></SettingsField>
            <SettingsField title="Reset Workspace" description="Protected destructive action placeholder."><button type="button" className="btn btn-secondary"><Shield size={14} /> Review</button></SettingsField>
          </>
        );
    }
  };

  return (
    <div className="cf-settings-center">
      <aside className="cf-settings-nav">
        <div className="cf-settings-search">
          <Search size={15} />
          <input value={settingsSearch} onChange={e => setSettingsSearch(e.target.value)} placeholder="Search settings" />
        </div>
        {SETTINGS_SECTIONS.map(section => {
          const Icon = section.icon;
          const active = activeSection === section.id;
          return (
            <button key={section.id} type="button" className={active ? 'is-active' : ''} onClick={() => setActiveSection(section.id)}>
              <Icon size={16} />
              <span>{section.label}</span>
              {active && <motion.span layoutId="settings-nav-active" className="cf-settings-nav-pill" />}
            </button>
          );
        })}
      </aside>
      <motion.section
        key={activeSection}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22 }}
        className="cf-settings-panel glass"
      >
        <div className="cf-settings-heading">
          <div className="cf-icon-tile"><SectionIcon size={18} /></div>
          <div>
            <h2>{activeMeta.label}</h2>
            <p>Enterprise controls for CommerceFlow workspace personalization.</p>
          </div>
        </div>
        <div className="cf-settings-grid">
          {renderSection()}
        </div>
      </motion.section>
    </div>
  );
}

function CommandPalette({ open, onClose, items, onSelect }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef(null);
  const filtered = items.filter(item => `${item.label} ${item.group}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const activeButton = listRef.current?.querySelector(`[data-command-index="${activeIndex}"]`);
    activeButton?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleKeyDown = (event) => {
    if (filtered.length === 0) return;
    const pageSize = 6;
    const lastIndex = filtered.length - 1;
    const moves = {
      ArrowDown: Math.min(activeIndex + 1, lastIndex),
      ArrowUp: Math.max(activeIndex - 1, 0),
      Home: 0,
      End: lastIndex,
      PageDown: Math.min(activeIndex + pageSize, lastIndex),
      PageUp: Math.max(activeIndex - pageSize, 0),
    };

    if (Object.prototype.hasOwnProperty.call(moves, event.key)) {
      event.preventDefault();
      setActiveIndex(moves[event.key]);
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      onSelect(filtered[activeIndex]);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="cf-command-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="cf-command-panel glass" initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
            <div className="cf-command-search">
              <Command size={17} />
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search commands, pages, and actions" />
            </div>
            <div className="cf-command-list" ref={listRef} tabIndex={0} data-lenis-prevent>
              {filtered.map((item, index) => (
                <button key={`${item.group}-${item.label}`} type="button" data-command-index={index} className={index === activeIndex ? 'is-active' : ''} onMouseEnter={() => setActiveIndex(index)} onClick={() => { onSelect(item); onClose(); }}>
                  <span>{item.icon}</span>
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.group}</small>
                  </div>
                  <ChevronRight size={14} />
                </button>
              ))}
              {filtered.length === 0 && <div className="cf-command-empty">No matching actions.</div>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ────────────────═══════════════════════ MAIN DASHBOARD COMPONENT ═══════════════════════ */
export default function DashboardView() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [recentActions, setRecentActions] = useState(['Opened Dashboard']);
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('commerce_preferences');
      return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  // Apply theme preference as a presentation layer only.
  useEffect(() => {
    const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
    const useLightTheme = preferences.theme === 'light' || (preferences.theme === 'system' && prefersLight);
    document.body.classList.toggle('dashboard-light-theme', useLightTheme);
    return () => {
      document.body.classList.remove('dashboard-light-theme');
    };
  }, [preferences.theme]);

  useEffect(() => {
    localStorage.setItem('commerce_preferences', JSON.stringify(preferences));
  }, [preferences]);

  const updatePreference = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const recordAction = (label) => {
    setRecentActions(prev => [label, ...prev.filter(item => item !== label)].slice(0, 5));
  };

  const navigateTab = (label) => {
    setActiveTab(label);
    recordAction(`Opened ${label}`);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const {
    products, customers, orders, isLoaded, dataError,
    importBusinessData, importMultiSheetData, addProduct, editProduct, deleteProduct,
    addCustomer, editCustomer, addOrder, updateOrderStatus, deleteOrder, refreshDatabase
  } = useCommerceDatabase();

  /* ── Derived metrics ── */
  const metrics = useMemo(() => {
    // Only sum delivered orders for revenue per prompt instructions
    const revenue = orders.filter(o => o.status === 'Delivered').reduce((s, o) => s + o.total, 0);
    return {
      revenue,
      orderCount: orders.length,
      productCount: products.length,
      customerCount: customers.length,
    };
  }, [products, orders, customers]);

  const lowStockProducts = useMemo(() => products.filter(p => p.stock > 0 && p.stock < 5), [products]);
  const topProducts = useMemo(() => [...products].sort((a, b) => b.salesCount - a.salesCount).slice(0, 5), [products]);
  const showAI = products.length >= 3 && orders.length >= 3;

  /* ── AI Insight generator for dashboard view ── */
  const aiInsights = useMemo(() => {
    if (!showAI) return [];
    const insights = [];
    
    // Out of Stock Alerts
    const outOfStock = products.filter(p => p.stock === 0);
    if (outOfStock.length > 0) {
      insights.push({ icon: <AlertTriangle size={14} />, text: `${outOfStock.length} product${outOfStock.length > 1 ? 's are' : ' is'} out of stock. Replenish immediately to resolve checkout failures.`, type: 'warn' });
    }

    // Low Stock Alerts
    const lowStock = products.filter(p => p.stock > 0 && p.stock < 5);
    if (lowStock.length > 0) {
      insights.push({ icon: <AlertTriangle size={14} />, text: `${lowStock.length} SKU${lowStock.length > 1 ? 's are' : ' is'} running low on inventory. Restocking recommendations prepared in Inventory tab.`, type: 'warn' });
    }

    // Top Product Analysis
    const topSeller = topProducts[0];
    if (topSeller && topSeller.salesCount > 0) {
      insights.push({ icon: <Star size={14} />, text: `"${topSeller.name}" is your highest velocity product, driving ${topSeller.salesCount} delivered sales.`, type: 'success' });
    }

    // Slow Moving SKU check
    const slowMoving = products.filter(p => (p.salesCount || 0) === 0 && p.stock > 10);
    if (slowMoving.length > 0) {
      insights.push({ icon: <Package size={14} />, text: `Liquidation alert: "${slowMoving[0].name}" has zero velocity with ${slowMoving[0].stock} units in stock. Consider promotions.`, type: 'info' });
    }

    // Customer demographic loyalty check
    const repeatBuyers = customers.filter(c => {
      const custOrders = orders.filter(o => o.customerId === c.id && o.status === 'Delivered');
      return custOrders.length > 1;
    });
    if (repeatBuyers.length > 0) {
      insights.push({ icon: <Users size={14} />, text: `VIP Cohort: ${repeatBuyers.length} customer${repeatBuyers.length > 1 ? 's have' : ' has'} completed multiple checkouts, boosting lifetime loyalty.`, type: 'success' });
    }

    const avgOrderValue = metrics.revenue / Math.max(1, orders.filter(o=>o.status==='Delivered').length);
    insights.push({ icon: <TrendingUp size={14} />, text: `Average ticket value stands at $${avgOrderValue.toFixed(2)} for delivered purchases.`, type: 'info' });
    return insights;
  }, [showAI, products, orders, customers, metrics, topProducts]);

  /* ── Sidebar items ── */
  const sidebarItems = [
    { label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'Products', icon: <ShoppingBag size={18} /> },
    { label: 'Orders', icon: <ClipboardList size={18} /> },
    { label: 'Inventory', icon: <Warehouse size={18} /> },
    { label: 'Customer Profiling', icon: <Users size={18} /> },
    { label: 'AI Insights', icon: <Sparkles size={18} /> },
    { label: 'Settings', icon: <Settings size={18} /> },
  ];

  const commandItems = [
    ...sidebarItems.map(item => ({ label: item.label, group: 'Navigate', icon: item.icon, action: () => navigateTab(item.label) })),
    { label: 'Smart Import', group: 'Action', icon: <Upload size={16} />, action: () => { setShowImportModal(true); recordAction('Opened Smart Import'); } },
    { label: 'Quick Add Product', group: 'Action', icon: <Plus size={16} />, action: () => { setShowAddModal(true); recordAction('Opened Quick Add Product'); } },
    { label: 'Theme Settings', group: 'Settings', icon: <Moon size={16} />, action: () => navigateTab('Settings') },
  ];

  return (
    <div className="container cf-dashboard-shell">
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        items={commandItems}
        onSelect={(item) => item.action()}
      />

      {/* ─── Sidebar ─── */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 92 : 280 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="cf-sidebar-wrap"
      >
        <div className="glass cf-sidebar">

          <div 
            className="cf-workspace-switcher" 
            style={{ 
              display: 'flex', 
              flexDirection: sidebarCollapsed ? 'column' : 'row',
              alignItems: 'center', 
              justifyContent: sidebarCollapsed ? 'center' : 'space-between', 
              gap: sidebarCollapsed ? '16px' : '12px',
              paddingBottom: sidebarCollapsed ? '16px' : '18px',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Logo + Text Group */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                minWidth: 0, 
                flex: sidebarCollapsed ? 'initial' : 1,
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                width: sidebarCollapsed ? 'auto' : '100%'
              }}
            >
              <img 
                src="/logo-full.png" 
                alt="Commerce Flow" 
                className="cf-switcher-logo" 
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  objectFit: 'contain', 
                  flexShrink: 0 
                }} 
              />
              {!sidebarCollapsed && (
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', margin: 0 }}>Commerce Flow</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Store Console</p>
                </div>
              )}
            </div>

            {/* Toggle Button */}
            <button 
              type="button" 
              className="cf-icon-button" 
              onClick={() => setSidebarCollapsed(prev => !prev)} 
              aria-label="Toggle sidebar"
              style={{ 
                flexShrink: 0,
                alignSelf: sidebarCollapsed ? 'center' : 'auto'
              }}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>

          <nav className="cf-sidebar-nav">
            {sidebarItems.map((item) => {
              const active = item.label === activeTab;
              return (
                <button key={item.label} onClick={() => navigateTab(item.label)} className={active ? 'is-active' : ''} title={sidebarCollapsed ? item.label : undefined}>
                  {active && (
                    <motion.div layoutId="sidebarIndicator" className="cf-sidebar-indicator" />
                  )}
                  {item.icon}
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>

          <div className="cf-sidebar-actions">
            {!sidebarCollapsed && (
              <div className="cf-recent-actions">
                <div><History size={13} /> Recent</div>
                {recentActions.slice(0, 3).map(action => <span key={action}>{action}</span>)}
              </div>
            )}
            <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.85rem', padding: sidebarCollapsed ? '10px' : undefined }} onClick={() => { setShowImportModal(true); recordAction('Opened Smart Import'); }}>
              <Upload size={14} /> {!sidebarCollapsed && 'Smart Import'}
            </button>
            <button className="btn btn-primary" style={{ width: '100%', fontSize: '0.85rem', padding: sidebarCollapsed ? '10px' : undefined }} onClick={() => { setShowAddModal(true); recordAction('Opened Quick Add Product'); }}>
              <Plus size={14} /> {!sidebarCollapsed && 'Quick Add Product'}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* ─── Main Panel ─── */}
      <main className="cf-main-panel">
        <motion.div className="cf-topbar" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <span className="cf-eyebrow">CommerceFlow Console</span>
            <h1>{activeTab}</h1>
          </div>
          <div className="cf-topbar-actions">
            <label className="cf-global-search">
              <Search size={16} />
              <input value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} placeholder="Search workspace" />
            </label>
            <button type="button" className="cf-command-button" onClick={() => setCommandOpen(true)}>
              <Command size={14} /> <span>⌘K</span>
            </button>
            <button type="button" className="cf-icon-button" aria-label="Notifications">
              <Bell size={16} />
            </button>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">

          {!isLoaded && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', minHeight: '420px', color: 'var(--text-muted)' }}>
              Loading CommerceFlow workspace...
            </motion.div>
          )}

          {isLoaded && dataError && (
            <motion.div key="data-error" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="glass" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '10px', color: '#d97706', background: 'rgba(217,119,6,0.06)' }}>
              <AlertTriangle size={16} /> {dataError}
            </motion.div>
          )}

          {/* ═══ DASHBOARD ═══ */}
          {isLoaded && activeTab === 'Dashboard' && (
            <motion.div key="dashboard" 
              initial={{ opacity: 0, x: 20, scale: 0.98 }} 
              animate={{ opacity: 1, x: 0, scale: 1 }} 
              exit={{ opacity: 0, x: -20, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 220, damping: 24 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* ─ Top Metrics ─ */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <MetricCard icon={<DollarSign size={16} style={{ color: 'var(--accent-green)' }} />} label="Revenue" value={`$${metrics.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} trend={orders.filter(o=>o.status==='Delivered').length > 0 ? 'From delivered orders' : null} trendUp />
                <MetricCard icon={<ClipboardList size={16} style={{ color: 'var(--accent-blue)' }} />} label="Orders" value={metrics.orderCount} trend={metrics.orderCount > 0 ? `${metrics.orderCount} total` : null} trendUp />
                <MetricCard icon={<ShoppingBag size={16} style={{ color: 'var(--accent-purple)' }} />} label="Products" value={metrics.productCount} trend={lowStockProducts.length > 0 ? `${lowStockProducts.length} low stock` : null} trendUp={false} />
                <MetricCard icon={<Users size={16} style={{ color: 'var(--accent-cyan)' }} />} label="Customers" value={metrics.customerCount} trend={metrics.customerCount > 0 ? 'Unique buyers' : null} trendUp />
              </div>

              {/* ─ Sales Chart ─ */}
              <SalesChart orders={orders.filter(o=>o.status==='Delivered')} />

              {/* ─ Two-column grid: Recent Orders + Sidebar widgets ─ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>

                {/* Recent Orders */}
                <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', maxHeight: '420px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Orders</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{orders.length} order{orders.length !== 1 ? 's' : ''} total</p>
                    </div>
                    <button onClick={() => navigateTab('Orders')} className="cf-icon-button"><ChevronRight size={16} /></button>
                  </div>
                  <div className="widget-scrollbar cf-scroll-area" data-lenis-prevent tabIndex={0} style={{ flexGrow: 1, border: '1px solid var(--border)', borderRadius: '8px', background: 'rgba(15,23,42,0.01)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                        <tr>
                          <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>Order</th>
                          <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>Customer</th>
                          <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>Total</th>
                          <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 10).map(o => {
                          const customerName = customers.find(c => c.id === o.customerId)?.name || 'Unknown';
                          return (
                            <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{o.id}</td>
                              <td style={{ padding: '10px 14px' }}>{customerName}</td>
                              <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>${Number(o.total || 0).toFixed(2)}</td>
                              <td style={{ padding: '10px 14px' }}><StatusBadge status={o.status} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right column: Low Stock + Product Performance */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                  {lowStockProducts.length > 0 && (
                    <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={16} style={{ color: '#d97706' }} />
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Low Stock Alerts</h3>
                      </div>
                      {lowStockProducts.slice(0, 4).map(p => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(15,23,42,0.01)' }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.sku}</div>
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: p.stock === 0 ? '#ef4444' : '#d97706' }}>
                            {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {topProducts.length > 0 && (
                    <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={16} style={{ color: 'var(--accent-purple)' }} />
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Top Products</h3>
                      </div>
                      {topProducts.map((p, i) => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(15,23,42,0.01)' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-purple)', width: '20px' }}>#{i + 1}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>${p.price.toFixed(2)}</div>
                          </div>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{p.salesCount} sold</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ─ AI Insights (conditional) ─ */}
              {showAI && aiInsights.length > 0 && (
                <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Brain size={18} style={{ color: 'var(--accent-purple)' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>AI Business Insights</h3>
                    <span style={{ fontSize: '0.6rem', padding: '2px 8px', borderRadius: '99px', background: 'var(--accent-purple-glow)', color: 'var(--accent-purple)', fontWeight: 600, marginLeft: '4px' }}>BETA</span>
                  </div>
                  {aiInsights.map((insight, idx) => {
                    const bgMap = { warn: 'rgba(217,119,6,0.06)', success: 'rgba(16,185,129,0.06)', info: 'rgba(37,99,235,0.06)' };
                    const borderMap = { warn: 'rgba(217,119,6,0.12)', success: 'rgba(16,185,129,0.12)', info: 'rgba(37,99,235,0.12)' };
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', borderRadius: '10px', background: bgMap[insight.type], border: `1px solid ${borderMap[insight.type]}` }}>
                        <span style={{ marginTop: '2px', flexShrink: 0 }}>{insight.icon}</span>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{insight.text}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ OTHER TABS (products, orders, etc.) ═══ */}
          {isLoaded && activeTab !== 'Dashboard' && (
            <motion.div key={activeTab} 
              initial={{ opacity: 0, x: 20, scale: 0.98 }} 
              animate={{ opacity: 1, x: 0, scale: 1 }} 
              exit={{ opacity: 0, x: -20, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 220, damping: 24 }}
              style={{ minHeight: '400px' }}>
              {activeTab === 'Products' && <ProductsTab products={products} addProduct={addProduct} editProduct={editProduct} deleteProduct={deleteProduct} />}
              {activeTab === 'Orders' && <OrdersTab orders={orders} customers={customers} products={products} addOrder={addOrder} updateOrderStatus={updateOrderStatus} deleteOrder={deleteOrder} orderSort={preferences.orderSort} />}
              {activeTab === 'Inventory' && <InventoryTab products={products} />}
              {activeTab === 'Customer Profiling' && <CustomersTab customers={customers} orders={orders} products={products} addCustomer={addCustomer} editCustomer={editCustomer} />}
              {activeTab === 'AI Insights' && <InsightsTab products={products} orders={orders} customers={customers} />}
              {activeTab === 'Settings' && (
                <EnterpriseSettings preferences={preferences} updatePreference={updatePreference} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ─── Add Product Modal ─── */}
      <AnimatePresence>
        {showAddModal && <AddProductModal onClose={() => setShowAddModal(false)} onAdd={addProduct} />}
        {showImportModal && (
          <SmartImportModal
            onClose={() => setShowImportModal(false)}
            onImportSuccess={() => refreshDatabase()}
            onImportRows={importBusinessData}
            onImportWorkbook={importMultiSheetData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
