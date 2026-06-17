import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { 
  Sparkles, 
  TrendingUp, 
  ShoppingBag, 
  ClipboardList, 
  Users, 
  AlertTriangle, 
  LayoutDashboard, 
  ArrowRight,
  BrainCircuit,
} from 'lucide-react';
import { useCommerceDatabase } from '../hooks/useCommerceDatabase';

// Subcomponent for Animated Stats Counter
function StatCounter({ target, prefix = "", suffix = "", duration = 1500, id = "default" }) {
  const end = parseInt(target, 10);
  const storageKey = `commerceflow-stat-${id}`;
  const hasAnimated = sessionStorage.getItem(storageKey) === 'done';
  const [count, setCount] = useState(hasAnimated && Number.isFinite(end) ? end : 0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    if (isNaN(end) || end <= 0) {
      return;
    }

    if (sessionStorage.getItem(storageKey) === 'done') {
      return;
    }

    const increment = Math.max(Math.ceil(end / 60), 1);
    const intervalTime = 20;

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
        sessionStorage.setItem(storageKey, 'done');
      } else {
        setCount(start);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isInView, target, duration, end, storageKey]);

  return (
    <span ref={ref} style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>
      {prefix}{count.toLocaleString('en-US')}{suffix}
    </span>
  );
}

// Single Premium Feature Card with interactive hover glow overlay
function FeatureCard({ icon, title, desc, accent }) {
  const [hoverCoords, setHoverCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 100, damping: 20 } }
      }}
      className="glass"
      style={{
        padding: '32px',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        background: 'rgba(10, 10, 12, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        overflow: 'hidden'
      }}
      whileHover={{ 
        y: -8, 
        scale: 1.02, 
        borderColor: accent,
        boxShadow: `0 20px 40px -10px rgba(0,0,0,0.4)`
      }}
    >
      {/* Glassmorphism reflection */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 0.1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%)',
          pointerEvents: 'none'
        }}
      />

      {/* Feature Icon container */}
      <div 
        style={{
          width: '46px',
          height: '46px',
          borderRadius: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 2
        }}
      >
        {icon}
      </div>
      
      {/* Title */}
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, position: 'relative', zIndex: 2, fontFamily: 'var(--font-display)' }}>
        {title}
      </h3>
      
      {/* Description */}
      <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, position: 'relative', zIndex: 2 }}>
        {desc}
      </p>
    </motion.div>
  );
}

