import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useMotionValue, useSpring, animate } from 'framer-motion';
import { 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Activity, 
  Link2, 
  Upload, 
  RefreshCw, 
  BrainCircuit,
  ShoppingBag,
  DollarSign,
  ClipboardList,
  Users,
  TrendingUp,
  Package,
} from 'lucide-react';
import { useCommerceDatabase } from '../hooks/useCommerceDatabase';

function AnimatedNumber({ value, isCurrency = false, prefix = "" }) {
  const count = useMotionValue(0);
  const display = useTransform(count, (latest) => {
    if (isCurrency) {
      return prefix + latest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return prefix + Math.floor(latest).toLocaleString('en-US');
  });

  useEffect(() => {
    const controls = animate(count, value, { duration: 2.5, ease: "easeOut" });
    return controls.stop;
  }, [value, count]);

  return <motion.span>{display}</motion.span>;
}

export default function HeroSection({ setActiveView }) {
  const containerRef = useRef(null);
  const [activeStep, setActiveStep] = useState(1);
  const { scrollY } = useScroll();

  // Relational client-side Database Connection
  const { isEmpty, importSeedData, products, orders, customers } = useCommerceDatabase();

  // Scroll link for background gradient position
  const gradientY = useTransform(scrollY, [0, 800], ['0%', '30%']);
  
  // Parallax controls for decorative glow bubbles
  const glowY1 = useTransform(scrollY, [0, 1000], [0, -120]);
  const glowY2 = useTransform(scrollY, [0, 1000], [0, 120]);

  // Scroll timeline for 3D Dashboard Mockup
  const previewRef = useRef(null);
  const { scrollYProgress: previewScrollProgress } = useScroll({
    target: previewRef,
    offset: ["start end", "end center"]
  });

  // Tilt and scale transitions for the mockup
  const scrollRotateX = useTransform(previewScrollProgress, [0, 1], [10, 0]);
  const scrollScale = useTransform(previewScrollProgress, [0, 1], [0.9, 1]);
  const scrollTranslateZ = useTransform(previewScrollProgress, [0, 1], [-40, 0]);
  const previewOpacity = useTransform(previewScrollProgress, [0, 0.7], [0.6, 1]);

  // Mouse Reactive Parallax System for Ultra-Premium feel
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 40, stiffness: 80, mass: 0.5 };
  const mouseRotateX = useSpring(useTransform(mouseY, [-300, 300], [6, -6]), springConfig);
  const mouseRotateY = useSpring(useTransform(mouseX, [-300, 300], [-6, 6]), springConfig);
  
  const floatX1 = useSpring(useTransform(mouseX, [-300, 300], [-20, 20]), springConfig);
  const floatY1 = useSpring(useTransform(mouseY, [-300, 300], [-20, 20]), springConfig);

  const floatX2 = useSpring(useTransform(mouseX, [-300, 300], [15, -15]), springConfig);
  const floatY2 = useSpring(useTransform(mouseY, [-300, 300], [15, -15]), springConfig);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Connected Store Seeding Handler
  const handleConnectStore = () => {
    importSeedData();
    setActiveView('dashboard');
  };

  // Split headline text for progressive word animation
  const headline = "Run Your Entire Commerce Business with AI";
  const words = headline.split(" ");

  // --- Derive Live Database Values (if connected) ---
  const deliveredOrders = orders.filter(o => o.status === 'Delivered');
  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrdersCount = orders.length;
  const activeProductsCount = products.length;
  const customersCount = customers.length;
  const avgOrderValue = totalOrdersCount > 0 ? (orders.reduce((sum, o) => sum + o.total, 0) / totalOrdersCount) : 0;

  // Sorted list for top-selling product
  const sortedBySales = [...products].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
  const topProduct = sortedBySales[0];

  // Group sales count by categories
  const categoriesMap = {};
  products.forEach(p => {
    categoriesMap[p.category] = (categoriesMap[p.category] || 0) + (p.salesCount || 0);
  });
  const categoriesData = Object.entries(categoriesMap)
    .map(([name, sales]) => ({ name, sales }))
    .sort((a, b) => b.sales - a.sales);
  const totalSalesCount = categoriesData.reduce((sum, c) => sum + c.sales, 0) || 1;

  // Dynamic AI Insight strings
  const getAIInsight = () => {
    if (topProduct) {
      return `🔥 AI Insight: "${topProduct.name}" is your highest velocity product, driving ${Math.round((topProduct.salesCount / totalSalesCount) * 100)}% of your category sales. Scale ad budgets for electronics.`;
    }
    return "💡 AI Insight: Connect channels to trigger sales velocity forecasting and predictive replenishment recommendations.";
  };

  const lowStockProducts = products.filter(p => p.stock <= 5);
  const getInventoryStatus = () => {
    if (lowStockProducts.length > 0) {
      return `⚠️ Warning: Stock critically low on ${lowStockProducts[0].name} (${lowStockProducts[0].stock} remaining).`;
    }
    return "✓ Inventory: Stock levels healthy across all products.";
  };

  return (
    <section 
      ref={containerRef} 
      id="hero" 
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="section flex flex-col justify-center min-h-screen" 
      style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        paddingTop: '112px',
        paddingBottom: '72px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      
      {/* Scroll-driven moving gradient bg */}
      <motion.div 
        className="absolute inset-0 pointer-events-none"
        style={{
          y: gradientY,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -2,
          background: 'radial-gradient(ellipse at top, rgba(124, 58, 237, 0.18) 0%, rgba(59, 130, 246, 0.06) 50%, transparent 100%)',
          backgroundPosition: 'center top',
        }}
      />

      <div className="cf-hero-grid" />
      <motion.div
        className="cf-hero-orb cf-hero-orb-left"
        animate={{ scale: [1, 1.08, 1], opacity: [0.22, 0.36, 0.22] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="cf-hero-orb cf-hero-orb-right"
        animate={{ scale: [1, 1.12, 1], opacity: [0.18, 0.32, 0.18] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
      />

      {/* Floating particles/glow effects reacting to scroll position and breathing */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="glow-bg glow-purple"
        style={{ top: '8%', left: '3%', position: 'absolute', y: glowY1 }}
      />
      <motion.div 
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="glow-bg glow-blue"
        style={{ bottom: '12%', right: '3%', position: 'absolute', y: glowY2 }}
      />

      <div className="container flex flex-col items-center text-center z-10" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        
        {/* Premium Glow Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 mb-6"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '99px',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            backgroundColor: 'rgba(168, 85, 247, 0.08)',
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.05)',
            marginBottom: '24px',
          }}
        >
          <Sparkles size={14} className="text-purple-400" style={{ color: 'oklch(0.75 0.18 290)' }} />
          <span className="text-xs font-bold tracking-wider uppercase text-purple-200" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'white', letterSpacing: '0.12em' }}>
            AI-Powered Commerce Platform
          </span>
        </motion.div>

        {/* Progressive Text Reveal Headline */}
        <h1 
          className="max-w-4xl font-extrabold mb-6 tracking-tight leading-none"
          style={{
            maxWidth: '1000px',
            fontSize: 'clamp(3.15rem, 7vw, 5.45rem)',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            marginBottom: '24px',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
          }}
        >
          {words.map((word, idx) => {
            const isGradient = ['AI', 'Commerce', 'Business', 'Platform'].some(w => word.includes(w));
            return (
              <motion.span
                key={idx}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.8,
                  delay: idx * 0.08,
                  ease: [0.16, 1, 0.3, 1]
                }}
                style={{ 
                  display: 'inline-block', 
                  marginRight: '0.25em',
                  background: isGradient ? 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)' : 'linear-gradient(to right, #ffffff, #e0e0ff)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {word}
              </motion.span>
            );
          })}
        </h1>

        {/* Subheadline Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl text-lg text-gray-400 mb-8"
          style={{
            maxWidth: '750px',
            fontSize: 'clamp(1rem, 2.5vw, 1.15rem)',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: '30px',
          }}
        >
          Manage products, track orders, monitor inventory, understand customers, and generate AI-powered business insights from a single intelligent platform.
        </motion.p>

        {/* Action Button CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '46px', flexWrap: 'wrap' }}
        >
          <button 
            onClick={handleConnectStore} 
            className="btn btn-primary" 
            style={{ 
              padding: '16px 34px',
              fontSize: '1.1rem',
              boxShadow: '0 0 30px rgba(168, 85, 247, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 0 50px rgba(168, 85, 247, 0.6)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(168, 85, 247, 0.3)'}
          >
            Connect Store <ArrowRight size={18} />
          </button>
          
          <a href="#features" className="btn btn-secondary" style={{ padding: '16px 34px', fontSize: '1.1rem' }} onClick={(e) => {
            e.preventDefault();
            const element = document.getElementById('features');
            if (element && window.lenis) {
              window.lenis.scrollTo(element, { offset: -80 });
            }
          }}>
            Explore Features
          </a>
        </motion.div>

        {/* 3D Dashboard Tilt Preview Area */}
        <div 
          ref={previewRef}
          className="cf-hero-dashboard-stage"
          style={{ 
            perspective: '1200px', 
            transformStyle: 'preserve-3d',
            width: '100%',
            maxWidth: '1380px',
            margin: '0 auto',
            position: 'relative'
          }}
        >
          <motion.div
            className="cf-dashboard-watermark"
            aria-hidden="true"
            style={{ scale: scrollScale, opacity: previewOpacity }}
          >
            CF
          </motion.div>

          {/* Parallax capsules removed for cleaner aesthetic */}

          {/* Main 3D Tilted Console Panel Wrapper for Scroll-driven transformations */}
          <motion.div
            className="cf-hero-dashboard-float"
            style={{
              rotateX: scrollRotateX,
              scale: scrollScale,
              translateZ: scrollTranslateZ,
              opacity: previewOpacity,
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Child Panel for Mouse-reactive tilt transformations */}
            <motion.div
              className="glass cf-hero-dashboard-panel"
              style={{
                rotateY: mouseRotateY,
                rotateX: mouseRotateX,
                transformStyle: 'preserve-3d',
                boxShadow: '0 54px 150px -28px rgba(0, 0, 0, 0.82), 0 24px 80px rgba(59, 130, 246, 0.14), 0 0 0 1px rgba(255, 255, 255, 0.1), 0 0 95px rgba(168, 85, 247, 0.16)',
                overflow: 'hidden',
                borderRadius: '22px',
                border: '1px solid rgba(255, 255, 255, 0.11)',
                display: 'flex',
                flexDirection: 'row',
                minHeight: '660px',
                background: 'linear-gradient(135deg, rgba(18, 18, 24, 0.86), rgba(7, 8, 13, 0.78))',
                backdropFilter: 'blur(34px)',
                WebkitBackdropFilter: 'blur(34px)',
              }}
            >
            
            {/* Vertical Sidebar Navigation */}
            <div className="cf-hero-workflow-sidebar" style={{ width: '310px', borderRight: '1px solid rgba(255,255,255,0.075)', padding: '34px 28px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div className="cf-hero-console-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '54px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src="/logo-full.png" alt="Commerce Flow" className="cf-hero-logo" style={{ width: '40px', height: '40px', objectFit: 'contain', flexShrink: 0 }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)' }}>CommerceFlow</div>
                    <div style={{ fontSize: '0.66rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '5px' }}>Command Center</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600 }}>
                  <span className="cf-active-pulse" />
                  Active
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '38px', position: 'relative' }}>
                {/* Glowing animated line connecting steps */}
                <div style={{ position: 'absolute', left: '23px', top: '27px', bottom: '27px', width: '2px', background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025))', zIndex: 0 }} />
                <div style={{ position: 'absolute', left: '23px', top: '27px', height: `${(activeStep - 1) * 33.33}%`, width: '2px', background: 'linear-gradient(180deg, var(--accent-purple), var(--accent-blue), var(--accent-cyan))', zIndex: 1, transition: 'height 0.45s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 0 18px rgba(168,85,247,0.8)' }} />

                {[
                  { id: 1, icon: Link2, label: 'Connect Store' },
                  { id: 2, icon: Upload, label: 'Import Products' },
                  { id: 3, icon: RefreshCw, label: 'Sync Orders' },
                  { id: 4, icon: BrainCircuit, label: 'AI Analysis' },
                ].map((step) => {
                  const isActive = activeStep === step.id;
                  const isPast = activeStep > step.id;
                  return (
                    <div 
                      key={step.id} 
                      onMouseEnter={() => setActiveStep(step.id)}
                      onClick={step.id === 1 ? handleConnectStore : undefined}
                      style={{ display: 'flex', alignItems: 'center', gap: '18px', zIndex: 2, cursor: 'pointer', transition: 'all 0.3s ease', opacity: isActive || isPast ? 1 : 0.55 }}
                    >
                      <div style={{ 
                        width: '48px', height: '48px', borderRadius: '14px', 
                        background: isActive ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.22), rgba(59, 130, 246, 0.14))' : isPast ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.045)', 
                        border: `1px solid ${isActive ? 'rgba(168, 85, 247, 0.52)' : 'rgba(255,255,255,0.04)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.3s ease',
                        boxShadow: isActive ? '0 0 28px rgba(168, 85, 247, 0.34), inset 0 1px 0 rgba(255,255,255,0.12)' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                        transform: isActive ? 'scale(1.1)' : 'scale(1)'
                      }}>
                        <step.icon size={23} style={{ color: isActive ? 'var(--accent-purple)' : 'var(--text-secondary)' }} />
                      </div>
                      <span style={{ fontSize: '0.98rem', fontWeight: isActive ? 750 : 550, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Content Area (Unified Dashboard Summary) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '36px', background: 'radial-gradient(circle at top right, rgba(168,85,247,0.07) 0%, transparent 62%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '34px', gap: '20px' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: '8px' }}>Unified Operations</div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Ecosystem Overview
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ShieldCheck size={14} style={{ color: 'var(--accent-purple)' }} /> Store Guard Active</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-green)' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-green)', display: 'inline-block', boxShadow: '0 0 6px var(--accent-green)' }} />
                    Live Sync
                  </span>
                </div>
              </div>

              {/* Data Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div className="glass" style={{ padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', backgroundColor: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    <DollarSign size={12} style={{ color: 'var(--accent-purple)' }} /> Total Revenue
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700 }}><AnimatedNumber value={isEmpty ? 0 : totalRevenue} isCurrency={true} prefix="$" /></div>
                </div>
                <div className="glass" style={{ padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', backgroundColor: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    <ClipboardList size={12} style={{ color: 'var(--accent-blue)' }} /> Total Orders
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700 }}><AnimatedNumber value={isEmpty ? 0 : totalOrdersCount} /></div>
                </div>
                <div className="glass" style={{ padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', backgroundColor: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    <ShoppingBag size={12} style={{ color: 'var(--accent-cyan)' }} /> Active Products
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700 }}><AnimatedNumber value={isEmpty ? 0 : activeProductsCount} /></div>
                </div>
              </div>

              {/* AI Insights & Trend Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', flex: 1 }}>
                <div className="glass" style={{ padding: '24px', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.15)', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, transparent 100%)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <BrainCircuit size={16} style={{ color: 'var(--accent-purple)' }} />
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase' }}>AI Engine Insights</h4>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6, flex: 1 }}>
                    {getAIInsight()}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.8rem', marginTop: '16px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: lowStockProducts.length > 0 ? '#f59e0b' : 'var(--accent-green)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {getInventoryStatus()}
                    </span>
                  </div>
                </div>

                <div className="glass" style={{ padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', backgroundColor: 'rgba(255,255,255,0.015)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase' }}>Revenue Trajectory</h4>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-green)' }}>+24.6%</span>
                  </div>
                  <div style={{ flexGrow: 1, position: 'relative', display: 'flex', alignItems: 'flex-end', minHeight: '120px' }}>
                    <svg style={{ width: '100%', height: '100%', position: 'absolute', bottom: 0, overflow: 'visible' }} viewBox="0 0 100 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="glowPurple2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent-purple)" stopOpacity="0.3"/>
                          <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      <path d="M 0 85 Q 15 65, 30 75 T 60 40 T 90 20 L 100 15 L 100 100 L 0 100 Z" fill="url(#glowPurple2)" />
                      <path d="M 0 85 Q 15 65, 30 75 T 60 40 T 90 20 L 100 15" fill="none" stroke="var(--accent-purple)" strokeWidth="3" />
                    </svg>
                  </div>
                </div>
              </div>

            </div>
            
            </motion.div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
