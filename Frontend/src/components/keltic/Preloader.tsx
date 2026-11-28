import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { triggerShatterBurst } from './ShatterCanvas';

interface PreloaderProps {
  onComplete: () => void;
}

interface VortexParticle {
  r: number; // Distancia radial al centro
  angle: number; // Ángulo polar
  angularSpeed: number; // Velocidad de rotación
  radialSpeed: number; // Velocidad de succión hacia el centro
  size: number;
  type: 'spark' | 'glass' | 'dust';
  color: string;
  alpha: number;
  spin: number;
  spinSpeed: number;
  aspect: number;
}

export const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const centerHudRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const cx = () => width / 2;
    const cy = () => height / 2;
    const maxRadius = () => Math.hypot(width, height) * 0.65;

    // Crear partículas de demolición optimizadas (chispas, esquirlas y polvo)
    const particleCount = 1000;
    const particles: VortexParticle[] = [];
    const sparkColors = ['#FFF7D6', '#FFD166', '#FF6B00', '#FF2A2A', '#FFFFFF'];

    for (let i = 0; i < particleCount; i++) {
      const typeRand = Math.random();
      const type: 'spark' | 'glass' | 'dust' =
        typeRand < 0.45 ? 'spark' : typeRand < 0.8 ? 'glass' : 'dust';

      particles.push({
        r: Math.random() * maxRadius() + 15,
        angle: Math.random() * Math.PI * 2,
        angularSpeed: (Math.random() * 0.022 + 0.008) * (Math.random() > 0.05 ? 1 : -1),
        radialSpeed: Math.random() * 2.2 + 0.8,
        size:
          type === 'spark'
            ? Math.random() * 2.8 + 1.2
            : type === 'glass'
              ? Math.random() * 5.0 + 2.0
              : Math.random() * 1.8 + 0.8,
        type,
        color:
          type === 'spark'
            ? sparkColors[Math.floor(Math.random() * sparkColors.length)]
            : type === 'glass'
              ? 'rgba(244, 243, 239, 0.85)'
              : 'rgba(180, 180, 195, 0.4)',
        alpha: Math.random() * 0.7 + 0.3,
        spin: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 0.12,
        aspect: type === 'glass' ? Math.random() * 1.6 + 0.5 : 1.0,
      });
    }

    // GSAP Timeline: Comienza lento y atmosférico, acelera progresivamente
    // y culmina en la implosión y onda expansiva
    let isImploding = false;
    const animState = { val: 0, vortexIntensity: 0.55, coreGlow: 0.1 };

    const tl = gsap.timeline();

    tl.to(animState, {
      val: 100,
      coreGlow: 1.0,
      vortexIntensity: 3.8,
      duration: 3.0,
      ease: 'power3.in', // Arranca lento/suspenso y acelera agresivamente hacia el final
      onUpdate: () => {
        setProgress(Math.round(animState.val));
      },
      onComplete: () => {
        // Fase de Implosión: colapso centrípeto de milisegundos hacia el centro
        isImploding = true;

        if (centerHudRef.current) {
          gsap.to(centerHudRef.current, {
            scale: 0.08,
            opacity: 0,
            duration: 0.32,
            ease: 'expo.in',
          });
        }

        gsap.to(containerRef.current, {
          opacity: 0,
          scale: 1.12,
          duration: 0.45,
          delay: 0.22,
          ease: 'power3.inOut',
          onStart: () => {
            // Disparar chispazo de choque en el centro exacto
            triggerShatterBurst(width / 2, height / 2);
          },
          onComplete: () => {
            onComplete();
          },
        });
      },
    });

    let rafId = 0;

    const render = () => {
      // Fondo con ligero rastro de desvanecimiento para estela de velocidad (Motion Blur)
      ctx.fillStyle = 'rgba(7, 7, 9, 0.30)';
      ctx.fillRect(0, 0, width, height);

      const centerX = cx();
      const centerY = cy();
      const intensity = animState.vortexIntensity;

      // 1. Ojo del Vórtice: Núcleo de calor incandescente
      const coreRadius = isImploding ? 6 : 95 + animState.val * 0.85;
      const coreGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        4,
        centerX,
        centerY,
        coreRadius
      );
      coreGrad.addColorStop(0, `rgba(255, 235, 190, ${0.5 * animState.coreGlow})`);
      coreGrad.addColorStop(0.25, `rgba(255, 75, 25, ${0.38 * animState.coreGlow})`);
      coreGrad.addColorStop(0.65, `rgba(180, 0, 20, ${0.2 * animState.coreGlow})`);
      coreGrad.addColorStop(1, 'rgba(7, 7, 9, 0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Renderizado de alto rendimiento sin shadowBlur ni save/restore por partícula
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (isImploding) {
          // Implosión final hacia el punto (0, 0)
          p.r -= p.r * 0.24 + 10;
          p.angle += 0.28;
        } else {
          // Velocidad angular que aumenta conforme se acerca al centro (vórtice real)
          const tangentialBoost = (160 / Math.max(16, p.r)) * 0.016 * intensity;
          p.angle += p.angularSpeed + tangentialBoost;

          // Succión centrípeta hacia el núcleo
          const pull = (p.radialSpeed + (130 / Math.max(18, p.r)) * 0.75) * intensity;
          p.r -= pull;

          // Re-generar partículas absorbidas en el perímetro exterior
          if (p.r < 12) {
            p.r = maxRadius() * (0.85 + Math.random() * 0.3);
            p.angle = Math.random() * Math.PI * 2;
          }
        }

        const px = centerX + Math.cos(p.angle) * p.r;
        const py = centerY + Math.sin(p.angle) * p.r;
        p.spin += p.spinSpeed;

        if (p.type === 'spark') {
          // Chispa con cola direccional estirada
          const tailAngle = p.angle - p.angularSpeed * 3.2;
          const tailX = centerX + Math.cos(tailAngle) * (p.r + 3.2);
          const tailY = centerY + Math.sin(tailAngle) * (p.r + 3.2);

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(tailX, tailY);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.globalAlpha = p.alpha;
          ctx.stroke();
        } else if (p.type === 'glass') {
          // Esquirla de cristal dibujada con trigonometría directa (sin overhead de ctx.save/restore)
          const cosS = Math.cos(p.spin);
          const sinS = Math.sin(p.spin);
          const sX = p.size * p.aspect;
          const sY = p.size;

          const x0 = px + (-sX * 0.7 * cosS - -sY * 0.6 * sinS);
          const y0 = py + (-sX * 0.7 * sinS + -sY * 0.6 * cosS);
          const x1 = px + (sX * 1.1 * cosS);
          const y1 = py + (sX * 1.1 * sinS);
          const x2 = px + (-sX * 0.4 * cosS - sY * 0.8 * sinS);
          const y2 = py + (-sX * 0.4 * sinS + sY * 0.8 * cosS);

          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.closePath();
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha * 0.75;
          ctx.fill();
        } else {
          // Escombro/polvo industrial
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha * 0.45;
          ctx.fill();
        }
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      tl.kill();
    };
  }, [onComplete]);

  const statusText =
    progress < 30
      ? 'CONCENTRANDO CAMPO CINÉTICO DE DEMOLICIÓN...'
      : progress < 65
        ? 'ABSORBIENDO PRESIÓN ACÚSTICA DE IMPACTO...'
        : progress < 95
          ? 'SELLANDO BÓVEDA // CARGANDO ARSENAL PESADO...'
          : 'DESCARGA INMINENTE // INICIAR DEMOLICIÓN';

  return (
    <div ref={containerRef} className="keltic-preloader" style={{ padding: 0, overflow: 'hidden' }}>
      {/* 1. LIENZO DEL VÓRTICE DE DEMOLICIÓN A PANTALLA COMPLETA */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      {/* 2. HUD DE TELEMETRÍA SUPERIOR */}
      <div
        className="preloader-top-bar"
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '2rem 3rem',
          pointerEvents: 'none',
        }}
      >
        <span>SMASHZONE // VÓRTICE DE DEMOLICIÓN</span>
        <span style={{ color: 'var(--accent-volt)' }}>
          PRESIÓN ACÚSTICA: {(progress * 1.25).toFixed(0)} dB
        </span>
        <span>LIMA, PERÚ</span>
      </div>

      {/* 3. OJO CENTRAL DEL VÓRTICE: NÚCLEO DE CARGA Y TELEMETRÍA */}
      <div
        ref={centerHudRef}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          textAlign: 'center',
          pointerEvents: 'none',
          maxWidth: '560px',
          width: '90%',
        }}
      >
        <div className="preloader-tag" style={{ textShadow: '0 0 16px rgba(255, 42, 42, 0.8)' }}>
          // VÓRTICE DE COMPRESIÓN DE ADRENALINA
        </div>

        <div
          className="preloader-counter"
          style={{
            textShadow: '0 0 32px rgba(255, 42, 42, 0.6), 0 0 70px rgba(255, 107, 0, 0.3)',
            filter: 'drop-shadow(0 0 18px rgba(255, 230, 180, 0.4))',
          }}
        >
          {String(progress).padStart(3, '0')}
          <span className="preloader-pct">%</span>
        </div>

        <div
          className="preloader-status"
          style={{
            marginTop: '0.8rem',
            color: 'var(--text-primary)',
            textShadow: '0 0 10px rgba(0, 0, 0, 0.9)',
          }}
        >
          {statusText}
        </div>
      </div>

      {/* 4. HUD INFERIOR */}
      <div
        className="preloader-bottom-bar"
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '2rem 3rem',
          pointerEvents: 'none',
        }}
      >
        <span>EQUIPO DE PROTECCIÓN INTEGRAL INCLUIDO</span>
        <span style={{ color: 'var(--accent-rage)' }}>
          ● BÓVEDAS ACÚSTICAS ACTIVAS
        </span>
      </div>
    </div>
  );
};
