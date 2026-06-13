import React from 'react';
import { AlertTriangle, CheckCircle, PackageX, Warehouse } from 'lucide-react';

const StatCard = ({ title, value, icon, color }) => (
  <div className="glass" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `rgba(59,130,246,0.06)`, border: `1px solid var(--border)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  </div>
);

export default function InventoryTab({ products }) {
  const totalProducts = products.length;
  const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
  const lowStock = products.filter(p => p.stock > 0 && p.stock < 5);
  const outOfStock = products.filter(p => p.stock === 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Inventory Hub</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <StatCard title="Total SKUs" value={totalProducts} icon={<Warehouse size={24} />} color="var(--accent-blue)" />
        <StatCard title="Total Stock Units" value={totalStock} icon={<CheckCircle size={24} />} color="var(--accent-green)" />
        <StatCard title="Low Stock Alerts" value={lowStock.length} icon={<AlertTriangle size={24} />} color="#d97706" />
        <StatCard title="Out of Stock" value={outOfStock.length} icon={<PackageX size={24} />} color="#ef4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d97706' }}>
            <AlertTriangle size={18} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Low Stock Items (Action Required)</h3>
          </div>
          {lowStock.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No items are currently low on stock.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {lowStock.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(15,23,42,0.01)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SKU: {p.sku}</div>
                  </div>
                  <div style={{ color: '#d97706', fontWeight: 700, fontSize: '0.85rem' }}>Only {p.stock} left</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
            <PackageX size={18} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Out of Stock Items</h3>
          </div>
          {outOfStock.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No items are currently out of stock.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {outOfStock.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(239,68,68,0.03)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.1)' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SKU: {p.sku}</div>
                  </div>
                  <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}>Empty</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
