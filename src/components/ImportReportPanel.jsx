import { CheckCircle2, AlertTriangle, Sparkles, Link2, Database } from 'lucide-react';

export default function ImportReportPanel({ report, warnings = [] }) {
  if (!report) return null;

  const productStats = report.productImportStats;
  const items = [
    { label: 'Products imported', value: productStats?.importedProductCount ?? report.successes?.products ?? 0 },
    { label: 'Customers', value: report.successes?.customers ?? 0 },
    { label: 'Orders', value: report.successes?.orders ?? 0 },
    { label: 'Rows processed', value: report.successes?.totalRows ?? 0 },
  ];

  const productAuditItems = productStats ? [
    { label: 'Uploaded products', value: productStats.uploadedProductCount ?? 0 },
    { label: 'Duplicates skipped', value: productStats.duplicateCount ?? 0 },
    { label: 'Rejected (non-product rows)', value: productStats.rejectedCount ?? 0 },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(15,23,42,0.02)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CheckCircle2 size={16} style={{ color: 'var(--accent-green)' }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Import Report</span>
        {report.mappingProvider && (
          <span style={{ fontSize: '0.72rem', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} /> {report.mappingProvider}
          </span>
        )}
      </div>

      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{report.summary}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
        {items.map(item => (
          <div key={item.label} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {productAuditItems.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
          {productAuditItems.map(item => (
            <div key={item.label} style={{ padding: '10px', borderRadius: '8px', border: '1px dashed var(--border)', background: 'rgba(79,70,229,0.04)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {report.relationshipResolution && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Link2 size={13} />
          SKU matches: {report.relationshipResolution.matchedSkus}/{report.relationshipResolution.totalOrderSkus}
          {report.relationshipResolution.unmatchedSkus > 0 && (
            <span style={{ color: '#d97706' }}> · {report.relationshipResolution.unmatchedSkus} unresolved (warning only)</span>
          )}
        </div>
      )}

      {report.newFieldsCreated?.length > 0 && (
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Database size={12} /> New fields created ({report.newFieldsCreated.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {report.newFieldsCreated.slice(0, 12).map(field => (
              <span key={`${field.entity}-${field.fieldKey}`} style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '999px', background: 'rgba(79,70,229,0.08)', color: 'var(--text-primary)' }}>
                {field.entity}.{field.fieldKey}
              </span>
            ))}
          </div>
        </div>
      )}

      {report.importPreview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
          {[
            ['Products to create', report.importPreview.productsToCreate],
            ['Customers to create', report.importPreview.customersToCreate],
            ['Orders to create', report.importPreview.ordersToCreate],
            ['New fields', report.importPreview.newFields],
            ['Mapping warnings', report.importPreview.warnings],
            ['Mapping errors', report.importPreview.errors],
          ].map(([label, value]) => (
            <div key={label} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{value ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      {report.mappingAuditLog?.length > 0 && (
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Mapping Audit ({report.mappingAuditLog.length})
          </div>
          <div className="cf-scroll-both" data-lenis-prevent style={{ maxHeight: '180px', border: '1px solid var(--border)', borderRadius: '8px' }}>
            {report.mappingAuditLog.slice(0, 25).map((item, index) => (
              <div key={`${item.uploadedColumn}-${index}`} style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{item.uploadedColumn} → {item.selectedLabel || item.selectedMapping || 'Unmapped'}</span>
                  <span style={{ color: item.validationStatus === 'rejected' ? '#dc2626' : item.validationStatus === 'review_required' ? '#d97706' : 'var(--accent-green)', fontWeight: 700 }}>
                    {item.confidenceScore}% · {item.validationStatus}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                  {item.detectedType} · {item.mappingSource}{item.validationMessage ? ` · ${item.validationMessage}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.mappingDecisions?.length > 0 && (
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Mappings ({report.confidence}% avg confidence)</div>
          <div className="cf-scroll-both" data-lenis-prevent style={{ maxHeight: '160px', border: '1px solid var(--border)', borderRadius: '8px' }}>
            {report.mappingDecisions.slice(0, 30).map(item => (
              <div key={`${item.dataset}-${item.sourceColumn}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '6px 10px', borderBottom: '1px solid var(--border)', fontSize: '0.75rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{item.sourceColumn} → {item.label || item.targetField}</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{item.confidence}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(warnings.length > 0 || report.warnings?.length > 0) && (
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={12} /> Warnings ({(warnings.length || report.warnings?.length || 0)})
          </div>
          <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {(warnings.length ? warnings : report.warnings).slice(0, 15).map((warning, index) => (
              <div key={index} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '6px 8px', borderRadius: '6px', background: 'rgba(234,179,8,0.06)' }}>
                {warning.message || warning}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
