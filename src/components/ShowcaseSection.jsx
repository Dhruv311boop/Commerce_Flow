import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Network, Terminal, Compass, ChevronRight, Activity, Cpu } from 'lucide-react';

export default function ShowcaseSection() {
  const scrollRef = useRef(null);
  
  // Track vertical scroll position of the entire 300vh section
  const { scrollYProgress } = useScroll({
    target: scrollRef
  });

  // Map scroll progress to horizontal translation
  // Moves cards horizontally from 0% to -66% of their container width
  const x = useTransform(scrollYProgress, [0, 1], ["0vw", "-120vw"]);

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
    <div ref={scrollRef} id="showcase" className="horizontal-scroll-container">
      <div className="horizontal-scroll-sticky">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="sticky-info-panel"
          style={{
            position: 'absolute',
            top: '20vh',
            left: '5vw',
            maxWidth: '300px',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <span 
            className="text-xs font-semibold tracking-widest uppercase font-mono"
            style={{ color: 'var(--accent-purple)', letterSpacing: '0.2em' }}
          >
            Product Showcase
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold" style={{ fontSize: '2rem' }}>Inside CommerceFlow</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Scroll vertically to cycle through product modules.</p>
        </motion.div>

        {/* Translating horizontal cards line */}
        <motion.div 
          style={{ x, display: 'flex', gap: '48px', paddingLeft: '35vw', paddingRight: '20vw', alignItems: 'center' }} 
          className="horizontal-scroll-content"
        >
          {slides.map((slide, index) => (
            <div 
              key={index} 
              className="glass"
              style={{
                width: '65vw',
                maxWidth: '620px',
                height: '420px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '36px',
                boxShadow: '0 20px 80px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Outer decorative card shadow */}
              <div 
                style={{
                  position: 'absolute',
                  top: '-10%',
                  right: '-10%',
                  width: '150px',
                  height: '150px',
                  borderRadius: '50%',
                  background: slide.color,
                  filter: 'blur(60px)',
                  opacity: 0.15,
                  pointerEvents: 'none'
                }}
              />

              {/* Upper Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {slide.icon}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)' }}>
                      {slide.badge}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '12px' }}>{slide.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{slide.subtitle}</p>
                </div>
                <span style={{ fontSize: '3rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'rgba(255,255,255,0.02)', lineHeight: 0.8 }}>
                  {slide.num}
                </span>
              </div>

              {/* Lower Section (Split into text desc & visual mockup) */}
              <div style={{ display: 'flex', gap: '24px', marginTop: '24px', alignItems: 'stretch' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    {slide.desc}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: slide.color, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                    Interactive Walkthrough <ChevronRight size={14} />
                  </div>
                </div>
                <div 
                  className="glass" 
                  style={{ 
                    flex: 1.2, 
                    height: '180px', 
                    background: 'rgba(0, 0, 0, 0.4)', 
                    border: '1px solid rgba(255, 255, 255, 0.04)', 
                    borderRadius: '12px', 
                    padding: '16px',
                    overflow: 'hidden'
                  }}
                >
                  {slide.mockup}
                </div>
              </div>

            </div>
          ))}
        </motion.div>

      </div>
    </div>
  );
}
