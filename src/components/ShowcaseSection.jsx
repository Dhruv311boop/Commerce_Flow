import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Network, Terminal, Compass, ChevronRight, Activity, Cpu } from 'lucide-react';

export default function ShowcaseSection() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const slides = [
    {
      num: "01",
      icon: <Network className="text-purple-400" />,
      title: "Product Intelligence",
      subtitle: "Catalog performance at a glance",
      desc: "Track every SKU's sales velocity, margin health, and inventory turnover from a single view. Spot trends before they become problems.",
      badge: "Product Engine",
      color: "var(--accent-purple)",
      mockup: (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 2, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Weekly Revenue</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>$4,820</div>
              <div style={{ height: '30px', display: 'flex', alignItems: 'flex-end', gap: '3px', marginTop: '12px' }}>
                {[30, 45, 40, 60, 55, 70, 65, 80, 75, 90, 85, 95].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: 'var(--accent-purple)', borderRadius: '1px', opacity: 0.7 }} />
                ))}
              </div>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
              <Activity size={24} style={{ color: 'var(--accent-blue)' }} />
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Conversion</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'oklch(0.72 0.15 140)' }}>3.8%</div>
            </div>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Top Sellers (5/5 active)</div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'oklch(0.72 0.15 140)' }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>Earbuds Pro: #1</span>
              <span>156 units sold</span>
            </div>
          </div>
        </div>
      )
    },
    {
      num: "02",
      icon: <Cpu className="text-blue-400" />,
      title: "Order Operations",
      subtitle: "Fulfillment made effortless",
      desc: "Process orders, manage returns, and track shipments across carriers. Automate status updates and keep customers informed.",
      badge: "Fulfillment",
      color: "var(--accent-blue)",
      mockup: (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Order Queue</span>
            <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>3 PENDING</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'hidden' }}>
            {[
              { task: "ORD-1024 · Ava Mitchell", status: "Processing", time: "$159.98" },
              { task: "ORD-1023 · Liam Chen", status: "Shipped", time: "$49.00" },
              { task: "ORD-1022 · Sophie Laurent", status: "Delivered", time: "$191.99" }
            ].map((t, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', fontSize: '0.7rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{t.task}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: t.status === "Delivered" ? 'oklch(0.72 0.15 140)' : t.status === "Shipped" ? 'var(--accent-blue)' : 'var(--accent-purple)' }}>{t.status}</span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{t.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      num: "03",
      icon: <Terminal className="text-cyan-400" />,
      title: "Inventory Pulse",
      subtitle: "Real-time stock intelligence",
      desc: "Monitor stock levels across warehouses. Get automatic low-stock alerts and reorder suggestions before you run out.",
      badge: "Stock Sync",
      color: "var(--accent-cyan)",
      mockup: (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px', fontFamily: 'var(--font-mono)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }} />
            <span>inventory-sync [connected]</span>
          </div>
          <div style={{ flexGrow: 1, background: 'black', borderRadius: '6px', padding: '12px', fontSize: '0.65rem', color: '#c5c9db', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div><span style={{ color: 'var(--accent-purple)' }}>$</span> inventory check --low-stock</div>
            <div style={{ color: '#f59e0b' }}>⚠ Organic Cotton Tee: 3 remaining</div>
            <div style={{ color: '#f59e0b' }}>⚠ Ceramic Pour-Over Set: 2 remaining</div>
            <div style={{ color: '#ef4444' }}>✕ Running Shoes Aero: OUT OF STOCK</div>
            <div><span style={{ color: 'var(--accent-purple)' }}>$</span> reorder --auto --threshold 5</div>
            <div style={{ color: 'var(--accent-cyan)' }}>Reorder request sent for 3 SKUs ... ✓</div>
          </div>
        </div>
      )
    }
  ];

  return (
    <section id="showcase" className="section relative py-24 bg-[var(--bg-dark)]">
      <div className="container max-w-6xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <span 
            className="text-xs font-semibold tracking-widest uppercase font-mono mb-4 block"
            style={{ color: 'var(--accent-purple)', letterSpacing: '0.15em' }}
          >
            Platform Capabilities
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold mb-4" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            Built for Industrial Scale
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Everything you need to orchestrate inventory, fulfillment, and customer data across your entire commerce operation.
          </p>
        </div>

        {/* Vertical Stack of Cards */}
        <div className="flex flex-col gap-12">
          {slides.map((slide, index) => (
            <motion.div 
              key={index} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass relative overflow-hidden flex flex-col md:flex-row w-full"
              style={{
                padding: '0', // We will pad the inner sections
                minHeight: '360px'
              }}
            >
              {/* Text Area */}
              <div className="flex-1 p-8 md:p-12 flex flex-col justify-center border-b md:border-b-0 md:border-r" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]">
                    {slide.icon}
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)]">
                    {slide.badge}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-2">{slide.title}</h3>
                <p className="text-sm font-medium text-[var(--text-muted)] mb-6">{slide.subtitle}</p>
                <p className="text-[var(--text-secondary)] leading-relaxed mb-8">
                  {slide.desc}
                </p>
                <div className="flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: slide.color }}>
                  Explore Feature <ChevronRight size={16} />
                </div>
              </div>

              {/* Mockup Area */}
              <div className="flex-[1.2] bg-[#000000] p-6 relative">
                {/* Subtle colored glow behind mockup */}
                <div 
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{ background: `radial-gradient(circle at center, ${slide.color} 0%, transparent 70%)` }}
                />
                <div className="relative h-full w-full rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#09090b] p-4 overflow-hidden shadow-2xl">
                  {slide.mockup}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
