import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Cpu,
  Package,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';

const initialLogs = [
  { id: 1, time: '18:02:01', text: '⚡ AI Engine initialized', type: 'system' },
  { id: 2, time: '18:02:04', text: '✓ Inventory database sync complete', type: 'system' },
  { id: 3, time: '18:02:10', text: '📈 Sales trend detection active', type: 'success' },
];

const logsTemplates = [
  { text: '🛒 Order ORD-1025 processed: $159.98 (Electronics)', type: 'info' },
  { text: '🔥 AI Insight: Demand spike (+12%) for Premium Earbuds', type: 'insight' },
  { text: '⚠️ Smart Inventory: Low stock warning for Matte Mug', type: 'warn' },
  { text: '✓ Sales Automation: Triggered discount revival on Mug', type: 'success' },
  { text: '👥 Cohort updated: LTV high-value segment grew by 2%', type: 'info' },
  { text: '⚡ Predictive Engine: Generated replenishment order #502', type: 'insight' },
];

export default function CapabilitiesSection() {
  const [simulatedLogs, setSimulatedLogs] = useState(initialLogs);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomTemplate = logsTemplates[Math.floor(Math.random() * logsTemplates.length)];
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];

      setSimulatedLogs((prev) => {
        const next = [...prev, { id: Date.now(), time: timeStr, text: randomTemplate.text, type: randomTemplate.type }];
        if (next.length > 5) next.shift();
        return next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const capabilities = [
    {
      title: 'AI Analytics',
      badge: 'Deep Learning',
      desc: 'Track real-time ecommerce health with deep learning analytics that flag anomalies and highlight margin expansions.',
      icon: <BarChart3 className="text-purple-400" size={20} />,
      color: 'var(--accent-purple)',
      widget: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Real-Time Margin Health</span>
            <span style={{ color: 'var(--accent-green)', fontSize: '0.8rem', fontWeight: 700 }}>+4.2% Expansion</span>
          </div>
          <div style={{ position: 'relative', height: '60px', width: '100%', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
            {[30, 45, 35, 60, 50, 75, 65, 80, 95, 90, 110, 105].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 10 ? 'var(--accent-cyan)' : 'var(--accent-purple)', borderRadius: '2px', opacity: 0.8 }} />
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Smart Inventory',
      badge: 'Predictive Stock',
      desc: 'AI-driven stock optimization that predicts depletion rates and auto-generates replenishment orders before stockouts occur.',
      icon: <Package className="text-blue-400" size={20} />,
      color: 'var(--accent-blue)',
      widget: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', justifyContent: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Automated Stock Balancer</div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Organic Cotton Tee</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--accent-green)' }}>Auto-Reorder Level: &lt;5 units</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.68 0.16 30)' }}>3 Remaining</div>
              <span style={{ fontSize: '0.55rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)' }}>Restock Sent</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Customer Intelligence',
      badge: 'Predictive Cohorts',
      desc: 'Decode buying behavior, purchase frequency, lifetime value (LTV), and segment customers using predictive modeling.',
      icon: <Users className="text-cyan-400" size={20} />,
      color: 'var(--accent-cyan)',
      widget: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>LTV Cohort Growth</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Predictive 90-Day</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: 'VIP', pct: 85, color: 'var(--accent-purple)', val: '42%' },
              { label: 'Loyal', pct: 60, color: 'var(--accent-blue)', val: '35%' },
              { label: 'New', pct: 35, color: 'var(--accent-cyan)', val: '23%' },
            ].map((c) => (
              <div key={c.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '8px 0' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{c.label}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{c.val}</span>
                <div style={{ width: '80%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${c.pct}%`, height: '100%', background: c.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Real-Time Insights',
      badge: 'Insights Feed',
      desc: 'Instant notifications and live streams of sales events, conversion bumps, and low-inventory warnings.',
      icon: <Activity className="text-purple-400" size={20} />,
      color: 'var(--accent-purple)',
      widget: (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
            <span>INSIGHTS MONITOR</span>
            <span style={{ color: 'var(--accent-green)' }}>● LIVE</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden', height: '120px' }}>
            {simulatedLogs.map((log) => (
              <div key={log.id} style={{ display: 'flex', gap: '8px', opacity: 0.9 }}>
                <span style={{ color: 'var(--text-muted)' }}>[{log.time}]</span>
                <span
                  style={{
                    color: log.type === 'success'
                      ? 'var(--accent-green)'
                      : log.type === 'warn'
                        ? 'oklch(0.68 0.16 30)'
                        : log.type === 'insight'
                          ? 'var(--accent-purple)'
                          : 'var(--text-secondary)',
                  }}
                >
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Predictive Reports',
      badge: 'revenue forecast',
      desc: 'Generate multi-channel revenue forecast reports and trend projections based on historical seed data.',
      icon: <TrendingUp className="text-blue-400" size={20} />,
      color: 'var(--accent-blue)',
      widget: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
            <span>Growth Projection</span>
            <span style={{ color: 'var(--accent-cyan)' }}>+$12.4K Forecast</span>
          </div>
          <svg viewBox="0 0 200 60" style={{ width: '100%', height: '50px', overflow: 'visible' }}>
            <defs>
              <linearGradient id="widget-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M 0,50 Q 30,35 60,38 T 120,20 T 180,8 L 200,8" fill="none" stroke="var(--accent-blue)" strokeWidth="2.5" />
            <path d="M 120,20 T 180,8 L 200,8 L 200,60 L 0,60 Z" fill="url(#widget-grad)" style={{ opacity: 0.3 }} />
            <circle cx="180" cy="8" r="4" fill="var(--accent-cyan)" />
          </svg>
        </div>
      ),
    },
    {
      title: 'Sales Automation',
      badge: 'Trigger Rules',
      desc: 'Set automated workflows that trigger dynamic discount strategies or stock rebalancing rules on-the-fly.',
      icon: <Cpu className="text-cyan-400" size={20} />,
      color: 'var(--accent-cyan)',
      widget: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', justifyContent: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Active Automation Sequence</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
            <span style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '4px 8px', borderRadius: '4px' }}>Velocity Drop 15%</span>
            <span style={{ color: 'var(--text-muted)' }}>➔</span>
            <span style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--accent-purple)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(168,85,247,0.2)' }}>Smart Promo</span>
            <span style={{ color: 'var(--text-muted)' }}>➔</span>
            <span style={{ background: 'rgba(74,222,128,0.1)', color: 'var(--accent-green)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(74,222,128,0.2)' }}>Revived (+18%)</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section
      id="capabilities"
      className="section bg-black/40"
      style={{
        padding: '120px 0',
        borderTop: '1px solid rgba(255,255,255,0.02)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="container">
        <div className="max-w-2xl mx-auto text-center mb-16" style={{ maxWidth: '680px', margin: '0 auto 64px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '99px',
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.2)',
              marginBottom: '16px',
            }}
          >
            <Sparkles size={12} style={{ color: 'var(--accent-blue)' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Core Intelligence</span>
          </div>

          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontFamily: 'var(--font-display)', fontWeight: 800, marginTop: '8px', marginBottom: '16px' }}>
            Supercharge Commerce with AI
          </h2>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Discover the six pillars of the CommerceFlow intelligent operating engine. Streamline workflows, scale margins, and automate from one dashboard.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '32px',
            maxWidth: '1100px',
            margin: '0 auto',
          }}
        >
          {capabilities.map((cap, idx) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{
                type: 'spring',
                stiffness: 90,
                damping: 18,
                delay: idx * 0.08,
              }}
              className="glass"
              style={{
                padding: '36px',
                borderRadius: '24px',
                background: 'rgba(10, 10, 12, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
                overflow: 'hidden',
              }}
              whileHover={{
                y: -8,
                scale: 1.02,
                borderColor: 'rgba(168, 85, 247, 0.3)',
                boxShadow: '0 25px 50px -12px rgba(168, 85, 247, 0.25)',
              }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 0.08 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '100%',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 60%)',
                  pointerEvents: 'none',
                }}
              />
              <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '120px', height: '120px', background: `radial-gradient(circle, ${cap.color}15 0%, transparent 70%)`, filter: 'blur(30px)', pointerEvents: 'none' }} />

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {cap.icon}
                  </div>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '6px' }}>
                    {cap.badge}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '12px 0 8px' }}>{cap.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {cap.desc}
                </p>
              </div>

              <div
                className="glass"
                style={{
                  height: '140px',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.03)',
                  borderRadius: '16px',
                  padding: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                {cap.widget}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
