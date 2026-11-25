import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export const CustomCursor: React.FC = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    gsap.set(dot, { xPercent: -50, yPercent: -50 });
    gsap.set(ring, { xPercent: -50, yPercent: -50 });

    const xDot = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3.out' });
    const yDot = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3.out' });
    const xRing = gsap.quickTo(ring, 'x', { duration: 0.22, ease: 'power3.out' });
    const yRing = gsap.quickTo(ring, 'y', { duration: 0.22, ease: 'power3.out' });

    const onMove = (e: MouseEvent) => {
      xDot(e.clientX);
      yDot(e.clientY);
      xRing(e.clientX);
      yRing(e.clientY);

      const target = e.target as HTMLElement | null;
      const interactive = target?.closest('[data-cursor]');
      if (interactive) {
        const customText = interactive.getAttribute('data-cursor');
        setHoveredLabel(customText && customText.trim().length > 0 ? customText : null);
      } else {
        setHoveredLabel(null);
      }
    };

    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <>
      <div ref={dotRef} className="keltic-cursor-dot" />
      <div
        ref={ringRef}
        className={`keltic-cursor-ring ${hoveredLabel ? 'is-active' : ''}`}
      >
        {hoveredLabel && <span className="keltic-cursor-label">{hoveredLabel}</span>}
      </div>
    </>
  );
};

