import React, { useEffect, useRef } from 'react';
import { useSmoothScroll } from './SmoothScroll';

export default function ParticleCanvas() {
  const canvasRef = useRef(null);
  const lenis = useSmoothScroll();
  const velocityRef = useRef(0);

  useEffect(() => {
    if (!lenis) return;
    
    const handleScroll = (e) => {
      // e.velocity provides the scrolling rate
      velocityRef.current = e.velocity * 0.8;
    };
    
    lenis.on('scroll', handleScroll);
    return () => {
      lenis.off('scroll', handleScroll);
    };
  }, [lenis]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Populate particles
    const particles = [];
    const particleCount = 75;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.6 + 0.4,
        baseSpeedY: Math.random() * 0.15 + 0.05, // Drifts slowly up
        speedX: (Math.random() - 0.5) * 0.12,
        // Alternate colors (purple accent vs blue accent)
        color: Math.random() > 0.5 ? 'rgba(168, 85, 247,' : 'rgba(59, 130, 246,',
        opacity: Math.random() * 0.35 + 0.1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Damp scroll velocity back to baseline drift
      velocityRef.current *= 0.94;

      particles.forEach((p) => {
        // Move particle based on drift + scrolling
        p.y -= (p.baseSpeedY + velocityRef.current);
        p.x += p.speedX;

        // Reset positions at edges with random offsets
        if (p.y < -20) {
          p.y = height + 20;
          p.x = Math.random() * width;
        } else if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
        }

        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;

        // Render particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color} ${p.opacity})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="vfx-canvas" />;
}
