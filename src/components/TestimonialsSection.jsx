import React from 'react';
import { motion } from 'framer-motion';
import { Star, Sparkles, TrendingUp, Users, ShieldCheck, Zap } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

export default function TestimonialsSection() {
  const stats = [
    { label: "Businesses Automated", value: <AnimatedCounter value={12} suffix="K+" />, icon: <Zap className="text-purple-400" size={16} /> },
    { label: "Customer Satisfaction", value: <AnimatedCounter value={98} suffix="%" />, icon: <ShieldCheck className="text-blue-400" size={16} /> },
    { label: "Revenue Tracked", value: <AnimatedCounter value={45} prefix="$" suffix="M+" />, icon: <TrendingUp className="text-cyan-400" size={16} /> },
    { label: "24/7 AI Insights", value: "Active", icon: <Users className="text-purple-400" size={16} /> }
  ];

  const row1 = [
    {
      name: "Sophia Bennett",
      role: "Founder, Bloom & Wild Co.",
      comment: "CommerceFlow's AI insights predicted our product demand curve with 96% accuracy. We optimized our marketing ad spend and completely avoided our usual seasonal stockouts.",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=faces&q=80"
    },
    {
      name: "Liam O'Connor",
      role: "VP of Growth, AeroWear",
      comment: "The automation workflows are absolute magic. Scaling up our flash-sale discounts dynamically based on user engagement led to a 34% increase in sales velocity.",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces&q=80"
    },
    {
      name: "Elena Rostova",
      role: "Operations Director, Nordique Home",
      comment: "Manual reordering is dead. The smart replenishment system automatically handles stock levels across all three warehouses, saving us 15 hours of operations every week.",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces&q=80"
    }
  ];

  const row2 = [
    {
      name: "Aiko Tanaka",
      role: "Chief Marketing Officer, GenZ Beauty",
      comment: "Understanding customer lifetime value (LTV) cohorts has never been so seamless. We can easily segment high-value buyers and run personalized campaigns with a few clicks.",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=faces&q=80"
    },
    {
      name: "David K.",
      role: "Head of Data, SwiftCart",
      comment: "The analytics engine is clean, fast, and remarkably robust. Identifying anomalous spikes and drop-offs is immediate, and our conversion rate tracking is flawless.",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&h=120&fit=crop&crop=faces&q=80"
    },
    {
      name: "Julian F.",
      role: "Founder, Minimalist Goods",
      comment: "The dashboard view is beautiful, intuitive, and extremely fast. It compiles everything our e-commerce business needs into a single unified workspace.",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=faces&q=80"
    }
  ];

  return (
    <section 
      id="testimonials" 
      className="section" 
      style={{ 
        padding: '120px 0', 
        overflow: 'hidden', 
        position: 'relative', 
        background: 'rgba(3,3,3,0.6)' 
      }}
    >
      {/* Component Specific Keyframes Style Block */}
      <style>{`
        .scroll-track-left {
          display: flex;
          gap: 32px;
          width: max-content;
          animation: scroll-left-kf 35s linear infinite;
        }
        .scroll-track-right {
          display: flex;
          gap: 32px;
          width: max-content;
          animation: scroll-right-kf 35s linear infinite;
        }
        .scroll-track-wrapper:hover .scroll-track-left,
        .scroll-track-wrapper:hover .scroll-track-right {
          animation-play-state: paused;
        }
        @keyframes scroll-left-kf {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-50% - 16px)); }
        }
        @keyframes scroll-right-kf {
          0% { transform: translateX(calc(-50% - 16px)); }
          100% { transform: translateX(0); }
        }
        @keyframes gradient-glow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .gradient-heading {
          background: linear-gradient(to right, oklch(0.62 0.26 295), oklch(0.6 0.23 250), oklch(0.75 0.18 190));
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradient-glow 6s linear infinite;
        }
        .glass-premium {
          background: rgba(13, 13, 16, 0.65);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(168, 85, 247, 0.15);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .glass-premium:hover {
          background: rgba(18, 16, 26, 0.8);
          border-color: rgba(168, 85, 247, 0.4);
          box-shadow: 0 20px 50px rgba(168, 85, 247, 0.15);
          transform: translateY(-6px) scale(1.01);
        }
      `}</style>

      {/* Cinematic Lighting effects */}
      <div className="glow-bg glow-purple" style={{ top: '20%', left: '50%', transform: 'translateX(-50%)', opacity: 0.12 }} />
      <div className="glow-bg glow-blue" style={{ bottom: '10%', right: '10%', opacity: 0.08 }} />

      {/* Grid Pattern Backdrop */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -1,
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.005) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.005) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.6
        }}
      />

      <div className="container">
        
        {/* STATS SECTION ABOVE TESTIMONIALS */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '24px',
            marginBottom: '96px',
            position: 'relative',
            zIndex: 2
          }}
        >
          {stats.map((stat, sidx) => (
            <motion.div
              key={sidx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: sidx * 0.1 }}
              className="glass"
              style={{
                padding: '24px 32px',
                borderRadius: '20px',
                background: 'rgba(10, 10, 12, 0.55)',
                border: '1px solid rgba(255,255,255,0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              whileHover={{ 
                borderColor: 'rgba(168, 85, 247, 0.3)', 
                y: -6,
                scale: 1.02,
                boxShadow: '0 20px 40px rgba(168, 85, 247, 0.15)'
              }}
            >
              <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {stat.icon}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>{stat.value}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* SECTION HEADER */}
        <div className="max-w-2xl mx-auto text-center" style={{ maxWidth: '720px', margin: '0 auto 80px', textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '99px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', marginBottom: '16px' }}
          >
            <Sparkles size={12} style={{ color: 'var(--accent-purple)' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Social Proof</span>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="gradient-heading"
            style={{ 
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', 
              fontFamily: 'var(--font-display)', 
              fontWeight: 800, 
              marginTop: '16px', 
              marginBottom: '16px',
              letterSpacing: '-0.03em'
            }}
          >
            Loved by Modern Commerce Teams
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ color: 'var(--text-secondary)', fontSize: '1.08rem', lineHeight: 1.6 }}
          >
            See how founders, ecommerce brands, and operations teams use CommerceFlow AI to automate workflows, increase sales, and scale faster.
          </motion.p>
        </div>
      </div>

      {/* INFINITE CAROUSELS AREA */}
      <div className="scroll-track-wrapper flex flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%', overflow: 'hidden' }}>
        
        {/* Row 1 (Scrolling Left) */}
        <div style={{ overflow: 'hidden', width: '100%' }}>
          <div className="scroll-track-left">
            {[...row1, ...row1].map((test, index) => (
              <div 
                key={index} 
                className="glass-premium" 
                style={{ 
                  width: '420px', 
                  padding: '36px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '20px', 
                  textAlign: 'left',
                  borderRadius: '24px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <img 
                      src={test.avatar} 
                      alt={test.name} 
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.08)' }} 
                    />
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{test.name}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{test.role}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[...Array(test.rating)].map((_, i) => (
                      <Star key={i} size={12} fill="currentColor" className="text-yellow-500" style={{ color: '#f59e0b' }} />
                    ))}
                  </div>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', fontWeight: 400 }}>
                  &quot;{test.comment}&quot;
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 (Scrolling Right) */}
        <div style={{ overflow: 'hidden', width: '100%' }}>
          <div className="scroll-track-right">
            {[...row2, ...row2].map((test, index) => (
              <div 
                key={index} 
                className="glass-premium" 
                style={{ 
                  width: '420px', 
                  padding: '36px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '20px', 
                  textAlign: 'left',
                  borderRadius: '24px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <img 
                      src={test.avatar} 
                      alt={test.name} 
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.08)' }} 
                    />
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{test.name}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{test.role}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[...Array(test.rating)].map((_, i) => (
                      <Star key={i} size={12} fill="currentColor" className="text-yellow-500" style={{ color: '#f59e0b' }} />
                    ))}
                  </div>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', fontWeight: 400 }}>
                  &quot;{test.comment}&quot;
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Credit Note */}
        <div style={{ marginTop: '80px', paddingTop: '32px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 400, letterSpacing: '0.5px' }}>
          <p>
            Built by Dhruv Chaudhary | Full Stack Developer
          </p>
        </div>

      </div>
    </section>
  );
}
