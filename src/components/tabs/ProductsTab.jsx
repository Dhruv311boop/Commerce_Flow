import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductsTab({ products, addProduct, editProduct, deleteProduct }) {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Add Product Form State
  const [newForm, setNewForm] = useState({ name: '', price: '', stock: '', sku: '', category: 'General', desc: '' });

  // Edit Product Form State
  const [editForm, setEditForm] = useState({ name: '', price: '', stock: '', sku: '', category: 'General', desc: '', isActive: true });

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const getInventoryStatus = (stockValue) => {
    const stock = Number(stockValue || 0);
    if (stock < 0) return 'Backordered';
    if (stock === 0) return 'Out Of Stock';
    return 'In Stock';
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newForm.name || !newForm.price) return;
    addProduct({
      name: newForm.name,
      price: parseFloat(newForm.price),
      stock: parseInt(newForm.stock || '0', 10),
      sku: newForm.sku || 'SKU-' + Date.now(),
      category: newForm.category || 'General',
      desc: newForm.desc,
      isActive: true
    });
    setNewForm({ name: '', price: '', stock: '', sku: '', category: 'General', desc: '' });
    setShowAddModal(false);
  };

  const handleEditClick = (p) => {
    setEditingProduct(p);
    setEditForm({
      name: p.name || '',
      price: p.price || 0,
      stock: p.stock || 0,
      sku: p.sku || '',
      category: p.category || 'General',
      desc: p.desc || '',
      isActive: p.isActive !== false
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    editProduct(editingProduct.id, {
      name: editForm.name,
      price: parseFloat(editForm.price),
      stock: parseInt(editForm.stock, 10),
      sku: editForm.sku,
      category: editForm.category,
      desc: editForm.desc,
      isActive: editForm.isActive
    });
    setEditingProduct(null);
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
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Products</h2>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products..." 
              style={{ padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid var(--border-input)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }} 
            />
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <Plus size={14} /> Add Product
          </button>
        </div>
      </div>

      {/* PRODUCTS TABLE */}
      <div className="glass widget-scrollbar cf-scroll-both" data-lenis-prevent tabIndex={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Product</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>SKU</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Category</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Price</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Stock</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Inventory Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Sales</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map(p => (
                <motion.tr 
                  key={p.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: p.isActive === false ? 0.5 : 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.025)' }}
                  style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                    <div style={{ color: 'var(--text-primary)' }}>{p.name}</div>
                    {p.desc && String(p.desc).trim() !== '' && String(p.desc).trim().toLowerCase() !== 'none' && String(p.desc).trim().toLowerCase() !== 'null' && String(p.desc).trim().toLowerCase() !== 'undefined' && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>
                        {p.desc}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{p.sku}</td>
                  <td style={{ padding: '12px 16px' }}>{p.category}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>${p.price.toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: Number(p.stock || 0) === 0 ? '#ef4444' : Number(p.stock || 0) < 5 ? '#d97706' : 'var(--accent-green)' }}>
                    {Number(p.stock || 0)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {(() => {
                      const inventoryStatus = p.inventoryStatus || getInventoryStatus(p.stock);
                      const color = inventoryStatus === 'In Stock' ? 'var(--accent-green)' : inventoryStatus === 'Backordered' ? '#d97706' : '#ef4444';
                      return (
                        <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 600, background: inventoryStatus === 'In Stock' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)', color }}>
                          {inventoryStatus}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{p.salesCount || 0}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 600, background: p.isActive !== false ? 'rgba(16,185,129,0.1)' : 'rgba(15,23,42,0.05)', color: p.isActive !== false ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                      {p.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <motion.button 
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(15,23,42,0.1)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleEditClick(p)} 
                        style={{ background: 'rgba(15,23,42,0.03)', border: '1px solid var(--border-input)', color: 'var(--text-primary)', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <Edit2 size={12} />
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(239,68,68,0.15)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => deleteProduct(p.id)} 
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <Trash2 size={12} />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ======================================================== */}
      {/* MODAL: ADD PRODUCT FORM (Slide-over)                     */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showAddModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              style={{ position: 'absolute', inset: 0 }} 
              onClick={() => setShowAddModal(false)}
            />
            <motion.form 
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onSubmit={handleAddSubmit}
              className="glass"
              style={{ position: 'relative', width: '100%', maxWidth: '480px', height: '100%', padding: '32px', display: 'flex', flexDirection: 'column', gap: '18px', borderLeft: '1px solid var(--border)', boxShadow: '-20px 0 60px rgba(0,0,0,0.3)', background: 'var(--bg-modal)', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={16} style={{ color: 'var(--accent-purple)' }} /> Add New Product
                </h3>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              
              <div>
                <label style={labelStyle}>Product Name *</label>
                <input style={inputStyle} value={newForm.name} onChange={e => setNewForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Matte Coffee Mug" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Price ($) *</label>
                  <input style={inputStyle} type="number" step="0.01" min="0" value={newForm.price} onChange={e => setNewForm(prev => ({ ...prev, price: e.target.value }))} placeholder="19.99" required />
                </div>
                <div>
                  <label style={labelStyle}>Initial Stock *</label>
                  <input style={inputStyle} type="number" min="0" value={newForm.stock} onChange={e => setNewForm(prev => ({ ...prev, stock: e.target.value }))} placeholder="10" required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>SKU</label>
                  <input style={inputStyle} value={newForm.sku} onChange={e => setNewForm(prev => ({ ...prev, sku: e.target.value }))} placeholder="MCM-001" />
                </div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <input style={inputStyle} value={newForm.category} onChange={e => setNewForm(prev => ({ ...prev, category: e.target.value }))} placeholder="Home" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={newForm.desc} onChange={e => setNewForm(prev => ({ ...prev, desc: e.target.value }))} placeholder="Brief product description..." />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'auto', padding: '14px' }}>
                Add Product
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: EDIT PRODUCT FORM (Slide-over)                    */}
      {/* ======================================================== */}
      <AnimatePresence>
        {editingProduct && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              style={{ position: 'absolute', inset: 0 }} 
              onClick={() => setEditingProduct(null)}
            />
            <motion.form 
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onSubmit={handleEditSubmit}
              className="glass"
              style={{ position: 'relative', width: '100%', maxWidth: '480px', height: '100%', padding: '32px', display: 'flex', flexDirection: 'column', gap: '18px', borderLeft: '1px solid var(--border)', boxShadow: '-20px 0 60px rgba(0,0,0,0.3)', background: 'var(--bg-modal)', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit2 size={16} style={{ color: 'var(--accent-blue)' }} /> Edit Product
                </h3>
                <button type="button" onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              
              <div>
                <label style={labelStyle}>Product Name *</label>
                <input style={inputStyle} value={editForm.name} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Name" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Price ($) *</label>
                  <input style={inputStyle} type="number" step="0.01" min="0" value={editForm.price} onChange={e => setEditForm(prev => ({ ...prev, price: e.target.value }))} placeholder="Price" required />
                </div>
                <div>
                  <label style={labelStyle}>Stock units *</label>
                  <input style={inputStyle} type="number" min="0" value={editForm.stock} onChange={e => setEditForm(prev => ({ ...prev, stock: e.target.value }))} placeholder="Stock" required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>SKU</label>
                  <input style={inputStyle} value={editForm.sku} onChange={e => setEditForm(prev => ({ ...prev, sku: e.target.value }))} placeholder="SKU" />
                </div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <input style={inputStyle} value={editForm.category} onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))} placeholder="Category" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={editForm.desc} onChange={e => setEditForm(prev => ({ ...prev, desc: e.target.value }))} placeholder="Description..." />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input 
                  type="checkbox" 
                  id="edit-is-active"
                  checked={editForm.isActive} 
                  onChange={e => setEditForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                />
                <label htmlFor="edit-is-active" style={{ fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', color: 'var(--text-primary)' }}>Mark product as Active</label>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'auto', padding: '14px' }}>
                Save Changes
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
