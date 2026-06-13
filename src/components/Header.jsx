import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { LayoutDashboard, Compass, Layers, ArrowRight } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'features', label: 'Features' },
  { id: 'showcase', label: 'Showcase' },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'testimonials', label: 'Testimonials' },
];

export default function Header({ activeView, setActiveView }) {
  const { scrollYProgress } = useScroll();
  const [activeSection, setActiveSection] = useState('hero');

  const scrollToSection = (id) => {
    if (activeView !== 'landing') {
      setActiveView('landing');
      // Wait briefly for render before scrolling
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element && window.lenis) {
          window.lenis.scrollTo(element, { offset: -80 });
        } else if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element && window.lenis) {
        window.lenis.scrollTo(element, { offset: -80 });
      } else if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  useEffect(() => {
    if (activeView !== 'landing') return undefined;

    const updateActiveSection = () => {
      const sections = ['hero', ...NAV_ITEMS.map(item => item.id)]
        .map(id => ({ id, element: document.getElementById(id) }))
        .filter(item => item.element);
      const current = [...sections].reverse().find(({ element }) => element.getBoundingClientRect().top <= 120);
      setActiveSection(current?.id || 'hero');
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    return () => window.removeEventListener('scroll', updateActiveSection);
  }, [activeView]);

  return (
    <>
      <motion.div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-blue))',
          transformOrigin: '0%',
          scaleX: scrollYProgress,
          zIndex: 60
        }}
      />
      <header className="cf-header">
      <div 
        className="container flex items-center justify-between w-full" 
        style={{ 
          display: 'flex', 
          width: '100%', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          maxWidth: activeView === 'dashboard' ? '1480px' : '1200px',
          transition: 'max-width 0.3s ease'
        }}
      >
        {/* Logo and Wordmark Branding Container */}
        <div 
          onClick={() => scrollToSection('hero')} 
          className="cf-brand-mark" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            cursor: 'pointer',
            padding: 0,
            alignSelf: 'center'
          }}
        >
          <img
            src="/logo-full.png"
            alt="CommerceFlow Logo"
            className="cf-navbar-logo"
            fetchpriority="high"
            loading="eager"
            decoding="async"
            width="120"
            height="32"
          />
          <span className="cf-navbar-text">CommerceFlow</span>
        </div>

        {/* Navigation Links */}
        {activeView === 'landing' && (
          <nav className="cf-navbar-links">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`cf-nav-link ${activeSection === item.id ? 'is-active' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}

        {/* View Toggle */}
        <div>
          {activeView === 'landing' ? (
            <button 
              onClick={() => setActiveView('dashboard')}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '8px 18px' }}
            >
              <LayoutDashboard size={14} />
              Launch Console
              <ArrowRight size={14} />
            </button>
          ) : (
            <button 
              onClick={() => setActiveView('landing')}
              className="cf-btn-back"
            >
              <Compass size={14} />
              Back to Site
            </button>
          )}
        </div>
      </div>
      </header>
    </>
  );
}
