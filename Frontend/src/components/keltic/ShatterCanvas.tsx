import React, { useEffect, useRef } from 'react';

// ============================================================================
// MOTOR DE CORTES INCANDESCENTES, CHISPAS DE METAL Y GRIETAS DE IMPACTO
// Sin figuritas flotantes: fondo limpio que reacciona con cortes (slashes),
// chispas realistas con estela de velocidad (motion blur) y grietas de vidrio.
// ============================================================================

interface TrailPoint {
  x: number;
  y: number;
  life: number; // 1.0 -> 0.0
  width: number;
}

interface Spark {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  color: string;
  thickness: number;
}

interface CrackBranch {
  points: { x: number; y: number }[];
}

interface ImpactCrack {
  x: number;
  y: number;
  life: number;
  flash: number;
  branches: CrackBranch[];
}

export function triggerShatterBurst(x?: number, y?: number, _color = '#FF2A2A') {
  window.dispatchEvent(
    new CustomEvent('smashzone:impact', {
      detail: {
        x: x ?? window.innerWidth / 2,
        y: y ?? window.innerHeight / 2,
      },
    })
  );
}

function generateCrackBranches(cx: number, cy: number): CrackBranch[] {
  const branches: CrackBranch[] = [];
  const mainRays = Math.floor(Math.random() * 5) + 7; // 7 a 11 grietas principales

  for (let i = 0; i < mainRays; i++) {
    const baseAngle = (i / mainRays) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    const segments = Math.floor(Math.random() * 5) + 5;
    const pts: { x: number; y: number }[] = [{ x: cx, y: cy }];
    let currX = cx;
    let currY = cy;
    let angle = baseAngle;

    for (let s = 0; s < segments; s++) {
      const len = Math.random() * 28 + 14;
      angle += (Math.random() - 0.5) * 0.45;
      currX += Math.cos(angle) * len;
      currY += Math.sin(angle) * len;
      pts.push({ x: currX, y: currY });

      // Sub-ramificaciones de vidrio astillado
      if (s > 1 && Math.random() > 0.55) {
        const subAngle = angle + (Math.random() > 0.5 ? 0.65 : -0.65);
        const subLen = Math.random() * 26 + 10;
        branches.push({
          points: [
            { x: currX, y: currY },
            {
              x: currX + Math.cos(subAngle) * subLen,
              y: currY + Math.sin(subAngle) * subLen,
            },
          ],
        });
      }
    }
    branches.push({ points: pts });
  }

  // Anillos concéntricos irregulares de tensión en el vidrio
  const rings = 2;
  for (let r = 1; r <= rings; r++) {
    const radius = r * 26 + Math.random() * 12;
    const ringPts: { x: number; y: number }[] = [];
    const steps = 10;
    for (let k = 0; k <= steps; k++) {
      const a = (k / steps) * Math.PI * 2;
      const jitter = radius + (Math.random() - 0.5) * 9;
      ringPts.push({
        x: cx + Math.cos(a) * jitter,
        y: cy + Math.sin(a) * jitter,
      });
    }
    branches.push({ points: ringPts });
  }

  return branches;
}

