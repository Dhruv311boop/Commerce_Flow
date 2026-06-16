import React, { useState, useMemo } from 'react';
import {
  Search, Plus, X, Users, Mail, Phone, MapPin, Calendar,
  ClipboardList, Wallet, ShoppingBag, Edit2, BarChart2,
  Award, Star, AlertTriangle, TrendingUp, Target, Crown,
  Zap, Globe, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildCustomerIntelligence } from '../../utils/customerIntelligence';
import { normalizeSku } from '../../utils/dataImportEngine';

/* ─── Cohort badge colours ──────────────────────────────────────────────── */
const COHORT_COLORS = {
  VIP:           { bg: 'rgba(79,70,229,0.12)',   color: '#4f46e5' },
  Loyal:         { bg: 'rgba(16,185,129,0.12)',  color: '#059669' },
  'Repeat Buyer':{ bg: 'rgba(6,182,212,0.12)',   color: '#0891b2' },
  New:           { bg: 'rgba(245,158,11,0.12)',  color: '#d97706' },
  'At-Risk':     { bg: 'rgba(239,68,68,0.12)',   color: '#dc2626' },
  Churned:       { bg: 'rgba(100,116,139,0.12)', color: '#475569' },
  'One-Time':    { bg: 'rgba(148,163,184,0.1)',  color: '#64748b' },
  Prospect:      { bg: 'rgba(148,163,184,0.1)',  color: '#94a3b8' },
};

function CohortBadge({ tag }) {
  const s = COHORT_COLORS[tag] || COHORT_COLORS.Prospect;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '99px', fontSize: '0.65rem', fontWeight: 700,
      background: s.bg, color: s.color, whiteSpace: 'nowrap'
    }}>{tag}</span>
  );
}

