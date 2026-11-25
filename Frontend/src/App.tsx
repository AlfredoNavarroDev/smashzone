import React, { useEffect, useMemo, useRef, useState } from 'react';
import Lenis from 'lenis';
import {
  AlertTriangle,
  Calendar,
  Clock,
  CreditCard,
  Flame,
  Hammer,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  AdminUsuarioDTO,
  EstadoReservaNombre,
  IngresoMesDTO,
  ItemExtraDTO,
  PaqueteDTO,
  PaqueteDemandaDTO,
  ReservaDetalleDTO,
  RolNombre,
  SalaDTO,
  UsuarioDTO,
  VoucherDTO,
} from './types/api.types';
import { ApiDomainError, smashzoneApi } from './api/smashzoneApi';
import { Preloader } from './components/keltic/Preloader';
import {
  ShatterCanvas,
  triggerShatterBurst,
} from './components/keltic/ShatterCanvas';
import { CustomCursor } from './components/keltic/CustomCursor';
import { RageRoom3DStage } from './components/keltic/RageRoom3DStage';

const DEMO_ACCOUNTS: Record<RolNombre, { email: string; password: string }> = {
  Cliente: { email: 'ana@correo.com', password: 'Password1!' },
  Staff: { email: 'staff@smashzone.pe', password: 'Staff123!' },
  Admin: { email: 'admin@smashzone.pe', password: 'Admin123!' },
};

function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

