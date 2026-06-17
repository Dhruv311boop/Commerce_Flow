import { useMemo, useState } from 'react';
import { Table2, Search, Sparkles, Database } from 'lucide-react';
import { buildRawWorkbookProfile } from '../utils/intelligentImportMapper';

export default function RawDataExplorer({ datasets = {}, mappingMeta = {}, className = '' }) {
  const profile = useMemo(() => buildRawWorkbookProfile(datasets), [datasets]);
  const [activeSheet, setActiveSheet] = useState(profile.sheetNames[0] || '');
  const [search, setSearch] = useState('');

  const sheet = profile.sheets.find(item => item.name === activeSheet) || profile.sheets[0];
  const filteredRows = useMemo(() => {
    if (!sheet) return [];
    const q = search.trim().toLowerCase();
    if (!q) return sheet.rows;
    return sheet.rows.filter(row => Object.values(row).some(value => String(value).toLowerCase().includes(q)));
  }, [sheet, search]);

  if (!profile.sheets.length) return null;

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border-input)',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
  };

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={16} style={{ color: 'var(--accent-purple)' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Complete Dataset Explorer
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {profile.totalRows} rows · {profile.totalColumns} columns · {profile.sheets.length} sheet(s)
          </span>
        </div>
        {mappingMeta?.provider && (
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} /> AI mapping: {mappingMeta.provider}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {profile.sheets.map(item => (
          <button
            key={item.name}
            type="button"
            onClick={() => setActiveSheet(item.name)}
            style={{
              padding: '8px 12px',
              borderRadius: '999px',
              border: `1px solid ${activeSheet === item.name ? 'var(--accent-purple)' : 'var(--border)'}`,
              background: activeSheet === item.name ? 'rgba(79,70,229,0.08)' : 'transparent',
              color: 'var(--text-primary)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Table2 size={12} />
            {item.name}
            <span style={{ color: 'var(--text-muted)' }}>({item.rowCount})</span>
          </button>
        ))}
      </div>

      {sheet && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
            {sheet.columnProfiles.map(col => (
              <div key={col.column} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(15,23,42,0.02)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{col.column}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {col.fillRate}% filled · samples: {col.sampleValues.join(', ') || 'None'}
                </div>
              </div>
            ))}
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              style={{ ...inputStyle, paddingLeft: '34px' }}
              placeholder="Search all values in this sheet..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="cf-scroll-both" data-lenis-prevent style={{ borderRadius: '10px', border: '1px solid var(--border)', maxHeight: '420px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ background: 'rgba(15,23,42,0.04)', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>#</th>
                  {sheet.columns.map(column => (
                    <th key={column} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '7px 10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{index + 1}</td>
                    {sheet.columns.map(column => (
                      <td key={column} style={{ padding: '7px 10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {String(row[column] ?? 'None')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
