# Spec 01 — Shell, Navegación HUD y Experiencia Interactiva KELTIC

> **Bloque asociado:** Bloque 4 (Frontend Shell) + Identidad Creativa `keltic.undreamstudio.com`  
> **Archivos clave:** `src/App.tsx`, `src/components/keltic/*`, `src/components/layout/NavbarHud.tsx`

---

## 1. Preloader Cinético (`Preloader.tsx`)
Inspirado directamente en las experiencias inmersivas de **Undream Studio**:
- **Contador numérico de alta precisión:** Incrementa de `000` a `100` usando `gsap.to` con curva `power3.inOut`.
- **Mensajes de diagnóstico de cámara de destrucción:**
  - `00–30%`: `INITIALIZING ACOUSTIC CONTAINMENT CHAMBERS...`
  - `31–65%`: `LOADING DESTRUCTION ARSENAL & TELEMETRY...`
  - `66–99%`: `SYNCING SMASHZONE .NET 10 CORE ENGINE...`
  - `100%`: `CHAMBERS ARMED // READY TO SHATTER`
- **Transición de salida:** Al alcanzar el 100%, el contenedor superior se desliza verticalmente (`yPercent: -100`, `duration: 0.9`, `ease: "expo.inOut"`) y dispara la animación de entrada de los caracteres del Hero.

## 2. Lienzo de Física de Fragmentos & Ondas de Choque (`ShatterCanvas.tsx`)
Para capturar la firma WebGL/Canvas de `keltic.undreamstudio.com`:
- Renderiza en un `<canvas>` fijo a pantalla completa (`pointer-events: none`, `z-index: 0`) fragmentos poligonales irregulares que simulan vidrio templado, concreto y chispas incandescentes (`#FF2A2A`, `#FF6B00`, `#D4FF00`).
- **Interacción con el Puntero:** Los fragmentos cercanos al cursor experimentan repulsión cinética y rotación angular en los 3 ejes simulados.
- **Evento Global `smashzone:shatter`:** Cuando el usuario presiona el botón **"GOLPEAR / DESCARGAR FURIA"** en el Hero o confirma una reserva/pago, el canvas genera una explosión de 45 fragmentos nuevos y una onda expansiva radial desde las coordenadas del clic.

## 3. Cursor Magnético Reticular (`CustomCursor.tsx`)
- Compuesto por un punto central ácido (`6px`) y un anillo reticular externo (`36px`) que sigue al puntero con interpolación suave (`gsap.quickTo`).
- Al posicionarse sobre elementos interactivos (`button`, `a`, `[data-magnetic]`), el anillo se expande a `64px`, cambia su borde a `--accent-rage` y muestra la etiqueta técnica `SMASH` o `SELECT`.
- Se desactiva automáticamente en dispositivos táctiles (`pointer: coarse`).

## 4. Smooth Scroll con Lenis + GSAP ScrollTrigger
- Se instancia `Lenis` en `App.tsx` y se sincroniza con `ScrollTrigger.update` y `gsap.ticker.add`.
- Permite que las cintas cinéticas (`KineticMarquee`) aceleren según la velocidad del scroll y que las tarjetas del catálogo entren con *stagger* fluido.

## 5. HUD Navbar & Conmutador de Rol para Práctica (`NavbarHud.tsx`)
- Muestra en tiempo real:
  1. **Estado del Motor de Datos:** Badge que indica si está conectado al Backend `.NET 10` (`LIVE API :5021`) o ejecutando el **Motor Transaccional Simulado (`MOCK ENGINE READY`)**.
  2. **Selector Instantáneo de Rol (Modo Práctica Frontend):** Permite alternar con un clic entre:
     - `Vista Cliente` (Landing + Catálogo + Configurador de Reserva + Mis Reservas)
     - `Panel Staff` (Operación de Salas en Vivo + Máquina de Estados + Pagos Manuales)
     - `Command Center Admin` (Reportes Bloque 4 + CRUD Catálogo Bloque 2 + Usuarios Bloque 1)
  3. **Estado de Autenticación:** Muestra usuario logueado, indicador de *Heartbeat* activo (`60s pulse`) y acceso al modal de Login/Registro/Perfil.