export const App: React.FC = () => {
  const [booted, setBooted] = useState(false);

  // Progreso maestro del scroll (0.00 -> 1.00) controlado por Lenis
  const [scrollProgress, setScrollProgress] = useState(0);
  const lenisRef = useRef<Lenis | null>(null);
  const [smashSignal, setSmashSignal] = useState<number>(0);

  // Autenticación y sesión
  const [token, setToken] = useState<string | null>('jwt-smashzone-cliente');
  const [currentUser, setCurrentUser] = useState<UsuarioDTO>({
    id: 'c0000000-0000-0000-0000-000000000003',
    nombre: 'Ana',
    apellido: 'García',
    email: 'ana@correo.com',
    telefono: '999888777',
    documentoIdentidad: '70192834',
    rol: 'Cliente',
    activo: true,
    fechaRegistro: '2026-10-05T18:20:00Z',
  });

  // Catálogo
  const [salas, setSalas] = useState<SalaDTO[]>([]);
  const [paquetes, setPaquetes] = useState<PaqueteDTO[]>([]);
  const [inventario, setInventario] = useState<ItemExtraDTO[]>([]);

  // Configurador de Reserva y Pago
  const [selectedSalaId, setSelectedSalaId] = useState<number>(1);
  const [selectedPaqueteId, setSelectedPaqueteId] = useState<number>(2);
  const [numParticipantes, setNumParticipantes] = useState<number>(2);
  const [fechaInput, setFechaInput] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [horaInput, setHoraInput] = useState<string>('19:00');
  const [notasEspeciales, setNotasEspeciales] = useState<string>(
    'Playlist Heavy Metal / Industrial + Mazo de Demolición 5kg'
  );
  const [extrasCarrito, setExtrasCarrito] = useState<Record<number, number>>({
    1: 1,
    4: 1,
  });

  // Sub-pestañas en el Capítulo 4 (Arsenal / Reservar / Sesiones / Admin)
  const [finalStageTab, setFinalStageTab] = useState<
    'arsenal' | 'reservar' | 'sesiones' | 'admin'
  >('arsenal');

  // Reservas y Pagos
  const [reservas, setReservas] = useState<ReservaDetalleDTO[]>([]);
  const [estadoReservaFiltro] = useState<EstadoReservaNombre | ''>('');
  const [reservaPendientePago, setReservaPendientePago] =
    useState<ReservaDetalleDTO | null>(null);
  const [culqiModoSim, setCulqiModoSim] = useState<'ok' | 'declined'>('ok');
  const [voucherEmitido, setVoucherEmitido] = useState<VoucherDTO | null>(null);

  // Reportes Admin
  const [ingresosMes, setIngresosMes] = useState<IngresoMesDTO[]>([]);
  const [paquetesDemanda, setPaquetesDemanda] = useState<PaqueteDemandaDTO[]>([]);
  const [usuariosAdmin, setUsuariosAdmin] = useState<AdminUsuarioDTO[]>([]);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  // ==========================================================================
  // LENIS SMOOTH SCROLL — IMPULSA EL MAZO Y LAS TRANSICIONES DE CAPÍTULOS
  // ==========================================================================
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', () => {
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const prog = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      setScrollProgress(prog);
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  const scrollToProgress = (targetPct: number) => {
    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight
    );
    lenisRef.current?.scrollTo(targetPct * maxScroll, { duration: 1.25 });
  };

  const cargarTodo = async (
    actor = currentUser,
    filtroEst = estadoReservaFiltro
  ) => {
    try {
      const [salasData, paqData, invData, resData] = await Promise.all([
        smashzoneApi.listarSalas(),
        smashzoneApi.listarPaquetes(),
        smashzoneApi.listarInventario(),
        smashzoneApi.listarReservas(actor, filtroEst, token),
      ]);
      setSalas(salasData);
      setPaquetes(paqData);
      setInventario(invData);
      setReservas(resData);

      if (actor.rol === 'Admin') {
        const [ing, dem, usrPag] = await Promise.all([
          smashzoneApi.reporteIngresosPorMes(undefined, undefined, token),
          smashzoneApi.reportePaqueteMasDemandado(undefined, undefined, token),
          smashzoneApi.listarUsuariosAdmin({}, token),
        ]);
        setIngresosMes(ing);
        setPaquetesDemanda(dem);
        setUsuariosAdmin(usrPag.items);
      }
    } catch (err) {
      if (err instanceof ApiDomainError) {
        setBannerMessage({ type: 'error', text: err.message });
      }
    }
  };

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, estadoReservaFiltro]);

  const cambiarRolDemo = async (rol: RolNombre) => {
    try {
      const creds = DEMO_ACCOUNTS[rol];
      const resp = await smashzoneApi.login(creds);
      setToken(resp.token);
      setCurrentUser(resp.usuario);
      if (rol === 'Admin') setFinalStageTab('admin');
      else if (rol === 'Staff') setFinalStageTab('sesiones');
      else setFinalStageTab('reservar');
      scrollToProgress(0.92);
      triggerShatterBurst(window.innerWidth / 2, 90);
    } catch (err) {
      if (err instanceof ApiDomainError) {
        setBannerMessage({ type: 'error', text: err.message });
      }
    }
  };

  // ==========================================================================
  // CURVA TRAPEZOIDAL DE TRANSICIÓN LIMPIA (ENTRADA -> MESETA ESTABLE -> SALIDA)
  // Evita que dos capítulos se encimen y ubica cada bloque en el lado opuesto al Mazo
  // ==========================================================================
  const computeCleanStageStyle = (
    enterStart: number,
    enterEnd: number,
    exitStart: number,
    exitEnd: number,
    side: 'left' | 'right'
  ): React.CSSProperties => {
    const p = scrollProgress;

    if (p < enterStart || p > exitEnd) {
      return {
        opacity: 0,
        pointerEvents: 'none',
        visibility: 'hidden',
        display: 'none',
      };
    }

    let opacity = 1;
    let offsetX = 0;
    let offsetY = 0;
    let scale = 1;
    let rotY = 0;

    const sign = side === 'left' ? -1 : 1;

    if (p < enterEnd) {
      // Fase de Entrada: viene desde el costado y abajo mientras el Mazo se acomoda en el lado opuesto
      const t = smoothstep(enterStart, enterEnd, p); // 0 -> 1
      const inv = 1 - t;
      opacity = t;
      offsetX = sign * 95 * inv;
      offsetY = 55 * inv;
      scale = 0.94 + 0.06 * t;
      rotY = -sign * 14 * inv;
    } else if (p > exitStart) {
      // Fase de Salida: se retira limpiamente antes de que el Mazo cruce hacia el otro lado
      const t = smoothstep(exitStart, exitEnd, p); // 0 -> 1
      opacity = 1 - t;
      offsetX = sign * 80 * t;
      offsetY = -55 * t;
      scale = 1 - 0.06 * t;
      rotY = sign * 12 * t;
    }

    return {
      opacity,
      pointerEvents: 'none', // La capa de pantalla completa no bloquea clics
      visibility: opacity <= 0.02 ? 'hidden' : 'visible',
      display: opacity <= 0.01 ? 'none' : 'flex',
      justifyContent: side === 'left' ? 'flex-start' : 'flex-end',
      transform: `translate3d(${offsetX.toFixed(1)}px, ${offsetY.toFixed(1)}px, 0px) scale(${scale.toFixed(3)}) rotateY(${rotY.toFixed(1)}deg)`,
    };
  };

  // Cálculos de reserva
  const salaSeleccionada = useMemo(
    () => salas.find((s) => s.id === selectedSalaId) || salas[0],
    [salas, selectedSalaId]
  );

  const paqueteSeleccionado = useMemo(
    () => paquetes.find((p) => p.id === selectedPaqueteId) || paquetes[0],
    [paquetes, selectedPaqueteId]
  );

  const cupoMaximoPermitido = useMemo(() => {
    if (!salaSeleccionada || !paqueteSeleccionado) return 4;
    return Math.min(
      salaSeleccionada.capacidadMaxima,
      paqueteSeleccionado.maxParticipantes
    );
  }, [salaSeleccionada, paqueteSeleccionado]);

  const fechaHoraInicioIso = useMemo(() => {
    try {
      return new Date(`${fechaInput}T${horaInput}:00Z`).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }, [fechaInput, horaInput]);

  const fechaHoraFinCalculada = useMemo(() => {
    const dur = paqueteSeleccionado?.duracionMinutos || 45;
    const ini = new Date(fechaHoraInicioIso).getTime();
    return new Date(ini + dur * 60000).toISOString();
  }, [fechaHoraInicioIso, paqueteSeleccionado]);

  const desgloseCarrito = useMemo(() => {
    const items: { item: ItemExtraDTO; cantidad: number; subtotal: number }[] =
      [];
    let montoExtras = 0;

    for (const [idStr, cant] of Object.entries(extrasCarrito)) {
      if (cant <= 0) continue;
      const item = inventario.find((i) => i.id === Number(idStr));
      if (item && item.activo) {
        const sub = Number((item.precioUnitario * cant).toFixed(2));
        montoExtras += sub;
        items.push({ item, cantidad: cant, subtotal: sub });
      }
    }

    const montoPaquete = paqueteSeleccionado?.precio || 0;
    const montoTotal = Number((montoPaquete + montoExtras).toFixed(2));
    return { items, montoPaquete, montoExtras, montoTotal };
  }, [extrasCarrito, inventario, paqueteSeleccionado]);

  const solapamientoDetectado = useMemo(() => {
    if (!salaSeleccionada) return null;
    const iniMs = new Date(fechaHoraInicioIso).getTime();
    const finMs = new Date(fechaHoraFinCalculada).getTime();
    return reservas.find((r) => {
      if (r.idSala !== salaSeleccionada.id || r.estado === 'Cancelada')
        return false;
      const rIni = new Date(r.fechaHoraInicio).getTime();
      const rFin = new Date(r.fechaHoraFin).getTime();
      return iniMs < rFin && finMs > rIni;
    });
  }, [salaSeleccionada, fechaHoraInicioIso, fechaHoraFinCalculada, reservas]);

  const modificarExtraCantidad = (idItem: number, delta: number) => {
    const item = inventario.find((i) => i.id === idItem);
    if (!item) return;
    setExtrasCarrito((prev) => {
      const actual = prev[idItem] || 0;
      const nuevo = Math.max(0, Math.min(item.stockDisponible, actual + delta));
      return { ...prev, [idItem]: nuevo };
    });
  };

  const handleCrearReserva = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerMessage(null);
    try {
      const extrasPayload = desgloseCarrito.items.map((x) => ({
        idItemExtra: x.item.id,
        cantidad: x.cantidad,
      }));

      const creada = await smashzoneApi.crearReserva(
        {
          idSala: selectedSalaId,
          idPaquete: selectedPaqueteId,
          fechaHoraInicio: fechaHoraInicioIso,
          numParticipantes,
          notasEspeciales,
          extras: extrasPayload,
        },
        currentUser,
        token
      );

      setReservaPendientePago(creada);
      setVoucherEmitido(null);
      setExtrasCarrito({});
      await cargarTodo();
      setSmashSignal((s) => s + 1);
      setBannerMessage({
        type: 'success',
        text: `¡Reserva #${creada.id.slice(0, 8)} registrada! Completa el pago a la derecha para confirmar tu sesión.`,
      });
    } catch (err) {
      if (err instanceof ApiDomainError) {
        setBannerMessage({ type: 'error', text: err.message });
      }
    }
  };

  const handlePagarConCulqi = async (reservaId: string) => {
    setBannerMessage(null);
    try {
      const tokenSimulado =
        culqiModoSim === 'ok'
          ? `tkn_live_ok_${Math.random().toString(36).slice(2, 10)}`
          : 'tkn_test_declined_insufficient_funds';

      const voucher = await smashzoneApi.procesarPago(
        {
          idReserva: reservaId,
          idMetodoPago: 1,
          culqiToken: tokenSimulado,
        },
        currentUser,
        token
      );

      setVoucherEmitido(voucher);
      setReservaPendientePago(null);
      await cargarTodo();
      setSmashSignal((s) => s + 1);
      setBannerMessage({
        type: 'success',
        text: `¡Pago aprobado (${voucher.transaccionRef})! Sesión Confirmada.`,
      });
    } catch (err) {
      if (err instanceof ApiDomainError) {
        setBannerMessage({ type: 'error', text: err.message });
      }
    }
  };

  const currentStageLabel =
    scrollProgress < 0.28
      ? '01 // PORTADA DE IMPACTO'
      : scrollProgress < 0.58
        ? '02 // CÁMARAS DE DESTRUCCIÓN'
        : scrollProgress < 0.85
          ? '03 // PAQUETES DE FURIA'
          : '04 // ARSENAL Y RESERVAS';

  return (
    <>
      {!booted && <Preloader onComplete={() => setBooted(true)} />}

      {/* 1. CHISPAZOS, CORTES Y GRIETAS DE CRISTAL POR ENCIMA DE TODA LA WEB */}
      <ShatterCanvas />
      <CustomCursor />

      {/* 2. ESCENARIO 3D FULL-VIEWPORT: SOLO EL MAZO, MOVIDO EXCLUSIVAMENTE POR EL SCROLL */}
      <RageRoom3DStage
        scrollProgress={scrollProgress}
        smashSignal={smashSignal}
      />

      {/* 3. BARRA SUPERIOR FIJA */}
      <header className="keltic-navbar">
        <div className="navbar-brand">
          <div className="brand-mark">SZ</div>
          <div>
            <span className="brand-title">SMASHZONE</span>
            <span className="brand-sub">
              SALAS DE DESTRUCCIÓN • DESLIZA EL SCROLL PARA RECORRER
            </span>
          </div>
        </div>

        <nav className="navbar-links">
          <button
            className={`nav-link-btn ${scrollProgress < 0.22 ? 'active' : ''}`}
            onClick={() => scrollToProgress(0.0)}
          >
            01 // Inicio
          </button>
          <button
            className={`nav-link-btn ${
              scrollProgress >= 0.22 && scrollProgress < 0.49 ? 'active' : ''
            }`}
            onClick={() => scrollToProgress(0.35)}
          >
            02 // Cámaras
          </button>
          <button
            className={`nav-link-btn ${
              scrollProgress >= 0.49 && scrollProgress < 0.75 ? 'active' : ''
            }`}
            onClick={() => scrollToProgress(0.62)}
          >
            03 // Paquetes
          </button>
          <button
            className={`nav-link-btn ${
              scrollProgress >= 0.75 && finalStageTab === 'arsenal'
                ? 'active'
                : ''
            }`}
            onClick={() => {
              setFinalStageTab('arsenal');
              scrollToProgress(0.92);
            }}
          >
            04 // Arsenal Extra
          </button>
          <button
            className={`nav-link-btn ${
              scrollProgress >= 0.75 && finalStageTab !== 'arsenal'
                ? 'active'
                : ''
            }`}
            onClick={() => {
              setFinalStageTab('reservar');
              scrollToProgress(0.92);
            }}
          >
            05 // Reservar ({desgloseCarrito.items.reduce((a, b) => a + b.cantidad, 0)})
          </button>
        </nav>

        <div className="navbar-actions">
          <div className="role-switcher-pill">
            {(['Cliente', 'Staff', 'Admin'] as RolNombre[]).map((r) => (
              <button
                key={r}
                className={`role-btn ${currentUser.rol === r ? 'is-selected' : ''}`}
                onClick={() => cambiarRolDemo(r)}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            className="btn-keltic-outline"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.68rem' }}
            onClick={() => setAuthModalOpen(true)}
          >
            <UserCheck size={13} />
            {currentUser.nombre}
          </button>
        </div>
      </header>

      {/* Notificaciones flotantes */}
      {bannerMessage && (
        <div
          style={{
            position: 'fixed',
            top: 72,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 4000,
            width: '92%',
            maxWidth: 860,
          }}
        >
          <div
            className={`alert-banner ${bannerMessage.type === 'success' ? 'success' : ''}`}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <span>{bannerMessage.text}</span>
            <button
              onClick={() => setBannerMessage(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          VIEWPORT FIJO 3D CON TRANSICIONES REUBICADAS LADO A LADO CON EL MAZO
          ==================================================================== */}
      <div className="scrolly-fixed-viewport">
        {/* ------------------------------------------------------------------
            CAPÍTULO 01 (0.00 -> 0.28): PORTADA A LA IZQUIERDA | MAZO A LA DERECHA
            ------------------------------------------------------------------ */}
        <div
          className="scrolly-stage-layer"
          style={computeCleanStageStyle(-0.1, 0.0, 0.18, 0.28, 'left')}
        >
          <div
            className="scrolly-interactive-panel"
            style={{ maxWidth: 650 }}
          >
            <div className="hero-kicker">
              <Flame size={16} /> SALAS DE DEMOLICIÓN EN LIMA // GIRA LA RUEDA
              DEL MOUSE
            </div>
            <h1 className="hero-headline">
              ENTRA. EQUIPATE.
              <br />
              <span className="outline-stroke">DESTRÚYELO TODO.</span>
            </h1>
            <p className="hero-lead">
              Descarga toda la presión en nuestras bóvedas acorazadas. Baja con
              el scroll para ver cómo el mazo recorre las cámaras, los paquetes
              de demolición y el arsenal disponible.
            </p>

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
                marginBottom: '2.2rem',
              }}
            >
              <button
                type="button"
                className="btn-keltic-primary"
                data-cursor="¡GOLPEAR!"
                onClick={() => setSmashSignal((s) => s + 1)}
              >
                <Hammer size={17} /> ¡PROBAR GOLPE DE MAZO!
              </button>
              <button
                type="button"
                className="btn-keltic-outline"
                onClick={() => scrollToProgress(0.35)}
              >
                EXPLORAR CÁMARAS ↓
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1.2rem',
                borderTop: '1px solid var(--border-hairline)',
                paddingTop: '1.2rem',
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.6rem',
                    fontWeight: 800,
                    color: 'var(--accent-volt)',
                  }}
                >
                  {salas.filter((s) => s.activa).length} BÓVEDAS
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.68rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  HORMIGÓN INSONORIZADO
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.6rem',
                    fontWeight: 800,
                  }}
                >
                  {inventario.reduce((a, b) => a + b.stockDisponible, 0)}{' '}
                  OBJETOS
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.68rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  LISTOS PARA ROMPER HOY
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.6rem',
                    fontWeight: 800,
                  }}
                >
                  100% SEGURO
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.68rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  CASCO, VISOR Y GUANTES KEVLAR
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            CAPÍTULO 02 (0.24 -> 0.58): CÁMARAS A LA DERECHA | MAZO A LA IZQUIERDA
            ------------------------------------------------------------------ */}
        <div
          className="scrolly-stage-layer"
          style={computeCleanStageStyle(0.24, 0.33, 0.48, 0.58, 'right')}
        >
          <div
            className="scrolly-interactive-panel"
            style={{ maxWidth: 820 }}
          >
            <div style={{ marginBottom: '1.2rem' }}>
              <div className="section-index-tag">
                [ CAPÍTULO 02 // ESCENARIOS BLINDADOS ]
              </div>
              <h2 className="section-title">ELIGE TU CÁMARA DE DESTRUCCIÓN</h2>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
              }}
            >
              {salas.map((sala, idx) => {
                const isSel = sala.id === selectedSalaId;
                return (
                  <div
                    key={sala.id}
                    className={`keltic-card ${isSel ? 'is-selected' : ''}`}
                    style={{ opacity: sala.activa ? 1 : 0.55 }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '0.6rem',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.68rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          BÓVEDA // 0{idx + 1}
                        </span>
                        <span
                          className={`keltic-badge ${
                            sala.activa ? 'badge-volt' : 'badge-ember'
                          }`}
                        >
                          {sala.activa ? 'DISPONIBLE' : 'MANTENIMIENTO'}
                        </span>
                      </div>
                      <h3
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.2rem',
                          marginBottom: '0.4rem',
                        }}
                      >
                        {sala.nombre}
                      </h3>
                      <p
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.45,
                          marginBottom: '0.9rem',
                        }}
                      >
                        {sala.descripcion}
                      </p>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid var(--border-hairline)',
                        paddingTop: '0.75rem',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.72rem',
                        }}
                      >
                        <Users
                          size={13}
                          style={{
                            verticalAlign: 'middle',
                            marginRight: '0.3rem',
                            color: 'var(--accent-volt)',
                          }}
                        />
                        MÁX {sala.capacidadMaxima} PAX
                      </span>
                      <button
                        type="button"
                        disabled={!sala.activa}
                        className={
                          isSel ? 'btn-keltic-primary' : 'btn-keltic-outline'
                        }
                        style={{ padding: '0.42rem 0.85rem', fontSize: '0.68rem' }}
                        onClick={() => {
                          setSelectedSalaId(sala.id);
                          setSmashSignal((s) => s + 1);
                        }}
                      >
                        {isSel ? 'SELECCIONADA ✓' : 'ELEGIR'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            CAPÍTULO 03 (0.54 -> 0.85): PAQUETES A LA IZQUIERDA | MAZO A LA DERECHA
            ------------------------------------------------------------------ */}
        <div
          className="scrolly-stage-layer"
          style={computeCleanStageStyle(0.54, 0.63, 0.76, 0.85, 'left')}
        >
          <div
            className="scrolly-interactive-panel"
            style={{ maxWidth: 820 }}
          >
            <div style={{ marginBottom: '1.2rem' }}>
              <div className="section-index-tag">
                [ CAPÍTULO 03 // PLANES Y TIEMPO EN CÁMARA ]
              </div>
              <h2 className="section-title">ELIGE TU PAQUETE DE FURIA</h2>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
              }}
            >
              {paquetes
                .filter((p) => p.activo)
                .map((paq) => {
                  const isSel = paq.id === selectedPaqueteId;
                  return (
                    <div
                      key={paq.id}
                      className={`keltic-card ${isSel ? 'is-selected' : ''}`}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '0.6rem',
                          }}
                        >
                          <span className="keltic-badge badge-rage">
                            <Clock size={11} /> {paq.duracionMinutos} MIN
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.68rem',
                              color: 'var(--accent-volt)',
                            }}
                          >
                            {paq.cantidadItemsEstandar} OBJETOS BASE
                          </span>
                        </div>
                        <h3
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1.2rem',
                            marginBottom: '0.4rem',
                          }}
                        >
                          {paq.nombre}
                        </h3>
                        <p
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.45,
                            marginBottom: '0.9rem',
                          }}
                        >
                          {paq.descripcion}
                        </p>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderTop: '1px solid var(--border-hairline)',
                          paddingTop: '0.75rem',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1.55rem',
                            fontWeight: 800,
                            color: 'var(--accent-volt)',
                          }}
                        >
                          S/ {paq.precio.toFixed(2)}
                        </div>
                        <button
                          type="button"
                          className={
                            isSel ? 'btn-keltic-primary' : 'btn-keltic-outline'
                          }
                          style={{
                            padding: '0.42rem 0.85rem',
                            fontSize: '0.68rem',
                          }}
                          onClick={() => {
                            setSelectedPaqueteId(paq.id);
                            setSmashSignal((s) => s + 1);
                          }}
                        >
                          {isSel ? 'PAQUETE ACTIVO ✓' : 'SELECCIONAR'}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            CAPÍTULO 04 (0.81 -> 1.00): ARSENAL, RESERVA & OPERACIONES A LA DERECHA | MAZO A LA IZQUIERDA
            ------------------------------------------------------------------ */}
        <div
          className="scrolly-stage-layer"
          style={computeCleanStageStyle(0.81, 0.89, 1.05, 1.15, 'right')}
        >
          <div
            className="scrolly-interactive-panel"
            style={{ maxWidth: 880 }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.8rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <div className="section-index-tag">
                  [ CAPÍTULO 04 // PERSONALIZACIÓN Y AGENDAMIENTO ]
                </div>
                <h2 className="section-title">
                  {finalStageTab === 'arsenal'
                    ? 'ARSENAL DE OBJETOS EXTRA'
                    : finalStageTab === 'reservar'
                      ? 'CONFIRMA TU RESERVA Y PAGO'
                      : finalStageTab === 'sesiones'
                        ? 'AGENDA Y CONTROL DE SESIONES'
                        : 'PANEL DE ADMINISTRACIÓN'}
                </h2>
              </div>

              <div className="role-switcher-pill">
                <button
                  type="button"
                  className={`role-btn ${finalStageTab === 'arsenal' ? 'is-selected' : ''}`}
                  onClick={() => setFinalStageTab('arsenal')}
                >
                  1. Arsenal Extra
                </button>
                <button
                  type="button"
                  className={`role-btn ${finalStageTab === 'reservar' ? 'is-selected' : ''}`}
                  onClick={() => setFinalStageTab('reservar')}
                >
                  2. Reservar y Pagar
                </button>
                <button
                  type="button"
                  className={`role-btn ${finalStageTab === 'sesiones' ? 'is-selected' : ''}`}
                  onClick={() => setFinalStageTab('sesiones')}
                >
                  {currentUser.rol === 'Cliente'
                    ? `Mis Reservas (${reservas.length})`
                    : `Control Sala (${reservas.length})`}
                </button>
                {currentUser.rol === 'Admin' && (
                  <button
                    type="button"
                    className={`role-btn ${finalStageTab === 'admin' ? 'is-selected' : ''}`}
                    onClick={() => setFinalStageTab('admin')}
                  >
                    Estadísticas
                  </button>
                )}
              </div>
            </div>

            {/* SUB-VISTA 1: ARSENAL DE OBJETOS EXTRA */}
            {finalStageTab === 'arsenal' && (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.85rem',
                    marginBottom: '1rem',
                  }}
                >
                  {inventario
                    .filter((i) => i.activo)
                    .slice(0, 6)
                    .map((item) => {
                      const cant = extrasCarrito[item.id] || 0;
                      return (
                        <div
                          key={item.id}
                          className={`keltic-card ${cant > 0 ? 'is-selected' : ''}`}
                          style={{ padding: '1rem 1.2rem' }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: '0.4rem',
                            }}
                          >
                            <span className="keltic-badge badge-muted">
                              {item.categoria}
                            </span>
                            <span className="keltic-badge badge-volt">
                              {item.stockDisponible} DISP.
                            </span>
                          </div>
                          <h4
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: '1.05rem',
                              marginBottom: '0.6rem',
                            }}
                          >
                            {item.nombre}
                          </h4>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                color: 'var(--accent-volt)',
                              }}
                            >
                              + S/ {item.precioUnitario.toFixed(2)}
                            </span>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                              }}
                            >
                              <button
                                type="button"
                                className="btn-keltic-outline"
                                style={{ padding: '0.25rem 0.6rem' }}
                                onClick={() =>
                                  modificarExtraCantidad(item.id, -1)
                                }
                              >
                                -
                              </button>
                              <span
                                style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 700,
                                  minWidth: 20,
                                  textAlign: 'center',
                                }}
                              >
                                {cant}
                              </span>
                              <button
                                type="button"
                                className="btn-keltic-primary"
                                style={{ padding: '0.25rem 0.6rem' }}
                                onClick={() => {
                                  modificarExtraCantidad(item.id, 1);
                                  setSmashSignal((s) => s + 1);
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-keltic-primary"
                    onClick={() => setFinalStageTab('reservar')}
                  >
                    CONTINUAR A FECHA Y PAGO (TOTAL: S/{' '}
                    {desgloseCarrito.montoTotal.toFixed(2)}) →
                  </button>
                </div>
              </div>
            )}

            {/* SUB-VISTA 2: FORMULARIO DE RESERVA + PASARELA CULQI */}
            {finalStageTab === 'reservar' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.25fr 0.95fr',
                  gap: '1.1rem',
                }}
              >
                <form onSubmit={handleCrearReserva} className="keltic-card">
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.85rem',
                      marginBottom: '0.85rem',
                    }}
                  >
                    <div>
                      <label className="keltic-label">Cámara</label>
                      <select
                        className="keltic-select"
                        value={selectedSalaId}
                        onChange={(e) =>
                          setSelectedSalaId(Number(e.target.value))
                        }
                      >
                        {salas.map((s) => (
                          <option key={s.id} value={s.id} disabled={!s.activa}>
                            {s.nombre} (Máx {s.capacidadMaxima} pax)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="keltic-label">Paquete</label>
                      <select
                        className="keltic-select"
                        value={selectedPaqueteId}
                        onChange={(e) =>
                          setSelectedPaqueteId(Number(e.target.value))
                        }
                      >
                        {paquetes
                          .filter((p) => p.activo)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} — S/ {p.precio.toFixed(2)}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '0.85rem',
                      marginBottom: '0.85rem',
                    }}
                  >
                    <div>
                      <label className="keltic-label">Fecha</label>
                      <input
                        type="date"
                        className="keltic-input"
                        value={fechaInput}
                        onChange={(e) => setFechaInput(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="keltic-label">Hora Inicio</label>
                      <input
                        type="time"
                        className="keltic-input"
                        value={horaInput}
                        onChange={(e) => setHoraInput(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="keltic-label">
                        Personas (Máx {cupoMaximoPermitido})
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        className="keltic-input"
                        value={numParticipantes}
                        onChange={(e) =>
                          setNumParticipantes(Number(e.target.value))
                        }
                        required
                      />
                    </div>
                  </div>

                  {solapamientoDetectado && (
                    <div
                      className="alert-banner"
                      style={{ marginBottom: '0.8rem' }}
                    >
                      <AlertTriangle
                        size={14}
                        style={{
                          verticalAlign: 'middle',
                          marginRight: '0.35rem',
                        }}
                      />
                      Horario ocupado en esta cámara entre{' '}
                      {new Date(
                        solapamientoDetectado.fechaHoraInicio
                      ).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      y{' '}
                      {new Date(
                        solapamientoDetectado.fechaHoraFin
                      ).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      .
                    </div>
                  )}

                  <div style={{ marginBottom: '1rem' }}>
                    <label className="keltic-label">
                      Playlist / Notas Especiales
                    </label>
                    <input
                      type="text"
                      className="keltic-input"
                      value={notasEspeciales}
                      onChange={(e) => setNotasEspeciales(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-keltic-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Calendar size={16} /> CONFIRMAR RESERVA (S/{' '}
                    {desgloseCarrito.montoTotal.toFixed(2)})
                  </button>
                </form>

                <div className="keltic-card is-selected">
                  <div>
                    <div className="ticket-row">
                      <span>Cámara:</span>
                      <strong>{salaSeleccionada?.nombre}</strong>
                    </div>
                    <div className="ticket-row">
                      <span>Paquete:</span>
                      <strong>
                        {paqueteSeleccionado?.nombre} (S/{' '}
                        {desgloseCarrito.montoPaquete.toFixed(2)})
                      </strong>
                    </div>
                    {desgloseCarrito.items.map((x) => (
                      <div key={x.item.id} className="ticket-row">
                        <span>
                          {x.cantidad}x {x.item.nombre}
                        </span>
                        <span>S/ {x.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        paddingTop: '0.75rem',
                        marginTop: '0.5rem',
                        borderTop: '2px solid var(--accent-rage)',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                        }}
                      >
                        TOTAL A PAGAR
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.9rem',
                          fontWeight: 800,
                          color: 'var(--accent-volt)',
                        }}
                      >
                        S/ {desgloseCarrito.montoTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {reservaPendientePago && (
                    <div
                      style={{
                        marginTop: '0.85rem',
                        paddingTop: '0.85rem',
                        borderTop: '1px solid var(--border-strong)',
                      }}
                    >
                      <div style={{ marginBottom: '0.6rem' }}>
                        <label className="keltic-label">
                          Pago con Tarjeta (Reserva #
                          {reservaPendientePago.id.slice(0, 8)})
                        </label>
                        <select
                          className="keltic-select"
                          value={culqiModoSim}
                          onChange={(e) =>
                            setCulqiModoSim(
                              e.target.value as 'ok' | 'declined'
                            )
                          }
                        >
                          <option value="ok">
                            💳 Tarjeta Visa 4242 (Pago Aprobado)
                          </option>
                          <option value="declined">
                            ⚠️ Tarjeta sin fondos (Simular Rechazo)
                          </option>
                        </select>
                      </div>
                      <button
                        type="button"
                        className="btn-keltic-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() =>
                          handlePagarConCulqi(reservaPendientePago.id)
                        }
                      >
                        <CreditCard size={15} /> PAGAR Y EMITIR VOUCHER
                      </button>
                    </div>
                  )}

                  {voucherEmitido && (
                    <div
                      style={{
                        marginTop: '0.85rem',
                        padding: '0.85rem',
                        background: 'rgba(212, 255, 0, 0.08)',
                        border: '1px solid var(--accent-volt)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.74rem',
                      }}
                    >
                      <div
                        style={{ color: 'var(--accent-volt)', fontWeight: 700 }}
                      >
                        ✓ VOUCHER EMITIDO: {voucherEmitido.transaccionRef}
                      </div>
                      <div>
                        {voucherEmitido.sala} • S/{' '}
                        {voucherEmitido.monto.toFixed(2)} •{' '}
                        {voucherEmitido.estadoReserva}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-VISTA 3: MIS RESERVAS / CONTROL DE SESIONES */}
            {finalStageTab === 'sesiones' && (
              <div className="keltic-table-wrap">
                <table className="keltic-table">
                  <thead>
                    <tr>
                      <th>Reserva / Cliente</th>
                      <th>Cámara & Paquete</th>
                      <th>Horario</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservas.map((r) => {
                      const esStaffOAdmin =
                        currentUser.rol === 'Staff' ||
                        currentUser.rol === 'Admin';
                      return (
                        <tr key={r.id}>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>
                            <strong>#{r.id.slice(0, 8)}</strong> —{' '}
                            {r.nombreCliente}
                          </td>
                          <td>
                            <strong>{r.nombreSala}</strong> ({r.nombrePaquete})
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>
                            {new Date(r.fechaHoraInicio).toLocaleString()}
                          </td>
                          <td
                            style={{
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--accent-volt)',
                              fontWeight: 700,
                            }}
                          >
                            S/ {r.montoTotal.toFixed(2)}
                          </td>
                          <td>
                            <span className="keltic-badge badge-volt">
                              {r.estado}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              {r.estado === 'Pendiente' && (
                                <button
                                  type="button"
                                  className="btn-keltic-primary"
                                  style={{
                                    padding: '0.3rem 0.65rem',
                                    fontSize: '0.66rem',
                                  }}
                                  onClick={() => {
                                    setReservaPendientePago(r);
                                    setFinalStageTab('reservar');
                                  }}
                                >
                                  Pagar
                                </button>
                              )}
                              {esStaffOAdmin && r.estado === 'Confirmada' && (
                                <button
                                  type="button"
                                  className="btn-keltic-primary"
                                  style={{
                                    padding: '0.3rem 0.65rem',
                                    fontSize: '0.66rem',
                                  }}
                                  onClick={async () => {
                                    await smashzoneApi.cambiarEstadoReserva(
                                      r.id,
                                      'EnProceso',
                                      currentUser,
                                      token
                                    );
                                    await cargarTodo();
                                  }}
                                >
                                  Iniciar Sala
                                </button>
                              )}
                              {esStaffOAdmin && r.estado === 'EnProceso' && (
                                <button
                                  type="button"
                                  className="btn-keltic-primary"
                                  style={{
                                    padding: '0.3rem 0.65rem',
                                    fontSize: '0.66rem',
                                  }}
                                  onClick={async () => {
                                    await smashzoneApi.cambiarEstadoReserva(
                                      r.id,
                                      'Completada',
                                      currentUser,
                                      token
                                    );
                                    await cargarTodo();
                                  }}
                                >
                                  Finalizar
                                </button>
                              )}
                              {(r.estado === 'Pendiente' ||
                                r.estado === 'Confirmada') && (
                                <button
                                  type="button"
                                  className="btn-keltic-outline"
                                  style={{
                                    padding: '0.3rem 0.65rem',
                                    fontSize: '0.66rem',
                                  }}
                                  onClick={async () => {
                                    await smashzoneApi.cambiarEstadoReserva(
                                      r.id,
                                      'Cancelada',
                                      currentUser,
                                      token
                                    );
                                    await cargarTodo();
                                  }}
                                >
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* SUB-VISTA 4: ESTADÍSTICAS ADMIN */}
            {finalStageTab === 'admin' && currentUser.rol === 'Admin' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.2rem',
                }}
              >
                <div className="keltic-card">
                  <span className="keltic-badge badge-volt">
                    INGRESOS POR MES
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: '0.8rem',
                      height: 150,
                      marginTop: '1rem',
                    }}
                  >
                    {ingresosMes.map((im) => {
                      const maxIng = Math.max(
                        1,
                        ...ingresosMes.map((x) => x.totalIngresos)
                      );
                      const hPct = Math.max(
                        15,
                        Math.round((im.totalIngresos / maxIng) * 100)
                      );
                      return (
                        <div
                          key={`${im.anio}-${im.mes}`}
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            height: '100%',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <div
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.68rem',
                              color: 'var(--accent-volt)',
                            }}
                          >
                            S/ {im.totalIngresos.toFixed(0)}
                          </div>
                          <div
                            style={{
                              width: '100%',
                              height: `${hPct}%`,
                              background:
                                'linear-gradient(180deg, var(--accent-rage), var(--accent-ember))',
                            }}
                          />
                          <div
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.66rem',
                              marginTop: '0.3rem',
                            }}
                          >
                            {im.anio}-{String(im.mes).padStart(2, '0')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="keltic-card">
                  <span className="keltic-badge badge-rage">
                    PAQUETES MÁS DEMANDADOS ({usuariosAdmin.length} USUARIOS)
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                      marginTop: '1rem',
                    }}
                  >
                    {paquetesDemanda.map((pd, i) => (
                      <div key={pd.idPaquete} className="ticket-row">
                        <span>
                          {i === 0 ? '🏆 ' : ''}
                          <strong>{pd.paquete}</strong>
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--accent-volt)',
                          }}
                        >
                          {pd.totalReservas} reservas
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BARRA INFERIOR DE RECORRIDO DEL MAZO */}
      <div
        className="scrolly-progress-bar"
        style={{ width: `${(scrollProgress * 100).toFixed(1)}%` }}
      />
      <footer className="scrolly-bottom-hud">
        <div>{currentStageLabel}</div>
        <div>
          PROGRESO DE SCROLL: {Math.round(scrollProgress * 100)}% • SOLO EL
          SCROLL MUEVE EL MAZO
        </div>
        <div>TOTAL RESERVA: S/ {desgloseCarrito.montoTotal.toFixed(2)}</div>
      </footer>

      {/* PISTA DE SCROLL DE 680VH */}
      <div className="scrolly-spacer-track" />

      {/* MODAL DE CUENTA */}
      {authModalOpen && (
        <div
          className="keltic-modal-backdrop"
          onClick={() => setAuthModalOpen(false)}
        >
          <div className="keltic-modal" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <strong>CUENTA SMASHZONE ({currentUser.rol})</strong>
              <button
                className="btn-keltic-outline"
                style={{ padding: '0.3rem 0.6rem' }}
                onClick={() => setAuthModalOpen(false)}
              >
                <X size={14} />
              </button>
            </div>
            <div className="ticket-row">
              <span>Usuario:</span>
              <strong>
                {currentUser.nombre} {currentUser.apellido}
              </strong>
            </div>
            <div className="ticket-row">
              <span>Email:</span>
              <strong>{currentUser.email}</strong>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
