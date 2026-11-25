# ⚡ SmashZone Frontend — KELTIC Edition (Especificación General & Proyecto)

> **Referencia creativa y técnica:** [keltic.undreamstudio.com](https://keltic.undreamstudio.com/) (Undream Studio / Gaurav Mali — GSAP Showcase)  
> **Dominio:** Plataforma de Gestión y Reservas de Salas de Destrucción (*Rage Room*)  
> **Backend acoplado:** ASP.NET Core (.NET 10 Web API) + SQL Server (ver [`../backend/README.md`](../backend/README.md) y [`../api-contracts.md`](../api-contracts.md))

---

## 📑 Índice de Documentación Frontend

Toda la especificación técnica, de diseño interactivo y de integración con los 4 bloques del backend se encuentra organizada en esta carpeta `frontend/`:

1. **[`DESIGN-SYSTEM-KELTIC.md`](./DESIGN-SYSTEM-KELTIC.md)** — Análisis estético y técnico de *KELTIC (Undream Studio)* adaptado a **SmashZone**: paleta cromática industrial/brutalista, tipografía cinética, coreografía de animaciones con GSAP + ScrollTrigger + Lenis, efectos WebGL/Canvas de partículas de destrucción y micro-interacciones.
2. **[`ESPECIFICACIONES-FRONTEND.md`](./ESPECIFICACIONES-FRONTEND.md)** — Especificación funcional y técnica completa del Frontend mapeada 1:1 contra todos los endpoints, DTOs, códigos HTTP (`200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`), validaciones y reglas de negocio del Backend.
3. **Especificaciones detalladas por Módulo (`./specs/`)**:
   - [`specs/01-shell-y-experiencia-keltic.md`](./specs/01-shell-y-experiencia-keltic.md) — Preloader, Cursor Magnético, Smooth Scroll (Lenis), Canvas 3D/Partículas, Navbar HUD y Guards de Rutas.
   - [`specs/02-auth-y-usuarios.md`](./specs/02-auth-y-usuarios.md) — Login, Registro, Heartbeat cada 60s, Perfil (`/me`), Cambio de Contraseña y Panel Admin de Usuarios.
   - [`specs/03-catalogo-interactivo.md`](./specs/03-catalogo-interactivo.md) — Showcase cinético de Salas, Paquetes de Destrucción e Inventario de Extras + CRUD Admin con baja lógica.
   - [`specs/04-reservas-y-pagos.md`](./specs/04-reservas-y-pagos.md) — Wizard interactivo de Reserva, prevención visual y manejo de `409 Conflict` (solapamiento), pasarela simulada Culqi (`tkn_...`), pagos manuales Staff y Voucher electrónico, más tablero Kanban/Máquina de Estados para Staff.
   - [`specs/05-reportes-dashboard.md`](./specs/05-reportes-dashboard.md) — Command Center de analíticas para Admin (`ingresos-por-mes`, `paquete-mas-demandado`, `horas-pico`) con normalización UTC y relleno de series continuas.

---

## 🛠️ Stack Tecnológico Considerado (Inspirado en KELTIC + Arquitectura SmashZone)

Para replicar la fluidez, estética inmersiva y potencia visual de `keltic.undreamstudio.com` sin sacrificar la mantenibilidad empresarial requerida por los 4 bloques del proyecto:

| Capa | Tecnología | Propósito en SmashZone |
| :--- | :--- | :--- |
| **Core UI Framework** | **React 19 + TypeScript 5** | Arquitectura modular tipada para clientes HTTP, DTOs, estado de sesión y vistas por rol (`Cliente`, `Staff`, `Admin`). |
| **Build Tool** | **Vite 6** | Bundler ultrarrápido con soporte nativo para ES Modules, variables `VITE_API_URL` y HMR instantáneo. |
| **Motor de Animación** | **GSAP (GreenSock) + ScrollTrigger** | Tecnología central usada en *KELTIC*: líneas de tiempo de entrada, textos divididos por caracteres, secciones fijadas (*pinned scroll*), contadores numéricos y transiciones de layout. |
| **Smooth Scrolling** | **Lenis (`lenis`)** | Desplazamiento con inercia suave sincronizado con `gsap.ticker` para que las animaciones ligadas al scroll tengan tacto cinematográfico. |
| **Gráficos 3D / Shaders / Física** | **Three.js (`GLTFLoader`) + HTML5 Canvas 2D** | Escenario 3D fijo (`RageRoom3DStage.tsx`) con el mazo real (`bloody_sledgehammer`) controlado 100% por el progreso del scroll (con zooms macro al cabezal), vórtice centrípeto de partículas en el arranque (`Preloader.tsx`) y capa superior (`z-index: 9995`) de cortes incandescentes, chispas con gravedad y grietas de impacto (`ShatterCanvas.tsx`). |
| **Estilos & Tokens** | **CSS Custom Properties + 3D Scrollytelling** | Viewport fijo con transiciones trapezoidales (`computeCleanStageStyle`) que alternan los paneles UI (`izquierda ↔ derecha`) en espejo con la posición del mazo 3D. |
| **Visualización de Datos** | **SVG Kinetic Charts** | Gráficos de ingresos mensuales, ranking de paquetes y analíticas en el Dashboard Admin. |
| **Iconografía** | **Lucide React** | Iconografía geométrica de trazo técnico para armamento, estados de reserva y controles administrativos. |

---

## 📦 Arquitectura Visual Implementada (Estado Actual)

1. **Vórtice Realista de Arranque (`src/components/keltic/Preloader.tsx`)**:
   - Simulación física de 1,000 partículas (esquirlas de cristal con trigonometría directa, chispas incandescentes y polvo industrial) con aceleración centrípeta ($\omega \propto 1/r$).
   - Curva `power3.in` (3.0s): inicia lento en suspenso, acelera hasta convertirse en un torbellino y al `100%` colapsa en una implosión central que dispara `triggerShatterBurst`.
2. **Escenario 3D del Mazo impulsado exclusivamente por Scroll (`src/components/keltic/RageRoom3DStage.tsx`)**:
   - Carga el modelo GLTF `/models/bloody_sledgehammer/scene.gltf` con pivote reencuadrado (`-size.y * 0.15`, escala base `3.55`) para que el cabezal de acero ensangrentado nunca se corte con el borde superior.
   - **Cero movimiento con el mouse**: el mazo se mueve únicamente con `scrollProgress` de `Lenis`, recorriendo 8 waypoints cinematográficos continuos (`CINEMATIC_WAYPOINTS`) que alternan vistas panorámicas (`scale: 1.0`) con **grandes zooms macro al cabezal** (`scale: 1.45`, `z: 2.75`, encuadrados en `x: ±0.60` para que el cabezal quede 100% dentro de pantalla).
   - Los otros 7 modelos 3D (`ceramic_cup`, `crt_monitor`, `duff_beer_pack`, `generic_printer`, `glass_bottles`, `old_washing_machine_4k_textures`, `Television_01_4k.gltf`) ya están listos en `public/models/` y mapeados en `ARSENAL_3D_TARGETS`, ocultos temporalmente hasta definir su aparición.
3. **Coreografía Scrollytelling Mazo ↔ Interfaz (`src/App.tsx` + `src/styles/keltic-theme.css`)**:
   - Pista de scroll de `680vh` (`.scrolly-spacer-track`) y viewport fijo 3D (`.scrolly-fixed-viewport`).
   - Transiciones trapezoidales (`computeCleanStageStyle`) sin solapamientos ni bloqueos de clic (`pointer-events: none` en las capas contenedoras y `auto` solo en las tarjetas activas):
     - **Cap. 01 (`0% – 28%`)**: Portada a la Izquierda | Mazo a la Derecha (con Macro Zoom al cabezal en `16%`).
     - **Cap. 02 (`24% – 58%`)**: Cámaras a la Derecha | Mazo a la Izquierda (con Zoom frontal a la cara de impacto en `48%`).
     - **Cap. 03 (`54% – 85%`)**: Paquetes a la Izquierda | Mazo a la Derecha (con Zoom en ángulo de remate en `78%`).
     - **Cap. 04 (`81% – 100%`)**: Arsenal, Reserva y Panel Staff/Admin a la Derecha | Mazo a la Izquierda en pose monumental.
4. **Motor de Cortes, Chispas y Grietas sobre toda la UI (`src/components/keltic/ShatterCanvas.tsx`)**:
   - Superpuesto con `z-index: 9995` y `pointer-events: none`.
   - Rastro de corte incandescente al mover rápido el cursor, chispas con gravedad y rebote en el borde inferior, y grietas radiales de vidrio al impactar (ignorando clics sobre botones/inputs y sin animar `transform` en `document.body` para no romper `position: fixed`).

---

## 🚀 Cómo Ejecutar la Aplicación Frontend en este Folder

Dentro de esta misma carpeta `frontend/` ya se encuentra implementada la aplicación funcional completa (Landing Page cinética estilo KELTIC + Simulador de Reserva y Pago Culqi + Panel Staff de Sesiones + Command Center Admin con Reportes):

```bash
# 1. Entrar a la carpeta frontend
cd frontend

# 2. Instalar dependencias (si aún no están instaladas)
npm install

# 3. Levantar el servidor de desarrollo (puerto 5173 por defecto, compatible con CORS del Backend)
npm run dev

# 4. Compilar para producción
npm run build
```

> **Modo Híbrido (Conectado al Backend o Modo Práctica Autónomo):**  
> La aplicación intenta conectarse automáticamente a `VITE_API_URL` (por defecto `http://localhost:5021/api`). Si el backend `.NET 10` no está encendido mientras practicas diseño frontend, el cliente API activa automáticamente un **Motor Mock Transaccional Inteligente** que simula exactamente los contratos de `api-contracts.md` (incluyendo validación de solapamiento de horarios `409 Conflict`, descuento de stock de extras, máquina de estados de reservas y agregaciones de reportes).

