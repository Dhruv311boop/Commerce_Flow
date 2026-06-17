import { useState } from 'react';
import { Search, Plus, Trash2, X, AlertTriangle, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { normalizeImportText, normalizeNameKey, normalizeSku } from '../../utils/dataImportEngine';

export default function OrdersTab({ orders = [], customers = [], products = [], addOrder, updateOrderStatus, deleteOrder, orderSort = 'date_desc' }) {
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  // New Order Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedItems, setSelectedItems] = useState([{ productId: '', qty: 1 }]);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleSelectOrder = (id) => {
    setSelectedOrderIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filtered.length && filtered.length > 0) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filtered.map(o => o.id));
    }
  };

  const handleBulkStatusUpdate = (newStatus) => {
    if (typeof updateOrderStatus === 'function') {
      selectedOrderIds.forEach(id => {
        updateOrderStatus(id, newStatus);
      });
    }
    setSelectedOrderIds([]);
  };

  const handleBulkDelete = () => {
    if (typeof deleteOrder === 'function') {
      selectedOrderIds.forEach(id => {
        deleteOrder(id);
      });
    }
    setSelectedOrderIds([]);
  };

  const getProgressSteps = (status) => {
    const steps = [
      { name: 'Pending', color: '#f59e0b' },
      { name: 'Processing', color: '#3b82f6' },
      { name: 'Shipped', color: '#06b6d4' },
      { name: 'Delivered', color: '#10b981' }
    ];
    
    if (status === 'Cancelled') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '0.7rem', fontWeight: 600, marginTop: '2px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
          Cancelled
        </div>
      );
    }
    
    const currentIndex = steps.findIndex(s => s.name === status);
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100px', marginTop: '2px' }}>
        <div style={{ display: 'flex', gap: '2px', width: '100%' }}>
          {steps.map((step, idx) => {
            const isActive = idx <= currentIndex;
            const activeColor = steps[currentIndex]?.color || '#cbd5e1';
            return (
              <div 
                key={idx}
                title={step.name}
                style={{
                  flex: 1,
                  height: '3px',
                  borderRadius: '1.5px',
                  background: isActive ? activeColor : 'rgba(15,23,42,0.06)',
                  transition: 'background-color 0.2s ease'
                }}
              />
            );
          })}
        </div>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: steps[currentIndex]?.color || 'var(--text-muted)' }}>
          {status}
        </span>
      </div>
    );
  };

  // Robust search filters
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const productIndexes = safeProducts.reduce((indexes, product) => {
    const id = normalizeImportText(product.id);
    const sku = normalizeSku(product.sku);
    const name = normalizeNameKey(product.name || product.product_name);
    if (id) indexes.byId.set(id, product);
    if (sku) indexes.bySku.set(sku, product);
    if (name) indexes.byName.set(name, product);
    return indexes;
  }, { byId: new Map(), bySku: new Map(), byName: new Map() });

  const resolveOrderItemProduct = (item = {}) => {
    const sku = normalizeSku(item.sku || item.productSku || item.product_sku);
    const productId = normalizeImportText(item.productId || item.product_id || item.productID);
    const productName = normalizeImportText(item.productName || item.product_name || item.product);
    const product = (sku && productIndexes.bySku.get(sku)) ||
      (productId && productIndexes.byId.get(productId)) ||
      (productId && productIndexes.bySku.get(normalizeSku(productId))) ||
      (productName && productIndexes.byName.get(normalizeNameKey(productName))) ||
      null;

    return {
      product,
      displayName: product?.name || product?.product_name || productName,
      sku: sku || normalizeSku(productId),
    };
  };

  const sortedOrders = [...safeOrders].sort((a, b) => {
    if (orderSort === 'status') {
      return String(a.status || '').localeCompare(String(b.status || ''));
    }

    const aTime = new Date(a.date || 0).getTime();
    const bTime = new Date(b.date || 0).getTime();
    return orderSort === 'date_asc' ? aTime - bTime : bTime - aTime;
  });

  const filtered = sortedOrders.filter(o => {
    const custName = (safeCustomers.find(c => c.id === o.customerId)?.name || o.customer || '').toLowerCase();
    const orderId = String(o.id || '').toLowerCase();
    return orderId.includes(search.toLowerCase()) || custName.includes(search.toLowerCase());
  });

  const pendingOrders = safeOrders.filter(o => o.status === 'Pending');

  // Auto-calculate order price totals
  const currentTotal = selectedItems.reduce((acc, item) => {
    const prod = safeProducts.find(p => p.id === item.productId);
    if (!prod) return acc;
    return acc + (prod.price * item.qty);
  }, 0);

  const handleAddItemRow = () => {
    setSelectedItems(prev => [...prev, { productId: '', qty: 1 }]);
  };

  const handleRemoveItemRow = (idx) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, value) => {
    setSelectedItems(prev => prev.map((item, i) => {
      if (i === idx) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setErrorMsg('Please select a customer.');
      return;
    }
    
    // Filter empty items
    const validItems = selectedItems.filter(item => item.productId && item.qty > 0);
    if (validItems.length === 0) {
      setErrorMsg('Please add at least one valid product.');
      return;
    }

    // Verify stock availability
    for (const item of validItems) {
      const prod = safeProducts.find(p => p.id === item.productId);
      if (!prod) continue;
      if (prod.stock < item.qty) {
        setErrorMsg(`Insufficient stock for "${prod.name}" (${prod.stock} available).`);
        return;
      }
    }

    // Book order
    if (typeof addOrder !== 'function') {
      setErrorMsg('Order creation is temporarily unavailable.');
      return;
    }

    addOrder({
      customerId: selectedCustomerId,
      items: validItems.map(item => ({ productId: item.productId, qty: parseInt(item.qty, 10) })),
      total: currentTotal
    });

    // Reset Form
    setSelectedCustomerId('');
    setSelectedItems([{ productId: '', qty: 1 }]);
    setErrorMsg('');
    setShowCreateModal(false);
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '1px solid var(--border-input)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none',
  };
  const labelStyle = { fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', display: 'block' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Orders</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Reliable order workspace with loading-safe empty states and validated order creation.
              </p>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search orders..." 
              style={{ padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid var(--border-input)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }} 
            />
          </div>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <Plus size={14} /> Create Order
          </button>
        </div>
      </div>

      {/* SUGGESTED ACTIONS BANNER */}
      {pendingOrders.length > 0 && (
        <div className="glass" style={{ padding: '16px 20px', borderRadius: '12px', borderLeft: '4px solid var(--accent-purple)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(79,70,229,0.01)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(79,70,229,0.08)', padding: '8px', borderRadius: '8px', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={18} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Suggested Action: Process Pending Orders</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                You have <strong>{pendingOrders.length}</strong> pending order{pendingOrders.length > 1 ? 's' : ''} awaiting fulfillment. Speed up delivery by updating their status.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => {
                pendingOrders.forEach(o => typeof updateOrderStatus === 'function' && updateOrderStatus(o.id, 'Processing'));
                setSelectedOrderIds([]);
              }}
              style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(15,23,42,0.03)', border: '1px solid var(--border-input)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '6px' }}
            >
              Mark Processing
            </button>
            <button 
              onClick={() => {
                pendingOrders.forEach(o => typeof updateOrderStatus === 'function' && updateOrderStatus(o.id, 'Shipped'));
                setSelectedOrderIds([]);
              }}
              style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: '#0891b2', cursor: 'pointer', borderRadius: '6px' }}
            >
              Mark Shipped
            </button>
            <button 
              onClick={() => {
                pendingOrders.forEach(o => typeof updateOrderStatus === 'function' && updateOrderStatus(o.id, 'Delivered'));
                setSelectedOrderIds([]);
              }}
              style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#059669', cursor: 'pointer', borderRadius: '6px' }}
            >
              Mark Delivered
            </button>
          </div>
        </div>
      )}

      {/* BULK ACTIONS TOOLBAR */}
      {selectedOrderIds.length > 0 && (
        <div className="glass" style={{ padding: '12px 18px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15,23,42,0.01)', border: '1px solid var(--border)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Selected <strong>{selectedOrderIds.length}</strong> order{selectedOrderIds.length > 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bulk Action:</span>
            {['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(status => (
              <button
                key={status}
                type="button"
                onClick={() => handleBulkStatusUpdate(status)}
                style={{
                  padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border-input)',
                  background: 'var(--bg-input)', color: 'var(--text-primary)',
                  fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer'
                }}
              >
                {status}
              </button>
            ))}
            <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />
            <button
              type="button"
              onClick={handleBulkDelete}
              style={{
                padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)',
                background: 'rgba(239,68,68,0.05)', color: '#ef4444',
                fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer'
              }}
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* ORDERS TABLE */}
      <div className="glass widget-scrollbar cf-scroll-both" data-lenis-prevent tabIndex={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr>
              <th style={{ padding: '12px 16px', width: '40px' }}>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                >
                  {selectedOrderIds.length === filtered.length && filtered.length > 0 ? (
                    <CheckSquare size={16} style={{ color: 'var(--accent-purple)' }} />
                  ) : (
                    <Square size={16} />
                  )}
                </button>
              </th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Order ID</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Date</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Customer & Location</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Items Breakdown</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Total</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Status & Progress</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map(o => {
                const cust = safeCustomers.find(c => c.id === o.customerId);
                const customerName = cust?.name || o.customer || 'Unknown';
                const customerAddress = cust ? `${cust.city}, ${cust.state}` : 'N/A';
                const isSelected = selectedOrderIds.includes(o.id);
                
                return (
                  <motion.tr 
                    key={o.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    whileHover={{ backgroundColor: isSelected ? 'rgba(79,70,229,0.05)' : 'rgba(255,255,255,0.025)' }}
                    style={{ background: isSelected ? 'rgba(79,70,229,0.02)' : 'transparent', borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s ease' }}
                  >
                    <td style={{ padding: '12px 16px', width: '40px' }}>
                      <button
                        type="button"
                        onClick={() => toggleSelectOrder(o.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                      >
                        {isSelected ? (
                          <CheckSquare size={16} style={{ color: 'var(--accent-purple)' }} />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{o.id}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{o.date}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500 }}>{customerName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{customerAddress}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {(() => {
                          const items = Array.isArray(o.items) ? o.items : [];
                          const SENTINEL_STRINGS = new Set(['none', 'null', 'undefined', '']);
                          const MONETARY_NAMES = new Set(['order total', 'total', 'revenue', 'amount', 'sales', 'gross sales', 'net sales', 'subtotal', 'sub total', 'tax', 'discount', 'shipping', 'order amount', 'net amount', 'gross amount', 'total amount', 'order value', 'net value', 'gross value']);
                          const isBadName = (n) => {
                            const l = (n || '').trim().toLowerCase();
                            return SENTINEL_STRINGS.has(l) || MONETARY_NAMES.has(l);
                          };

                          // Resolve display name: prefer product lookup, fall back to item.productName
                          const resolveDisplayName = (item) => {
                            const { product, displayName } = resolveOrderItemProduct(item);
                            const name = product?.name || displayName || item.productName || item.product_name || item.sku || '';
                            return isBadName(name) ? '' : name;
                          };

                          // Build valid items with resolved names
                          const resolved = items
                            .map(item => ({ item, name: resolveDisplayName(item) }))
                            .filter(({ name }) => name);

                          // Aggregate duplicates client-side
                          const aggregated = new Map();
                          resolved.forEach(({ item, name }) => {
                            const qty = Math.max(1, Number(item.qty ?? item.quantity ?? 1) || 1);
                            if (aggregated.has(name)) {
                              aggregated.get(name).qty += qty;
                            } else {
                              aggregated.set(name, { name, qty });
                            }
                          });

                          if (aggregated.size > 0) {
                            return Array.from(aggregated.values()).map(({ name, qty }, index) => (
                              <span key={index} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {qty}x {name}
                              </span>
                            ));
                          }
                          return (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No item details available</span>
                          );
                        })()}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>${Number(o.total || 0).toFixed(2)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <select 
                          value={o.status || 'Pending'}
                          onChange={(e) => typeof updateOrderStatus === 'function' && updateOrderStatus(o.id, e.target.value)}
                          style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-input)', borderRadius: '6px', padding: '5px 8px', fontSize: '0.72rem', outline: 'none', cursor: 'pointer', width: '110px' }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Processing">Processing</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                        {getProgressSteps(o.status || 'Pending')}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <motion.button 
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(239,68,68,0.15)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => typeof deleteOrder === 'function' && deleteOrder(o.id)} 
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                      >
                        <Trash2 size={12} />
                      </motion.button>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {safeOrders.length === 0 ? 'No orders yet. Imported or created orders will appear here.' : 'No orders match your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ======================================================== */}
      {/* MODAL: CREATE ORDER FORM (Slide-over)                    */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showCreateModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              style={{ position: 'absolute', inset: 0 }} 
              onClick={() => { setShowCreateModal(false); setErrorMsg(''); }}
            />
            <motion.form 
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onSubmit={handleCreateSubmit}
              className="glass"
              data-lenis-prevent
              style={{ position: 'relative', width: '100%', maxWidth: '520px', height: '100%', padding: '32px', display: 'flex', flexDirection: 'column', gap: '18px', borderLeft: '1px solid var(--border)', boxShadow: '-20px 0 60px rgba(0,0,0,0.3)', background: 'var(--bg-modal)', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={16} style={{ color: 'var(--accent-purple)' }} /> Create New Order
                </h3>
                <button type="button" onClick={() => { setShowCreateModal(false); setErrorMsg(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              {errorMsg && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={14} /> {errorMsg}
                </div>
              )}
              
              {/* Customer Dropdown */}
              <div>
                <label style={labelStyle}>Select Customer *</label>
                <select 
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  style={inputStyle}
                  required
                >
                  <option value="">-- Choose Profile --</option>
                  {safeCustomers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Products List */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={labelStyle}>Products Checklist *</label>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={handleAddItemRow} style={{ background: 'rgba(15,23,42,0.03)', border: '1px solid var(--border-input)', borderRadius: '6px', color: 'var(--text-primary)', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer' }}>
                    + Add Product Item
                  </motion.button>
                </div>

                <div className="cf-scroll-area" data-lenis-prevent style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '160px', paddingRight: '4px' }}>
                  <AnimatePresence>
                    {selectedItems.map((item, idx) => (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        
                        {/* Product Selection */}
                        <select 
                          value={item.productId}
                          onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                          style={{ ...inputStyle, flex: 2 }}
                          required
                        >
                          <option value="">-- Choose Product --</option>
                          {safeProducts.map(p => (
                            <option key={p.id} value={p.id} disabled={p.stock <= 0 || p.isActive === false}>
                              {p.name} - ${p.price.toFixed(2)} ({p.stock} left)
                            </option>
                          ))}
                        </select>

                        {/* Quantity Selector */}
                        <input 
                          style={{ ...inputStyle, flex: 0.8 }} 
                          type="number" 
                          min="1" 
                          value={item.qty} 
                          onChange={e => handleItemChange(idx, 'qty', parseInt(e.target.value, 10))}
                          placeholder="Qty" 
                          required 
                        />

                        {/* Remove Row */}
                        <motion.button 
                          whileHover={{ scale: 1.1, backgroundColor: 'rgba(239,68,68,0.15)' }}
                          whileTap={{ scale: 0.9 }}
                          type="button" 
                          onClick={() => handleRemoveItemRow(idx)}
                          disabled={selectedItems.length <= 1}
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', padding: '8px', borderRadius: '8px', cursor: 'pointer', opacity: selectedItems.length <= 1 ? 0.3 : 1 }}
                        >
                          <X size={14} />
                        </motion.button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Auto Total Invoice Display */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Invoice Pricing Total:</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent-purple)' }}>
                  ${currentTotal.toFixed(2)}
                </span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '6px', padding: '14px' }}>
                Book Order
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
