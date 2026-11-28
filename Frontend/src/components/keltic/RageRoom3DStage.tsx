import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { triggerShatterBurst } from './ShatterCanvas';

interface RageRoom3DStageProps {
  scrollProgress: number; // 0.0 -> 1.0 controlado exclusivamente por el scroll (Lenis)
  smashSignal: number;
}

// Interpolación suave (smoothstep) para transiciones limpias entre capítulos
function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export const RageRoom3DStage: React.FC<RageRoom3DStageProps> = ({
  scrollProgress,
  smashSignal,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  const stateRef = useRef<{
    hammerGroup?: any;
    scrollProgress: number;
    isSwinging: boolean;
  }>({
    scrollProgress: 0,
    isSwinging: false,
  });

  stateRef.current.scrollProgress = scrollProgress;

  const normalizeAndCenter = (THREE: any, obj: any, desiredSize: number) => {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const scale = desiredSize / maxDim;

    const wrapper = new THREE.Group();
    // Desplazamos el eje vertical hacia abajo (-size.y * 0.15) para que el cabezal de acero
    // del mazo quede perfectamente enmarcado y visible en el tercio superior de la pantalla
    obj.position.set(
      -center.x * scale,
      (-center.y - size.y * 0.15) * scale,
      -center.z * scale
    );
    obj.scale.setScalar(scale);
    wrapper.add(obj);
    return wrapper;
  };

  useEffect(() => {
    let disposed = false;
    let rafId = 0;
    let rendererInstance: any = null;

    async function initThree() {
      const container = mountRef.current;
      if (!container) return;

      const THREE = await import(
        /* @vite-ignore */ 'https://esm.sh/three@0.170.0'
      );
      const { GLTFLoader } = await import(
        /* @vite-ignore */ 'https://esm.sh/three@0.170.0/examples/jsm/loaders/GLTFLoader.js'
      );

      if (disposed || !mountRef.current) return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
      camera.position.set(0, 0, 6.2);

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.5;
      rendererInstance = renderer;

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      // Iluminación dramática sobre el acero y la madera del mazo
      const ambient = new THREE.AmbientLight(0xffffff, 1.45);
      scene.add(ambient);

      const keyLight = new THREE.DirectionalLight(0xfff5eb, 3.6);
      keyLight.position.set(4, 6, 5);
      scene.add(keyLight);

      const crimsonRim = new THREE.PointLight(0xff2a2a, 12, 18);
      crimsonRim.position.set(-3.5, 2.2, 2.8);
      scene.add(crimsonRim);

      const emberFill = new THREE.PointLight(0xff6b00, 7.5, 15);
      emberFill.position.set(3.2, -2.2, 3.0);
      scene.add(emberFill);

      const hammerGroup = new THREE.Group();
      scene.add(hammerGroup);
      stateRef.current.hammerGroup = hammerGroup;

      // Cargar ÚNICAMENTE el Mazo Principal (bloody_sledgehammer)
      const loader = new GLTFLoader();
      loader.load('/models/bloody_sledgehammer/scene.gltf', (gltf: any) => {
        if (disposed) return;
        const normalizedHammer = normalizeAndCenter(THREE, gltf.scene, 3.55);
        hammerGroup.clear();
        hammerGroup.add(normalizedHammer);
      });

      // ======================================================================
      // RUTA CINEMATOGRÁFICA DINÁMICA: GRAN ZOOM MACRO AL CABEZAL 100% EN PANTALLA
      // Coordenadas reencuadradas hacia el centro (x: ~0.58 en derecha, x: ~-0.65 en izquierda)
      // para que el cabezal de acero NUNCA se corte por los bordes laterales de la pantalla
      // ======================================================================
      const CINEMATIC_WAYPOINTS = [
        // 0. (0.00) Portada Inicio: Vista completa 3/4 a la derecha
        { p: 0.00, x: 1.45, y: -0.45, z: 0.85, rx: 0.28, ry: -0.55, rz: -0.42, scale: 1.0 },

        // 1. (0.16) Portada Clímax: ¡GRAN ZOOM AL CABEZAL TOTALMENTE VISIBLE!
        // Desplazado a x: 0.58 (más al centro) para que todo el bloque de acero quede 100% dentro
        { p: 0.16, x: 0.58, y: -1.05, z: 2.75, rx: 0.50, ry: -0.85, rz: -0.25, scale: 1.45 },

        // 2. (0.33) Cruce a Cámaras: Retorno fluido a plano general viajando a la izquierda
        { p: 0.33, x: -1.55, y: -0.40, z: 1.15, rx: 0.85, ry: 1.85, rz: 0.35, scale: 1.0 },

        // 3. (0.48) Cámaras Clímax: ¡GRAN ZOOM FRONTAL A LA CARA DE IMPACTO!
        // Centrado en x: -0.65 para no tocar el borde izquierdo
        { p: 0.48, x: -0.65, y: -1.05, z: 2.70, rx: 1.15, ry: 3.15, rz: 0.35, scale: 1.42 },

        // 4. (0.64) Cruce a Paquetes: Retorno fluido a vista panorámica viajando a la derecha
        { p: 0.64, x: 1.55, y: -0.42, z: 1.10, rx: 0.40, ry: 4.80, rz: -0.45, scale: 1.0 },

        // 5. (0.78) Paquetes Clímax: ¡GRAN ZOOM EN ÁNGULO AGRESIVO DE REMATE!
        // Reencuadrado a x: 0.60 para que la cabeza quede limpia en el área derecha
        { p: 0.78, x: 0.60, y: -1.05, z: 2.75, rx: 0.75, ry: 6.20, rz: -0.28, scale: 1.45 },

        // 6. (0.91) Entrada a Arsenal: Retorno suave alejándose hacia la izquierda
        { p: 0.91, x: -1.60, y: -0.55, z: 1.20, rx: 0.30, ry: 7.40, rz: 0.18, scale: 1.0 },

        // 7. (1.00) Arsenal & Final: Vista vertical monumental completa bajo el navbar
        { p: 1.00, x: -1.75, y: -0.62, z: 1.05, rx: 0.08, ry: 8.10, rz: 0.08, scale: 1.0 },
      ];

      const computeCinematicPose = (progress: number) => {
        const clamped = Math.max(0, Math.min(1, progress));
        const pts = CINEMATIC_WAYPOINTS;

        // Buscar el segmento activo
        let i = 0;
        while (i < pts.length - 1 && clamped > pts[i + 1].p) {
          i++;
        }
        if (i >= pts.length - 1) {
          return pts[pts.length - 1];
        }

        const p0 = pts[i];
        const p1 = pts[i + 1];
        const range = Math.max(0.0001, p1.p - p0.p);
        const localT = (clamped - p0.p) / range;
        // Curva coseno suave para tangentes continuas sin tirones
        const ease = 0.5 - 0.5 * Math.cos(localT * Math.PI);

        return {
          x: lerp(p0.x, p1.x, ease),
          y: lerp(p0.y, p1.y, ease),
          z: lerp(p0.z, p1.z, ease),
          rx: lerp(p0.rx, p1.rx, ease),
          ry: lerp(p0.ry, p1.ry, ease),
          rz: lerp(p0.rz, p1.rz, ease),
          scale: lerp(p0.scale, p1.scale, ease),
        };
      };

      const renderLoop = () => {
        if (disposed) return;
        const st = stateRef.current;
        const p = Math.max(0, Math.min(1, st.scrollProgress));

        if (hammerGroup && !st.isSwinging) {
          const targetPose = computeCinematicPose(p);

          // Respuesta elástica suave pero inmediata al scroll
          const followSpeed = 0.14;
          hammerGroup.position.x +=
            (targetPose.x - hammerGroup.position.x) * followSpeed;
          hammerGroup.position.y +=
            (targetPose.y - hammerGroup.position.y) * followSpeed;
          hammerGroup.position.z +=
            (targetPose.z - hammerGroup.position.z) * followSpeed;

          hammerGroup.rotation.x +=
            (targetPose.rx - hammerGroup.rotation.x) * followSpeed;
          hammerGroup.rotation.y +=
            (targetPose.ry - hammerGroup.rotation.y) * followSpeed;
          hammerGroup.rotation.z +=
            (targetPose.rz - hammerGroup.rotation.z) * followSpeed;

          // Animación suave de escala combinada con Z para un zoom masivo del cabezal
          const currentScale = hammerGroup.scale.x;
          const nextScale =
            currentScale + (targetPose.scale - currentScale) * followSpeed;
          hammerGroup.scale.set(nextScale, nextScale, nextScale);
        }

        renderer.render(scene, camera);
        rafId = requestAnimationFrame(renderLoop);
      };

      rafId = requestAnimationFrame(renderLoop);

      const handleResize = () => {
        const nw = window.innerWidth;
        const nh = window.innerHeight;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      };
      window.addEventListener('resize', handleResize);
    }

    initThree();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      if (rendererInstance) rendererInstance.dispose();
    };
  }, []);

  // Animación de golpe de mazo cuando el usuario presiona un botón de acción
  useEffect(() => {
    if (smashSignal === 0) return;
    const { hammerGroup } = stateRef.current;
    if (!hammerGroup || stateRef.current.isSwinging) return;

    stateRef.current.isSwinging = true;

    const origPos = {
      x: hammerGroup.position.x,
      y: hammerGroup.position.y,
      z: hammerGroup.position.z,
    };
    const origRot = {
      x: hammerGroup.rotation.x,
      y: hammerGroup.rotation.y,
      z: hammerGroup.rotation.z,
    };

    const tl = gsap.timeline({
      onComplete: () => {
        stateRef.current.isSwinging = false;
      },
    });

    tl.to(hammerGroup.position, {
      y: origPos.y + 0.65,
      z: origPos.z + 0.5,
      duration: 0.14,
      ease: 'power2.out',
    })
      .to(
        hammerGroup.rotation,
        {
          x: origRot.x - 0.75,
          z: origRot.z - 0.6,
          duration: 0.14,
          ease: 'power2.out',
        },
        '<'
      )
      .to(hammerGroup.position, {
        y: origPos.y - 0.25,
        z: origPos.z + 0.9,
        duration: 0.1,
        ease: 'expo.in',
        onComplete: () => {
          triggerShatterBurst(
            window.innerWidth * (origPos.x > 0 ? 0.68 : 0.32),
            window.innerHeight * 0.52
          );
        },
      })
      .to(
        hammerGroup.rotation,
        {
          x: origRot.x + 0.85,
          z: origRot.z + 0.55,
          duration: 0.1,
          ease: 'expo.in',
        },
        '<'
      )
      .to(hammerGroup.position, {
        x: origPos.x,
        y: origPos.y,
        z: origPos.z,
        duration: 0.38,
        ease: 'power3.out',
      })
      .to(
        hammerGroup.rotation,
        {
          x: origRot.x,
          y: origRot.y,
          z: origRot.z,
          duration: 0.38,
          ease: 'power3.out',
        },
        '<'
      );
  }, [smashSignal]);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 4,
      }}
    />
  );
};
