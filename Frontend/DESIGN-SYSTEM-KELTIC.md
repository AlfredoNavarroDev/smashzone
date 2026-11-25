# 🎨 Sistema de Diseño & Dirección Creativa: KELTIC → SmashZone

> **Referencia base:** [https://keltic.undreamstudio.com/](https://keltic.undreamstudio.com/)  
> **Estudio / Autor de referencia:** Undream Studio / Gaurav Mali (Destacado en el *GSAP Official Showcase*)  
> **Concepto adaptado a SmashZone:** *"Kinetic Industrial Brutalism & Controlled Chaos"* (Brutalismo Industrial Cinético y Caos Controlado)

---

## 1. Deconstrucción de la Referencia (`keltic.undreamstudio.com`)

El proyecto **KELTIC** de Undream Studio destaca en el showcase oficial de GreenSock (GSAP) por combinar una estética oscura, editorial y de alto contraste con ingeniería de movimiento en tiempo real:

1. **Atmósfera Oscura Inmersiva (Deep Void Canvas):** El fondo nunca es un negro plano estático; utiliza capas de negro carbón (`#070709`), ruido fílmico sutil (*film grain*), viñeteado radial y un lienzo interactivo donde las luces y partículas responden al movimiento del puntero.
2. **Tipografía Monumental y Cinética:** Uso de titulares *Display* ultra-condensados o geométricos de gran escala (`clamp(3.5rem, 9vw, 8.5rem)`) combinados con micro-tipografía monoespaciada (`0.72rem`, `letter-spacing: 0.18em`) que actúa como interfaz técnica (HUD), numerando secciones (`[01]`, `[02]`, `// SYS.READY`) y mostrando coordenadas o métricas en vivo.
3. **Coreografía impulsada por GSAP + ScrollTrigger + Lenis:**
   - **Preloader Numérico (`000 -> 100%`):** Carga dramática con barra de tensión y apertura de cortina vertical con curva `power4.inOut`.
   - **Split-Text Reveal:** Las palabras y caracteres emergen desde máscaras `overflow: hidden` con rotación sutil y desfase (`stagger: 0.03s`).
   - **Secciones con Líneas Divisorias Expuestas (`1px solid rgba(255,255,255,0.09)`):** Estructura arquitectónica tipo grilla suiza/brutalista donde los bordes se dibujan progresivamente al hacer scroll.
   - **Micro-interacciones Magnéticas:** Botones, tarjetas y cursor personalizado que reaccionan a la proximidad y velocidad del mouse.

---

## 2. Traducción al Dominio de un Rage Room (`SmashZone`)

Para un negocio de **Salas de Destrucción (Rage Room)**, la estética de *KELTIC* encaja de manera extraordinaria: transforma lo que podría ser un simple formulario de reservas en una **experiencia visceral de liberación de adrenalina**.

### 2.1 Paleta de Colores (CSS Custom Properties)

```css
:root {
  /* Fondos y Superficies (Void & Industrial Concrete) */
  --bg-void: #070709;           /* Fondo abismal principal */
  --bg-surface: #0E0E12;        /* Superficie de bloques y paneles */
  --bg-elevated: #15151C;       /* Tarjetas interactivas, modales y drawers */
  --bg-glass: rgba(18, 18, 24, 0.78); /* HUD y Navbar con backdrop-filter */

  /* Acentos de Alta Energía (Rage, Sparks & Hazard) */
  --accent-rage: #FF2A2A;       /* Carmesí de impacto — CTAs primarios, alertas críticas */
  --accent-ember: #FF6B00;      /* Ámbar incandescente — chispas, estados EnProceso, hover */
  --accent-volt: #D4FF00;       /* Voltio ácido — badges de disponibilidad, confirmación, métricas top */
  --accent-cyan: #00F0FF;       /* Cian técnico — telemetría Staff/Admin y focos secundarios */

  /* Textos y Jerarquía */
  --text-primary: #F4F3EF;      /* Blanco hueso industrial (evita fatiga visual del #FFF puro) */
  --text-secondary: #9E9DA8;    /* Gris ceniza para descripciones */
  --text-muted: #5A5966;        /* Gris acero para etiquetas técnicas y coordenadas */

  /* Bordes y Estructura Brutalista */
  --border-hairline: rgba(244, 243, 239, 0.09);
  --border-active: rgba(255, 42, 42, 0.55);
  --glow-rage: 0 0 35px rgba(255, 42, 42, 0.35);
}
```

### 2.2 Sistema Tipográfico (3 Familias Complementarias)

| Rol | Fuente Recomendada | Aplicación en SmashZone | Especificación CSS |
| :--- | :--- | :--- | :--- |
| **Display / Impacto** | `'Syne'` / `'Bebas Neue'` / `'Anton'` | Títulos Hero, nombres de Salas (*BÚNKER NUCLEAR*), nombres de Paquetes, contadores gigantes | `font-weight: 800`, `text-transform: uppercase`, `line-height: 0.92`, `letter-spacing: -0.02em` |
| **UI & Cuerpo** | `'Space Grotesk'` / `'Inter'` | Descripciones de paquetes, formularios de reserva, tablas de gestión, modales | `font-weight: 400–600`, `line-height: 1.5` |
| **Telemetría / HUD** | `'JetBrains Mono'` / `'Space Mono'` | Precios (`S/ 149.00`), duraciones (`45 MIN`), stock (`[12 DISP]`), IDs de reserva, reloj UTC, etiquetas `[01 // SALAS]` | `font-size: 0.75rem`, `letter-spacing: 0.14em`, `text-transform: uppercase` |

---

## 3. Arquitectura de Secciones (Landing + Aplicación Integrada)

Siguiendo el recorrido narrativo de `keltic.undreamstudio.com` y conectándolo con los 4 bloques funcionales de **SmashZone**:

### `[00]` Preloader Cinético & Calibración de Presión
- Contador a pantalla completa de `000%` a `100%` acompañado de telemetría de inicio (`CARGANDO ARSENAL // CALIBRANDO CÁMARAS ACÚSTICAS // CONECTANDO API`).
- Al llegar a `100%`, las persianas industriales se abren con GSAP y revelan el Hero con una onda expansiva en el canvas.

### `[01]` HUD Navbar Fijo (Glassmorphism Brutalista)
- **Izquierda:** Logo cinético `SMASHZONE // KELTIC-SYS` con indicador luminoso de estado de conexión al Backend (`API ONLINE` o `SIMULATION ENGINE ACTIVE`).
- **Centro:** Navegación rápida con numeración técnica: `01. SALAS`, `02. PAQUETES`, `03. ARSENAL`, `04. RESERVAR`.
- **Derecha:** Selector rápido de Vista/Rol (`Cliente`, `Staff`, `Admin` + Login/Perfil) y botón magnético `[ INICIAR DESTRUCCIÓN ]`.

### `[02]` Hero Inmersivo + Medidor de Impacto en Vivo
- **Fondo WebGL / Canvas 2D de Física de Fragmentos:** Partículas poligonales (fragmentos de vidrio templado, chispas naranjas y escombros) que flotan en gravedad cero y salen despedidas cuando el usuario mueve el cursor o hace clic en **"GOLPEAR PANTALLA (TEST DE FURIA)"**.
- **Titular en Capas:**
  - Línea 1: `LIBERA EL CAOS.`
  - Línea 2 (con trazo hueco `stroke` + relleno dinámico): `ROMPE LA RUTINA.`
- **Barra de Telemetría Inferior:** Muestra métricas reales consumidas del catálogo: número de salas activas, objetos listos para destruir hoy en inventario y acceso directo al agendamiento.

### `[03]` Cinta Cinética Infinita (Kinetic Marquee)
- Banda diagonal/horizontal de alto contraste (`--accent-rage` o `--accent-volt` sobre negro) que se desplaza continuamente y cambia de dirección/velocidad según el scroll del usuario (vía `Lenis` + `GSAP`).

### `[04]` Showcase de Salas de Destrucción (`GET /api/salas`)
- Grilla asimétrica estilo *KELTIC* con tarjetas de gran formato para cada Sala.
- Muestra `nombre`, `capacidadMaxima` (ej. `HASTA 6 PERSONAS`), `descripcion`, y badge de estado (`ACTIVA` en verde voltio o `MANTENIMIENTO` en ámbar bloqueado).
- Al pasar el cursor, se activa un barrido de escáner láser y un botón para preseleccionar la sala en el configurador de reserva.

### `[05]` Matriz de Paquetes de Furia (`GET /api/paquetes`)
- Comparativa visual de alto impacto para los planes (ej. *Rage Starter*, *Couples Therapy*, *Executive Meltdown*, *Total Annihilation*).
- Cada tarjeta detalla:
  - `precio` formateado en tipografía monoespaciada gigante.
  - `duracionMinutos` (ej. `30 MIN`, `45 MIN`, `60 MIN`).
  - `maxParticipantes` y `cantidadItemsEstandar` incluidos en la caja base.

### `[06]` Arsenal & Ítems Extra Destruibles (`GET /api/inventario`)
- Selector interactivo filtrado por `categoria` (`Todos`, `Vidrio`, `Electrodomésticos`, `Electrónica`).
- Cada ítem muestra su `precioUnitario` y una barra de progreso con su `stockDisponible` en tiempo real.
- Permite agregar unidades (`+` / `-`) directamente al carrito de la reserva respetando el límite de `stockDisponible`.

### `[07]` Configurador Transaccional de Reserva + Pasarela Culqi (`POST /api/reservas` + `POST /api/pagos`)
- Panel interactivo dividido en 2 columnas:
  - **Columna Izquierda (Configuración):** Selección de Sala, Paquete, Fecha/Hora (`fechaHoraInicio`), `numParticipantes`, `notasEspeciales` y Extras seleccionados. Incluye validación en vivo de cupo (`min(Sala.CapacidadMaxima, Paquete.MaxParticipantes)`) y detector de cruce de horarios (`409 Conflict`).
  - **Columna Derecha (Resumen & Checkout Culqi):** Ticket técnico en vivo con desglose `MontoPaquete + MontoExtras = MontoTotal`, simulador de tarjeta Culqi (`culqiToken: "tkn_test_..."`) y emisión instantánea del **Comprobante Electrónico (`VoucherDTO`)**.

### `[08]` Centro de Operaciones Staff & Command Center Admin (Vistas Protegidas por Rol)
- **Modo Staff (`Staff` / `Admin`):** Tablero de control de reservas en tiempo real con filtros por estado (`Pendiente`, `Confirmada`, `EnProceso`, `Completada`, `Cancelada`), botones para ejecutar transiciones válidas (`Confirmada → EnProceso → Completada`), registro de pago manual (`Efectivo`/`Transferencia`) y visor de línea de tiempo auditable (`GET /api/reservas/{id}/historial`).
- **Modo Admin (`Admin`):**
  - **Dashboard de Reportes (Bloque 4):** Filtros `desde`/`hasta` y los 3 gráficos oficiales (`Ingresos por Mes`, `Paquete Más Demandado`, `Horas Pico 00:00–23:00`).
  - **Gestión de Catálogo (Bloque 2):** Crear/editar/activar/desactivar Salas, Paquetes e Inventario.
  - **Gestión de Usuarios (Bloque 1):** Métricas de usuarios (`onlineAhora`, `activos7Dias`), tabla paginada, cambio de rol y habilitación/deshabilitación con protección de último Admin.

