import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import {
  suggestFieldMapping,
  analyzeMappings,
  validateMappings,
  getAutoMappings,
  getLowConfidenceMappings,
} from '../utils/aiMappingService';

/**
 * Fast AI Data Mapping Assistant
 * Auto-maps high-confidence columns, confirms medium-confidence, skips low-confidence
 */
export default function AIMappingAssistant({
  columns = [],
  onMappingsComplete = () => {},
  entityType = 'products',
}) {
  const [mappings, setMappings] = useState([]);
  const [autoMapped, setAutoMapped] = useState([]);
  const [needsConfirmation, setNeedsConfirmation] = useState([]);
  const [confirmed, setConfirmed] = useState(new Set());
  const [validation, setValidation] = useState(null);
  const [step, setStep] = useState('analyzing');

  useEffect(() => {
    if (columns.length === 0) return;

    const analyzed = analyzeMappings(columns);
    setMappings(analyzed);

    const auto = getAutoMappings(analyzed, 85);
    const lowConf = getLowConfidenceMappings(analyzed, 85);

    setAutoMapped(auto);
    setNeedsConfirmation(lowConf);

    const val = validateMappings(analyzed, entityType);
    setValidation(val);

    setStep(lowConf.length === 0 ? 'complete' : 'confirm');
  }, [columns, entityType]);

  const handleConfirm = (sourceColumn, field) => {
    const updated = mappings.map(m =>
      m.sourceColumn === sourceColumn
        ? { ...m, suggestedField: field, userConfirmed: true }
        : m
    );
    setMappings(updated);
    setConfirmed(prev => new Set([...prev, sourceColumn]));
    const val = validateMappings(updated, entityType);
    setValidation(val);
    if (confirmed.size + 1 >= needsConfirmation.length) setStep('complete');
  };

  const handleSkip = (sourceColumn) => {
    const updated = mappings.map(m =>
      m.sourceColumn === sourceColumn
        ? { ...m, suggestedField: null, userConfirmed: true }
        : m
    );
    setMappings(updated);
    setConfirmed(prev => new Set([...prev, sourceColumn]));
  };

  const handleSubmit = () => {
    const final = mappings.filter(m => m.suggestedField);
    onMappingsComplete?.(final);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '20px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(79,70,229,0.08), rgba(139,92,246,0.08))',
        border: '1px solid rgba(79,70,229,0.2)',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Zap size={20} style={{ color: '#4f46e5' }} />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>AI Column Mapping</h3>
      </div>

      {step === 'analyzing' && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>🧠 Analyzing {columns.length} column(s)...</p>
      )}

      {autoMapped.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <CheckCircle2 size={16} style={{ color: '#10b981' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>Auto-Mapped ({autoMapped.length})</span>
          </div>
          {autoMapped.map(m => (
            <div key={m.sourceColumn} style={{ padding: '8px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '4px' }}>
              <strong>{m.sourceColumn}</strong> → {m.suggestedField} ({m.confidence}%)
            </div>
          ))}
        </div>
      )}

      {step === 'confirm' && needsConfirmation.length > 0 && (
        <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={16} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f59e0b' }}>Confirm ({confirmed.size}/{needsConfirmation.length})</span>
          </div>
          {needsConfirmation.map(m => !confirmed.has(m.sourceColumn) && (
            <div key={m.sourceColumn} style={{ padding: '12px', background: 'var(--bg-secondary)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '8px' }}>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontWeight: 600, marginBottom: '2px' }}>{m.sourceColumn}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.reason}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => handleConfirm(m.sourceColumn, m.suggestedField)} style={{ flex: 1, padding: '6px', background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.3)', borderRadius: '6px', color: '#4f46e5', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>✓ Confirm</button>
                <button onClick={() => handleSkip(m.sourceColumn)} style={{ padding: '6px 12px', background: 'rgba(107,114,128,0.15)', border: '1px solid rgba(107,114,128,0.3)', borderRadius: '6px', color: '#6b7280', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>✕ Skip</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 'complete' && (
        <div>
          <div style={{ padding: '12px', background: validation?.isValid ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${validation?.isValid ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '8px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              {validation?.isValid ? <CheckCircle2 size={16} style={{ color: '#10b981' }} /> : <AlertCircle size={16} style={{ color: '#ef4444' }} />}
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{validation?.isValid ? '✓ Ready' : '⚠ Missing Fields'}</span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Coverage: {Math.round(validation?.coverage || 0)}%</p>
          </div>
          {validation?.isValid && (
            <button onClick={handleSubmit} style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              ✓ Proceed with Import
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
