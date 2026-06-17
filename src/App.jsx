import { useState, useEffect, Suspense, lazy } from 'react';
import { SmoothScrollProvider } from './components/SmoothScroll';
import Header from './components/Header';
import HeroSection from './components/HeroSection';

const FeaturesSection = lazy(() => import('./components/FeaturesSection'));
const ShowcaseSection = lazy(() => import('./components/ShowcaseSection'));
const CapabilitiesSection = lazy(() => import('./components/CapabilitiesSection'));
const TestimonialsSection = lazy(() => import('./components/TestimonialsSection'));
const DashboardView = lazy(() => import('./components/DashboardView'));

function App() {
  const [activeView, setActiveView] = useState('landing'); // 'landing' | 'dashboard'

  useEffect(() => {
    let scrollTimer;

    const getScrollableParent = (start) => {
      let node = start;
      while (node && node !== document.body && node !== document.documentElement) {
        const style = window.getComputedStyle(node);
        const canScrollY = /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight;
        const canScrollX = /(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth;
        if (canScrollY || canScrollX) return node;
        node = node.parentElement;
      }
      return null;
    };

    const handleWheel = (event) => {
      const scrollable = getScrollableParent(event.target);
      if (!scrollable) return;

      scrollable.classList.add('is-scrolling');
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => scrollable.classList.remove('is-scrolling'), 700);

      if (event.shiftKey && scrollable.scrollWidth > scrollable.clientWidth) {
        scrollable.scrollLeft += event.deltaY;
      }
    };

    const handleKeyDown = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      const scrollable = getScrollableParent(document.activeElement) || document.scrollingElement;
      if (!scrollable) return;

      const page = Math.max(240, scrollable.clientHeight * 0.85);
      const moves = {
        ArrowDown: 56,
        ArrowUp: -56,
        PageDown: page,
        PageUp: -page,
        ' ': event.shiftKey ? -page : page,
        Home: -scrollable.scrollTop,
        End: scrollable.scrollHeight,
      };

      if (Object.prototype.hasOwnProperty.call(moves, event.key)) {
        event.preventDefault();
        scrollable.scrollBy({ top: moves[event.key], behavior: 'smooth' });
      }
    };

    document.addEventListener('wheel', handleWheel, { passive: true, capture: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(scrollTimer);
      document.removeEventListener('wheel', handleWheel, { capture: true });
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Automatically reset scroll position when changing between Landing Page and Dashboard
  useEffect(() => {
    if (window.lenis) {
      window.lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [activeView]);

  return (
    <SmoothScrollProvider>
      {/* Navigation header */}
      <Header activeView={activeView} setActiveView={setActiveView} />
      
      {/* View routing */}
      {activeView === 'landing' ? (
        <>
          <HeroSection setActiveView={setActiveView} />
          <Suspense fallback={<div style={{ minHeight: '50vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>Loading interface...</div>}>
            <FeaturesSection setActiveView={setActiveView} />
            <ShowcaseSection />
            <CapabilitiesSection />
            <TestimonialsSection />
          </Suspense>
        </>
      ) : (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>Loading dashboard...</div>}>
          <DashboardView />
        </Suspense>
      )}
    </SmoothScrollProvider>
  );
}

export default App;