export default function FeaturesSection({ setActiveView }) {
  const containerRef = useRef(null);
  const { scrollY } = useScroll();
  const { isEmpty, importSeedData, products, orders, customers } = useCommerceDatabase();

  // Parallax transforms for decorative background cards
  const parallaxY1 = useTransform(scrollY, [200, 1600], [0, -120]);
  const parallaxY2 = useTransform(scrollY, [200, 1600], [0, 100]);

  // Seeding Database & switching views
  const handleConnectStore = () => {
    importSeedData();
    if (setActiveView) {
      setActiveView('dashboard');
    }
  };

  const features = [
    {
      icon: <TrendingUp size={20} style={{ color: 'var(--accent-purple)' }} />,
      title: "📈 AI Sales Insights",
      desc: "Detect sales trends, identify top-selling products, predict growth opportunities, analyze customer buying patterns, and receive intelligent AI recommendations.",
      accent: 'var(--accent-purple)'
    },
    {
      icon: <ShoppingBag size={20} style={{ color: 'var(--accent-blue)' }} />,
      title: "📦 Smart Product Management",
      desc: "Add, edit, organize, and manage products with categories, variants, inventory tracking, pricing controls, and product performance analytics.",
      accent: 'var(--accent-blue)'
    },
    {
      icon: <ClipboardList size={20} style={{ color: 'var(--accent-cyan)' }} />,
      title: "🛒 Real-Time Order Tracking",
      desc: "Monitor incoming orders, update delivery status, manage processing workflows, and track fulfillment from a centralized dashboard.",
      accent: 'var(--accent-cyan)'
    },
    {
      icon: <Users size={20} style={{ color: 'var(--accent-green)' }} />,
      title: "👥 Customer Intelligence",
      desc: "Understand customer behavior, identify repeat buyers, analyze purchase history, customer segmentation, and improve retention.",
      accent: 'var(--accent-green)'
    },
    {
      icon: <AlertTriangle size={20} style={{ color: 'oklch(0.75 0.18 40)' }} />,
      title: "📊 Inventory Intelligence",
      desc: "Track stock levels automatically, receive low-stock alerts, monitor product movement, and get smart restocking recommendations.",
      accent: 'oklch(0.75 0.18 40)'
    },
    {
      icon: <LayoutDashboard size={20} style={{ color: 'var(--accent-purple)' }} />,
      title: "🤖 AI Business Dashboard",
      desc: "Visualize revenue trends, top-performing products, category insights, pie charts, growth analytics, and AI-generated business reports.",
      accent: 'var(--accent-purple)'
    }
  ];

  // Container motion parameters for staggered child fade-ins
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  // Derive Live database metrics
  const deliveredOrders = orders ? orders.filter(o => o.status === 'Delivered') : [];
  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrdersCount = orders ? orders.length : 0;
  const activeProductsCount = products ? products.length : 0;
  const customersCount = customers ? customers.length : 0;

  return (
    <section 
      ref={containerRef} 
      id="features" 
      className="section bg-black/40" 
      style={{ 
        padding: '120px 0', 
        borderTop: '1px solid rgba(255,255,255,0.02)', 
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      
      {/* Parallax ambient decorative shapes */}
      <motion.div 
        style={{ y: parallaxY1, top: '15%', left: '-10%', position: 'absolute', width: '320px', height: '320px', borderRadius: '50%', border: '1px solid rgba(168,85,247,0.04)', backgroundColor: 'rgba(168,85,247,0.01)', filter: 'blur(70px)', pointerEvents: 'none' }}
      />
      <motion.div 
        style={{ y: parallaxY2, bottom: '10%', right: '-10%', position: 'absolute', width: '320px', height: '320px', borderRadius: '50%', border: '1px solid rgba(59,130,246,0.04)', backgroundColor: 'rgba(59,130,246,0.01)', filter: 'blur(70px)', pointerEvents: 'none' }}
      />

      <div className="container">
        
        {/* ======================================================== */}
        {/* SECTION 1: EVERYTHING YOU NEED TO RUN COMMERCE WITH AI   */}
        {/* ======================================================== */}
        <div className="max-w-2xl mx-auto text-center mb-20" style={{ maxWidth: '750px', margin: '0 auto 80px', textAlign: 'center' }}>
          {/* Badge */}
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/10 mb-4"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '99px',
              border: '1px solid rgba(168, 85, 247, 0.2)',
              backgroundColor: 'rgba(168, 85, 247, 0.05)',
              marginBottom: '16px',
            }}
          >
            <Sparkles size={12} className="text-purple-400" style={{ color: 'oklch(0.75 0.18 290)' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'white', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              AI-Powered Commerce Intelligence
            </span>
          </div>

          {/* Heading */}
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: '16px', lineHeight: 1.15 }}>
            Everything You Need to Run Commerce with AI
          </h2>
          
          {/* Subheading */}
          <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.95rem, 2vw, 1.1rem)', lineHeight: 1.6 }}>
            CommerceFlow helps businesses automate operations, understand customers, track performance, and make smarter decisions from one intelligent platform.
          </p>
        </div>

        {/* Staggered Cards Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            marginBottom: '96px'
          }}
        >
          {features.map((feat) => (
            <FeatureCard
              key={feat.title}
              icon={feat.icon}
              title={feat.title}
              desc={feat.desc}
              accent={feat.accent}
            />
          ))}
        </motion.div>

        {/* ======================================================== */}
        {/* DUAL-STATE BOTTOM BAR: ONBOARDING BANNER OR COUNTER      */}
        {/* ======================================================== */}
        <div style={{ marginTop: '80px', position: 'relative', zIndex: 3 }}>
          {isEmpty ? (
            /* --- STATE A: STORE NOT CONNECTED BANNER (NO FAKE METRICS) --- */
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="glass" 
              style={{ 
                padding: '48px 32px', 
                borderRadius: '16px', 
                border: '1px solid rgba(168, 85, 247, 0.2)', 
                backgroundColor: 'rgba(168, 85, 247, 0.03)', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '24px', 
                textAlign: 'center', 
                maxWidth: '780px', 
                margin: '0 auto',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), 0 0 30px rgba(168, 85, 247, 0.05)'
              }}
            >
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', backgroundColor: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                <BrainCircuit size={26} style={{ color: 'var(--accent-purple)' }} />
              </div>
              
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
                  Connect your store to unlock AI-powered analytics and business insights.
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto' }}>
                  Ready to link your ecommerce platform? Experience live metrics processing and autonomous operations instantly.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button onClick={handleConnectStore} className="btn btn-primary" style={{ padding: '12px 24px' }}>
                  Connect Store <ArrowRight size={14} />
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '12px 24px' }}
                  onClick={() => {
                    const element = document.getElementById('features');
                    if (element && window.lenis) {
                      window.lenis.scrollTo(element, { offset: -80 });
                    }
                  }}
                >
                  Explore Features
                </button>
              </div>
            </motion.div>
          ) : (
            /* --- STATE B: LIVE STORE METRICS COUNTER (POPULATED) --- */
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '32px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                backgroundColor: 'rgba(255,255,255,0.01)',
                padding: '48px 24px',
                borderRadius: '16px',
                textAlign: 'center',
                boxShadow: 'inset 0 0 20px rgba(255,255,255,0.01)'
              }}
            >
              <div>
                <div style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 800, color: 'white', marginBottom: '4px', letterSpacing: '-0.02em' }}>
                  <StatCounter id="revenue" target={totalRevenue.toFixed(0)} prefix="$" />
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Live Revenue</div>
              </div>
              
              <div>
                <div style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 800, color: 'white', marginBottom: '4px', letterSpacing: '-0.02em' }}>
                  <StatCounter id="orders" target={totalOrdersCount} />
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Orders Synced</div>
              </div>

              <div>
                <div style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 800, color: 'white', marginBottom: '4px', letterSpacing: '-0.02em' }}>
                  <StatCounter id="products" target={activeProductsCount} />
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Products Tracked</div>
              </div>

              <div>
                <div style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 800, color: 'white', marginBottom: '4px', letterSpacing: '-0.02em' }}>
                  <StatCounter id="customers" target={customersCount} />
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Loyal Buyers</div>
              </div>
            </motion.div>
          )}
        </div>

      </div>
    </section>
  );
}