export const ShatterCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const slashTrail: TrailPoint[] = [];
    const sparks: Spark[] = [];
    const cracks: ImpactCrack[] = [];

    const mouse = {
      x: width / 2,
      y: height / 2,
      prevX: width / 2,
      prevY: height / 2,
      active: false,
    };

    const spawnSparks = (x: number, y: number, count: number, baseVx = 0, baseVy = 0, power = 1) => {
      const sparkColors = ['#FFF7D6', '#FFD166', '#FF6B00', '#FF2A2A'];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 11 + 3.5) * power;
        const vx = baseVx * 0.2 + Math.cos(angle) * speed;
        const vy = baseVy * 0.2 + Math.sin(angle) * speed - Math.random() * 2;
        sparks.push({
          x,
          y,
          prevX: x,
          prevY: y,
          vx,
          vy,
          life: 1.0,
          decay: Math.random() * 0.022 + 0.015,
          color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
          thickness: Math.random() * 2.2 + 0.8,
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const vx = e.clientX - mouse.prevX;
      const vy = e.clientY - mouse.prevY;
      const speed = Math.hypot(vx, vy);

      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;

      // Agregar nodo a la estela de corte (Slash)
      slashTrail.push({
        x: e.clientX,
        y: e.clientY,
        life: 1.0,
        width: Math.min(14, Math.max(2.5, speed * 0.28)),
      });

      // Si el corte es rápido, desprende chispas incandescentes de fricción
      if (speed > 14) {
        const sparkCount = Math.min(6, Math.floor(speed / 12));
        spawnSparks(e.clientX, e.clientY, sparkCount, vx, vy, 0.55);
      }
    };

    const triggerImpactAt = (ix: number, iy: number) => {
      cracks.push({
        x: ix,
        y: iy,
        life: 1.0,
        flash: 1.0,
        branches: generateCrackBranches(ix, iy),
      });
      spawnSparks(ix, iy, 42, 0, 0, 1.35);
      // Sin document.body.animate: evita romper stacking context y position:fixed del DOM
    };

    const handleCustomImpact = (e: Event) => {
      const custom = e as CustomEvent<{ x: number; y: number }>;
      triggerImpactAt(
        custom.detail?.x ?? width / 2,
        custom.detail?.y ?? height / 2
      );
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      // No generar grietas invasivas si el usuario está interactuando con controles de la web
      if (target?.closest('input, button, select, textarea, a, [role="button"], .keltic-modal')) {
        return;
      }
      triggerImpactAt(e.clientX, e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('smashzone:impact', handleCustomImpact);

    let rafId = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Iluminación atmosférica sutil de taller/búnker sobre el cursor
      if (mouse.active) {
        const glow = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          4,
          mouse.x,
          mouse.y,
          320
        );
        glow.addColorStop(0, 'rgba(255, 58, 32, 0.065)');
        glow.addColorStop(0.5, 'rgba(255, 107, 0, 0.02)');
        glow.addColorStop(1, 'rgba(7, 7, 9, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Dibujar Grietas de Impacto en Vidrio (Cracks)
      for (let i = cracks.length - 1; i >= 0; i--) {
        const c = cracks[i];
        c.life -= 0.008;
        c.flash = Math.max(0, c.flash - 0.08);

        if (c.life <= 0) {
          cracks.splice(i, 1);
          continue;
        }

        // Destello inicial de choque
        if (c.flash > 0) {
          const flashGrad = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 130);
          flashGrad.addColorStop(0, `rgba(255, 240, 200, ${c.flash * 0.55})`);
          flashGrad.addColorStop(0.4, `rgba(255, 42, 42, ${c.flash * 0.35})`);
          flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = flashGrad;
          ctx.beginPath();
          ctx.arc(c.x, c.y, 130, 0, Math.PI * 2);
          ctx.fill();
        }

        // Líneas de fractura de cristal
        ctx.save();
        ctx.strokeStyle = `rgba(244, 243, 239, ${c.life * 0.55})`;
        ctx.shadowColor = 'rgba(255, 42, 42, 0.6)';
        ctx.shadowBlur = 6;
        ctx.lineWidth = 1.25;

        for (const branch of c.branches) {
          if (branch.points.length < 2) continue;
          ctx.beginPath();
          ctx.moveTo(branch.points[0].x, branch.points[0].y);
          for (let p = 1; p < branch.points.length; p++) {
            ctx.lineTo(branch.points[p].x, branch.points[p].y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // 3. Dibujar Estela de Corte Incandescente (Blade / Crowbar Slash Trail)
      if (slashTrail.length > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < slashTrail.length; i++) {
          const p0 = slashTrail[i - 1];
          const p1 = slashTrail[i];

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);

          // Halo exterior rojo/ámbar de calor
          ctx.strokeStyle = `rgba(255, 42, 42, ${p1.life * 0.55})`;
          ctx.lineWidth = p1.width * p1.life * 1.8;
          ctx.stroke();

          // Núcleo incandescente blanco/amarillo de corte
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = `rgba(255, 235, 180, ${p1.life * 0.9})`;
          ctx.lineWidth = Math.max(1, p1.width * p1.life * 0.55);
          ctx.stroke();
        }
        ctx.restore();
      }

      for (let i = slashTrail.length - 1; i >= 0; i--) {
        slashTrail[i].life -= 0.075;
        if (slashTrail[i].life <= 0) {
          slashTrail.splice(i, 1);
        }
      }

      // 4. Dibujar Chispas de Impacto y Fricción con Motion Blur lineal
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';

      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.prevX = sp.x;
        sp.prevY = sp.y;

        sp.vx *= 0.95; // Fricción del aire
        sp.vy = sp.vy * 0.95 + 0.34; // Gravedad real hacia el suelo
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life -= sp.decay;

        // Rebote contra el borde inferior de la pantalla
        if (sp.y >= height - 4 && sp.vy > 0) {
          sp.y = height - 4;
          sp.vy *= -0.45;
          sp.vx *= 0.75;
        }

        if (sp.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.moveTo(sp.prevX, sp.prevY);
        ctx.lineTo(sp.x, sp.y);
        ctx.strokeStyle = sp.color;
        ctx.globalAlpha = sp.life;
        ctx.lineWidth = sp.thickness * sp.life;
        ctx.stroke();
      }
      ctx.restore();

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('smashzone:impact', handleCustomImpact);
    };
  }, []);

  return <canvas ref={canvasRef} className="keltic-shatter-canvas" />;
};