function GeoCard({ title, icon, rows, isEqual, isSmall, emptyMsg, valueKey = 'customers', formatVal }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3 style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
        {icon} {title}
      </h3>

      {isSmall && (
        <p style={{ fontSize: '0.75rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Info size={12} /> Limited dataset — rankings may not be statistically significant.
        </p>
      )}

      {isEqual && !isSmall ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
          Customer distribution is evenly spread across locations. No dominant geography detected.
        </p>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>{emptyMsg}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {rows.slice(0, 4).map((r, i) => {
            const val = formatVal ? formatVal(r) : r[valueKey];
            const max = formatVal ? formatVal(rows[0]) : rows[0][valueKey];
            const barPct = max > 0 ? Math.max(6, (val / max) * 100) : 6;
            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '3px' }}>
                  <span style={{ fontWeight: 600 }}>{r.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {r.revenue > 0 ? `$${r.revenue.toFixed(0)} rev · ` : ''}
                    {r.customers} customer{r.customers !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ width: '100%', height: '5px', background: 'rgba(15,23,42,0.05)', borderRadius: '99px' }}>
                  <div style={{ width: `${barPct}%`, height: '100%', background: 'linear-gradient(90deg,var(--accent-purple),var(--accent-blue))', borderRadius: '99px', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Main component ────────────────────────────────────────────────────── */
export default function CustomersTab({ customers, orders, products, addCustomer, editCustomer }) {
  const [search, setSearch]                 = useState('');
  const [showAddModal, setShowAddModal]     = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer]   = useState(null);

  const [form, setForm]         = useState({ name: '', email: '', phone: '', city: '', state: '', age: '' });
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', city: '', state: '', age: '' });

  /* ─── Customer intelligence (LTV, cohorts, geo, narratives) ─── */
  const intel = useMemo(() =>
    buildCustomerIntelligence(customers, orders, products),
    [customers, orders, products]
  );

  /* ─── Build an enriched lookup map for fast access ─── */
  const enrichedMap = useMemo(() => {
    const m = {};
    intel.enriched.forEach(c => { m[c.id] = c; });
    return m;
  }, [intel.enriched]);

  /* ─── Search & filter ─── */
  const filtered = useMemo(() => intel.enriched.filter(c => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.id?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.state?.toLowerCase().includes(q) ||
      String(c.age || '').includes(q)
    );
  }), [intel.enriched, search]);

  /* ─── Age cohort stats ─── */
  const ageCohorts = useMemo(() => {
    const total = customers.length || 1;
    const groups = { '<25': 0, '25-40': 0, '41-60': 0, '60+': 0 };
    customers.forEach(c => {
      const a = parseInt(c.age || '25', 10);
      if (a < 25) groups['<25']++;
      else if (a <= 40) groups['25-40']++;
      else if (a <= 60) groups['41-60']++;
      else groups['60+']++;
    });
    return [
      { label: 'Gen Z (<25)',         count: groups['<25'],   pct: ((groups['<25']   / total) * 100).toFixed(0) },
      { label: 'Millennials (25–40)', count: groups['25-40'], pct: ((groups['25-40'] / total) * 100).toFixed(0) },
      { label: 'Gen X (41–60)',       count: groups['41-60'], pct: ((groups['41-60'] / total) * 100).toFixed(0) },
      { label: 'Seniors (60+)',       count: groups['60+'],   pct: ((groups['60+']   / total) * 100).toFixed(0) },
    ];
  }, [customers]);

  /* ─── Selected customer detail ─── */
  const selectedEnriched = selectedCustomer ? enrichedMap[selectedCustomer.id] : null;

  /* ─── Handlers ─── */
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.city || !form.state || !form.age) return;
    addCustomer({ name: form.name, email: form.email, phone: form.phone || 'N/A', city: form.city, state: form.state, age: parseInt(form.age || '25', 10) });
    setForm({ name: '', email: '', phone: '', city: '', state: '', age: '' });
    setShowAddModal(false);
  };

  const handleEditClick = (c) => {
    setEditingCustomer(c);
    setEditForm({ name: c.name || '', email: c.email || '', phone: c.phone || '', city: c.city || '', state: c.state || '', age: c.age || '' });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingCustomer) return;
    const payload = { name: editForm.name, email: editForm.email, phone: editForm.phone, city: editForm.city, state: editForm.state, age: parseInt(editForm.age || '25', 10) };
    editCustomer(editingCustomer.id, payload);
    if (selectedCustomer?.id === editingCustomer.id) setSelectedCustomer(prev => ({ ...prev, ...payload }));
    setEditingCustomer(null);
  };

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-input)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' };
  const labelStyle = { fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', display: 'block' };

  const { geography, cohortGroups, rankings, narratives, hasRepeatData, vipRevenuePct } = intel;

  /* ─────────────────────────── RENDER ─────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Customer Profiling</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, state, age…"
              style={{ padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid var(--border-input)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }} />
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <Plus size={14} /> Register Customer
          </button>
        </div>
      </div>

      {/* ── AI Narrative Insights ── */}
      {narratives.length > 0 && (
        <div className="glass" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-purple)', marginBottom: '4px' }}>
            <Zap size={14} /> AI Customer Intelligence
          </h3>
          {narratives.map((n, i) => (
            <div key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: 'var(--accent-purple)', marginTop: '1px', flexShrink: 0 }}>•</span> {n}
            </div>
          ))}
        </div>
      )}

      {/* ── KPI Rankings (only when data quality allows) ── */}
      {hasRepeatData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          {[
            { label: 'Highest Revenue', icon: <Crown size={14} style={{ color: '#d97706' }} />, customer: rankings.topRevenue, val: rankings.topRevenue ? `$${rankings.topRevenue.ltv.toFixed(2)} LTV` : '—' },
            { label: 'Highest Repeat Buyer', icon: <TrendingUp size={14} style={{ color: 'var(--accent-green)' }} />, customer: rankings.topRepeat, val: rankings.topRepeat ? `${rankings.topRepeat.deliveredCount} orders` : '—' },
            { label: 'Best AOV', icon: <Target size={14} style={{ color: 'var(--accent-blue)' }} />, customer: rankings.topAov, val: rankings.topAov ? `$${rankings.topAov.aov.toFixed(2)} avg` : '—' },
            { label: 'Most Loyal', icon: <Star size={14} style={{ color: 'var(--accent-purple)' }} />, customer: rankings.topLoyal, val: rankings.topLoyal?.favCategory ? `Loves ${rankings.topLoyal.favCategory}` : '—' },
          ].map(({ label, icon, customer, val }) => (
            <motion.div whileHover={{ y: -4, scale: 1.02 }} key={label} className="glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                {icon} {label}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{customer?.name || '—'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{val}</div>
            </motion.div>
          ))}
        </div>
      )}

      {!hasRepeatData && customers.length > 0 && (
        <div style={{ padding: '14px 18px', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.05)', fontSize: '0.82rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={14} /> Insufficient repeat purchase history. Additional orders are required for loyalty and retention analysis.
        </div>
      )}

      {/* ── Cohort Counts ── */}
      {customers.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          {[
            { label: 'VIP',          count: cohortGroups.vip.length,         icon: <Award size={13} />,         color: '#4f46e5' },
            { label: 'Loyal',        count: cohortGroups.loyal.length,        icon: <Star size={13} />,          color: '#059669' },
            { label: 'Repeat Buyer', count: cohortGroups.repeatBuyer.length,  icon: <TrendingUp size={13} />,    color: '#0891b2' },
            { label: 'At-Risk',      count: cohortGroups.atRisk.length,       icon: <AlertTriangle size={13} />, color: '#dc2626' },
            { label: 'Churned',      count: cohortGroups.churned.length,      icon: <X size={13} />,             color: '#475569' },
            { label: 'New',          count: cohortGroups.newCustomer.length,  icon: <Plus size={13} />,          color: '#d97706' },
          ].map(({ label, count, icon, color }) => (
            <motion.div whileHover={{ y: -4, scale: 1.03 }} key={label} className="glass" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '0.65rem', color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', textTransform: 'uppercase' }}>
                {icon} {label}
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{count}</div>
              {label === 'VIP' && count > 0 && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{vipRevenuePct}% of revenue</div>}
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Demographic + Geographic cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Age Cohorts */}
        <motion.div whileHover={{ y: -4 }} className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} style={{ color: 'var(--accent-purple)' }} /> Age Demographics
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ageCohorts.map((cohort, idx) => (
              <div key={idx} style={{ fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{cohort.label}</span>
                  <span style={{ fontWeight: 600 }}>{cohort.count} ({cohort.pct}%)</span>
                </div>
                <div style={{ width: '100%', height: '5px', background: 'rgba(15,23,42,0.04)', borderRadius: '99px' }}>
                  <div style={{ width: `${Math.max(2, cohort.pct)}%`, height: '100%', background: 'linear-gradient(90deg,var(--accent-purple),var(--accent-blue))', borderRadius: '99px' }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Revenue by State */}
        <GeoCard
          title="Revenue by State"
          icon={<BarChart2 size={16} style={{ color: 'var(--accent-green)' }} />}
          rows={geography.statesByRevenue}
          isEqual={geography.statesEqual}
          isSmall={geography.isSmallDataset}
          emptyMsg="No state data loaded."
          valueKey="revenue"
          formatVal={r => r.revenue}
        />

        {/* Revenue by City */}
        <GeoCard
          title="Revenue by City"
          icon={<MapPin size={16} style={{ color: 'var(--accent-cyan)' }} />}
          rows={geography.citiesByRevenue}
          isEqual={geography.citiesEqual}
          isSmall={geography.isSmallDataset}
          emptyMsg="No city data loaded."
          valueKey="revenue"
          formatVal={r => r.revenue}
        />

        {/* AOV by State */}
        <motion.div whileHover={{ y: -4 }} className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={16} style={{ color: 'var(--accent-purple)' }} /> Avg Order Value by State
          </h3>
          {geography.isSmallDataset && (
            <p style={{ fontSize: '0.75rem', color: '#d97706' }}><Info size={11} /> Limited dataset — results may not be significant.</p>
          )}
          {geography.statesByRevenue.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>No data yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {[...geography.statesByRevenue].sort((a,b) => b.aov - a.aov).slice(0,4).map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem' }}>
                  <span style={{ fontWeight: 600 }}>{r.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {r.aov > 0 ? `$${r.aov.toFixed(2)} AOV` : 'No orders yet'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Customers table ── */}
      <div className="glass widget-scrollbar cf-scroll-both" data-lenis-prevent tabIndex={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr>
              {['ID','Name','Email','City','State','Age','Orders','LTV','Cohorts',''].map(h => (
                <th key={h} style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', textAlign: h === '' ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map(c => (
                <motion.tr 
                  key={c.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  onClick={() => setSelectedCustomer(c)} 
                  style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}
                >
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{c.id}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: '12px 16px' }}>{c.email}</td>
                  <td style={{ padding: '12px 16px' }}>{c.city || 'N/A'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{c.state || 'N/A'}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{(c.age && c.age !== 'Unknown') ? c.age : '—'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{c.totalOrderCount ?? c.totalPurchases ?? 0}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)', fontWeight: 700 }}>
                    ${(c.ltv || 0).toFixed(0)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {(c.cohorts || []).slice(0,2).map(t => <CohortBadge key={t} tag={t} />)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--accent-purple)', fontWeight: 600 }}>Profile ➔</td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <tr><td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No customer profiles found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ══════════════════ REGISTER CUSTOMER MODAL ══════════════════ */}
      <AnimatePresence>
        {showAddModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0 }} onClick={() => setShowAddModal(false)} />
            <motion.form 
              initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onSubmit={handleAddSubmit} className="glass"
              style={{ position: 'relative', width: '100%', maxWidth: '440px', height: '100%', padding: '32px', display: 'flex', flexDirection: 'column', gap: '18px', borderLeft: '1px solid var(--border)', boxShadow: '-20px 0 60px rgba(0,0,0,0.3)', background: 'var(--bg-modal)', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={16} style={{ color: 'var(--accent-purple)' }} /> Register Customer Profile
                </h3>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div><label style={labelStyle}>Full Name *</label><input style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Dhruv Chaudhary" required /></div>
              <div><label style={labelStyle}>Email Address *</label><input style={inputStyle} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="dhruv@example.com" required /></div>
              <div className="cf-form-grid-split" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                <div><label style={labelStyle}>Phone Number</label><input style={inputStyle} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="555-0199" /></div>
                <div><label style={labelStyle}>Age *</label><input style={inputStyle} type="number" min="1" max="120" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))} placeholder="25" required /></div>
              </div>
              <div className="cf-form-grid-split" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                <div><label style={labelStyle}>City *</label><input style={inputStyle} value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="e.g. Mumbai" required /></div>
                <div><label style={labelStyle}>State *</label><input style={inputStyle} value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} placeholder="e.g. MH" required /></div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'auto', padding: '14px' }}>Create Profile</button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════ CUSTOMER DETAIL DRAWER ══════════════════ */}
      <AnimatePresence>
        {selectedCustomer && selectedEnriched && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 998, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0 }} onClick={() => setSelectedCustomer(null)} />
            <motion.div 
              initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="glass" data-lenis-prevent
              style={{ position: 'relative', width: '100%', maxWidth: '500px', height: '100%', padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: '1px solid var(--border)', boxShadow: '-20px 0 60px rgba(0,0,0,0.3)', overflowY: 'auto', background: 'var(--bg-modal)' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--accent-purple-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={20} style={{ color: 'var(--accent-purple)' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedCustomer.name}</h3>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {(selectedEnriched.cohorts || []).map(t => <CohortBadge key={t} tag={t} />)}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              {/* Contact info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><Mail size={14} style={{ color: 'var(--text-muted)' }} /><span>{selectedCustomer.email}</span></div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><Phone size={14} style={{ color: 'var(--text-muted)' }} /><span>{selectedCustomer.phone}</span></div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><MapPin size={14} style={{ color: 'var(--text-muted)' }} /><span>{selectedCustomer.city}, {selectedCustomer.state} · Age {(selectedCustomer.age && selectedCustomer.age !== 'Unknown') ? selectedCustomer.age : '—'}</span></div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><Calendar size={14} style={{ color: 'var(--text-muted)' }} /><span style={{ color: 'var(--text-muted)' }}>Joined {new Date(selectedCustomer.regDate || Date.now()).toLocaleDateString()}</span></div>
              </div>

              {/* Financial KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Lifetime Value',    val: `$${selectedEnriched.ltv.toFixed(2)}`,      color: 'var(--accent-green)' },
                  { label: 'Avg Order Value',   val: `$${selectedEnriched.aov.toFixed(2)}`,      color: 'var(--accent-blue)' },
                  { label: 'Total Orders',      val: selectedEnriched.totalOrderCount ?? selectedEnriched.totalPurchases ?? 0, color: 'var(--accent-purple)' },
                  { label: 'Revenue Share',     val: `${selectedEnriched.revenueContribution.toFixed(1)}%`, color: '#d97706' },
                ].map(({ label, val, color }) => (
                  <motion.div whileHover={{ y: -4, scale: 1.02 }} key={label} className="glass" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>{val}</span>
                  </motion.div>
                ))}
              </div>

              {/* Purchase behaviour */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem' }}>
                <div style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Fav Category</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{selectedEnriched.favCategory || '—'}</div>
                </div>
                <div style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Fav Product</div>
                  <div style={{ fontWeight: 600, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedEnriched.favProduct || '—'}</div>
                </div>
                <div style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>First Purchase</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{selectedEnriched.firstPurchase || '—'}</div>
                </div>
                <div style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Last Purchase</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{selectedEnriched.lastPurchase || '—'}</div>
                </div>
              </div>

              {/* Edit button */}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleEditClick(selectedCustomer)} className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Edit2 size={12} /> Edit Customer Profile
              </motion.button>

              {/* Purchase Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ClipboardList size={14} style={{ color: 'var(--accent-purple)' }} /> Purchase Timeline ({selectedEnriched.totalOrderCount})
                </h4>
                <div className="cf-scroll-area" data-lenis-prevent style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px' }}>
                  {(selectedEnriched.totalOrderCount === 0) && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '16px' }}>No purchases yet.</p>
                  )}
                  {orders.filter(o => o.customerId === selectedCustomer.id).map((o, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{o.id}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{o.date}</div>
                        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {(o.items || []).map((item, ii) => {
                            const prod = products.find(p =>
                              p.id === item.productId ||
                              p.sku === item.sku ||
                              normalizeSku(p.sku) === normalizeSku(item.sku)
                            );
                            const label = prod?.name || item.productName || item.product_name || (Number(item.lineRevenue || 0) > 0 ? 'Order total' : 'Item');
                            return <span key={ii} style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>{item.qty || item.quantity || 1}× {label}</span>;
                          })}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>${Number(o.total).toFixed(2)}</span>
                        <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600,
                          background: o.status === 'Delivered' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                          color: o.status === 'Delivered' ? 'var(--accent-green)' : '#f59e0b' }}>{o.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════ EDIT CUSTOMER MODAL ══════════════════ */}
      <AnimatePresence>
        {editingCustomer && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0 }} onClick={() => setEditingCustomer(null)} />
            <motion.form 
              initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onSubmit={handleEditSubmit} className="glass"
              style={{ position: 'relative', width: '100%', maxWidth: '440px', height: '100%', padding: '32px', display: 'flex', flexDirection: 'column', gap: '18px', borderLeft: '1px solid var(--border)', boxShadow: '-20px 0 60px rgba(0,0,0,0.3)', background: 'var(--bg-modal)', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit2 size={16} style={{ color: 'var(--accent-blue)' }} /> Edit Customer Profile
                </h3>
                <button type="button" onClick={() => setEditingCustomer(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div><label style={labelStyle}>Full Name *</label><input style={inputStyle} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div><label style={labelStyle}>Email Address *</label><input style={inputStyle} type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} required /></div>
              <div className="cf-form-grid-split" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} /></div>
                <div><label style={labelStyle}>Age *</label><input style={inputStyle} type="number" min="1" max="120" value={editForm.age} onChange={e => setEditForm(p => ({ ...p, age: e.target.value }))} required /></div>
              </div>
              <div className="cf-form-grid-split" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                <div><label style={labelStyle}>City *</label><input style={inputStyle} value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} required /></div>
                <div><label style={labelStyle}>State *</label><input style={inputStyle} value={editForm.state} onChange={e => setEditForm(p => ({ ...p, state: e.target.value }))} required /></div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'auto', padding: '14px' }}>Save Changes</button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
