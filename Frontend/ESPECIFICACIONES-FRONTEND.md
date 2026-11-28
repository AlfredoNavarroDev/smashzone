# 📐 Especificaciones Técnicas y Funcionales del Frontend — SmashZone

Este documento define la arquitectura, contratos de datos, reglas de validación en cliente, manejo de errores HTTP y flujos de usuario del Frontend de **SmashZone**, alineado estrictamente con el backend real documentado en [`../backend/`](../backend/) y [`../api-contracts.md`](../api-contracts.md).

---

## 1. Arquitectura de Carpetas del Frontend (`frontend/src/`)

```text
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── DESIGN-SYSTEM-KELTIC.md
├── ESPECIFICACIONES-FRONTEND.md
├── specs/                              # Especificaciones detalladas por módulo
│   ├── 01-shell-y-experiencia-keltic.md
│   ├── 02-auth-y-usuarios.md
│   ├── 03-catalogo-interactivo.md
│   ├── 04-reservas-y-pagos.md
│   └── 05-reportes-dashboard.md
└── src/
    ├── main.tsx                        # Punto de entrada React 19
    ├── App.tsx                         # Orquestador principal + Lenis + GSAP + Vistas por Rol
    ├── styles/
    │   └── keltic-theme.css            # Tokens CSS, tipografía, grillas brutalistas, animaciones
    ├── types/
    │   └── api.types.ts                # Interfaces TypeScript exactas de todos los DTOs (Bloques 1–4)
    ├── api/
    │   ├── httpClient.ts               # Cliente Fetch/Axios con JWT Bearer, ProblemDetails y Fallback Mock
    │   ├── mockEngine.ts               # Motor transaccional local (simula SQL Server + reglas de negocio)
    │   └── smashzoneApi.ts             # Servicios por dominio: auth, usuarios, catalogo, reservas, pagos, reportes
    ├── context/
    │   └── AuthContext.tsx             # Sesión JWT, usuario activo, heartbeat 60s y cambio rápido de rol demo
    └── components/
        ├── keltic/
        │   ├── Preloader.tsx           # Contador cinético 000-100% con apertura de cortina GSAP
        │   ├── ShatterCanvas.tsx       # Motor Canvas/WebGL de fragmentos 3D, chispas y ondas de impacto
        │   ├── CustomCursor.tsx        # Retícula magnética interactiva estilo KELTIC
        │   └── KineticMarquee.tsx      # Cinta industrial infinita sensible al scroll
        ├── layout/
        │   └── NavbarHud.tsx           # Barra superior técnica con telemetría, estado API y selector de rol
        ├── sections/
        │   ├── HeroSection.tsx         # Hero cinético con medidor de furia interactivo
        │   ├── CatalogoSection.tsx     # Showcase de Salas, Paquetes y Arsenal de Extras
        │   ├── ReservaWizardSection.tsx# Flujo completo de Reserva + Validación 409 + Checkout Culqi + Voucher
        │   ├── MisReservasSection.tsx  # Historial del cliente y cancelación con reposición de stock
        │   ├── StaffOperationsPanel.tsx# Panel de operaciones en local (Máquina de estados + Historial + Pago manual)
        │   └── AdminCommandCenter.tsx  # Dashboard Reportes (3 gráficos) + CRUD Catálogo + Gestión Usuarios
        └── modals/
            └── AuthModal.tsx           # Modal de Login, Registro y Perfil (/api/usuarios/me)
```

---

## 2. Reglas Cross-Cutting del Frontend (Obligatorias)

### 2.1 Autenticación JWT & Heartbeat de Presencia
1. **Almacenamiento y Cabecera:** Tras `POST /api/auth/login`, el token JWT y el objeto `usuario` (`UsuarioDTO`) se guardan en estado y `localStorage`. Toda petición autenticada incluye:
   ```http
   Authorization: Bearer <token>
   ```
2. **Ciclo de Heartbeat (`POST /api/auth/heartbeat`):**
   - Mientras exista sesión activa, un `setInterval` cada **60,000 ms (60 s)** invoca `POST /api/auth/heartbeat`.
   - Si el backend responde `204 No Content`, la cuenta sigue activa y su `UltimaActividad` se refresca (manteniendo el estado `online: true` en el panel Admin durante 5 minutos).
   - Si responde `401 Unauthorized` (por ejemplo, un Admin deshabilitó al usuario en caliente), el frontend **cierra la sesión inmediatamente** y muestra notificación explicativa.

### 2.2 Tratamiento Estándar de Errores (`ProblemDetails` & `ValidationProblemDetails`)
El backend traduce todas sus `DomainException` y errores de `FluentValidation` al estándar RFC 7807 de ASP.NET Core:
- **`400 Bad Request` con `errors` por campo (`ValidationProblemDetails`):**
  ```json
  {
    "title": "One or more validation errors occurred.",
    "status": 400,
    "errors": {
      "Password": ["La contraseña debe tener al menos una mayúscula, una minúscula y un número."],
      "NumParticipantes": ["Supera la capacidad máxima de la sala."]
    }
  }
  ```
  **Comportamiento Frontend:** Extraer `errors[campo]` y pintarlo debajo del input correspondiente o en el banner técnico de validación.
- **`400 Bad Request` de Regla de Negocio (`ReglaNegocioException`):** Mostrar `detail` o `title` directamente al usuario (ej. *"Stock insuficiente para el ítem TV CRT 29 pulgadas"*).
- **`401 Unauthorized` (`NoAutorizadoException`):** En login mostrar *"Credenciales inválidas"* o *"La cuenta está deshabilitada"*; en rutas protegidas limpiar token y abrir modal de acceso.
- **`403 Forbidden`:** Redirigir a vista autorizada e informar restricción de rol.
- **`404 Not Found` (`NoEncontradoException`):** Importante: cuando un `Cliente` intenta consultar o cancelar una reserva ajena, el backend devuelve `404` (no `403`) para no filtrar su existencia.
- **`409 Conflict` (`ConflictoException`):**
  - En `POST /api/auth/registro`: Email ya registrado (case-insensitive).
  - En `POST /api/salas`, `/api/paquetes`, `/api/inventario`: Nombre duplicado en catálogo.
  - En `POST /api/reservas`: **Solapamiento de horario en la sala seleccionada** (`[FechaHoraInicio, FechaHoraFin)` se cruza con otra reserva `!= Cancelada`). El frontend resalta el conflicto en ámbar/carmesí y sugiere otro bloque horario.
  - En `POST /api/pagos`: La reserva ya no está en estado `Pendiente`.

### 2.3 Manejo de Fechas y Zonas Horarias (UTC vs Hora Local)
- Todos los endpoints de los Bloques 3 y 4 reciben y devuelven timestamps en **UTC (ISO-8601)**.
- En `POST /api/reservas`: El selector de fecha/hora del usuario convierte la hora elegida a ISO UTC antes de enviarla, y valida en cliente que `fechaHoraInicio > Date.now()`.
- `fechaHoraFin` **nunca** se envía en el payload de `POST /api/reservas` (el servidor la calcula como `fechaHoraInicio + Paquete.duracionMinutos`), pero el Frontend la pre-calcula visualmente en la UI para mostrar al cliente el rango exacto de su sesión (ej. `16:00 — 16:45`).
- En `GET /api/reportes/horas-pico`: El campo `hora` (`0..23`) viene en UTC; el dashboard permite visualizarlo con ajuste a hora local y rellena las 24 horas del día (`00:00` a `23:00`) con `0` en las horas sin actividad.

---

## 3. Mapa Completo de Contratos TypeScript (`src/types/api.types.ts`)

| Bloque | DTOs de Entrada (Request) | DTOs de Salida (Response) |
| :--- | :--- | :--- |
| **Bloque 1: Auth & Usuarios** | `RegistroDTO`, `LoginDTO`, `ActualizarPerfilDTO`, `CambiarPasswordDTO`, `CambiarRolDTO`, `CambiarEstadoDTO` | `UsuarioDTO`, `LoginRespuestaDTO`, `AdminUsuarioDTO`, `PaginadoDTO<AdminUsuarioDTO>`, `UsuariosResumenDTO`, `RolDTO` |
| **Bloque 2: Catálogo** | `CrearSalaDTO`, `ActualizarSalaDTO`, `CrearPaqueteDTO`, `ActualizarPaqueteDTO`, `CrearItemExtraDTO`, `ActualizarItemExtraDTO`, `CambiarEstadoDTO` | `SalaDTO`, `PaqueteDTO`, `ItemExtraDTO` |
| **Bloque 3: Reservas & Pagos** | `CrearReservaDTO`, `ReservaExtraItemDTO`, `CambiarEstadoReservaDTO`, `CrearPagoDTO` | `ReservaDetalleDTO`, `DetalleExtraRespuestaDTO`, `HistorialEstadoDTO`, `VoucherDTO` |
| **Bloque 4: Reportes** | Query params `?desde=ISO&hasta=ISO` | `IngresoMesDTO`, `PaqueteDemandaDTO`, `HoraPicoDTO` |

---

## 4. Matriz de Vistas y Permisos por Rol (RBAC en Frontend)

| Vista / Componente | Anónimo | `Cliente` | `Staff` | `Admin` |
| :--- | :---: | :---: | :---: | :---: |
| Landing Cinética KELTIC + Simulador de Furia | ✅ | ✅ | ✅ | ✅ |
| Exploración de Salas, Paquetes y Arsenal (`GET /api/salas`, `/paquetes`, `/inventario`) | ✅ | ✅ | ✅ | ✅ |
| Login y Registro (`POST /api/auth/login`, `/registro`) | ✅ | — | — | — |
| Crear Reserva (`POST /api/reservas`) | 🔒 *(Pide Login)* | ✅ *(Para sí mismo)* | ✅ *(Puede indicar `idCliente`)* | ✅ *(Puede indicar `idCliente`)* |
| Pago con Tarjeta Culqi (`POST /api/pagos` con `idMetodoPago: 1`) | 🔒 | ✅ | ✅ | ✅ |
| Pago Manual Efectivo/Transferencia (`POST /api/pagos` con `idMetodoPago: 2`) | ❌ | ❌ | ✅ | ✅ |
| Mis Reservas + Cancelar (`Pendiente`/`Confirmada → Cancelada`) | ❌ | ✅ *(Solo propias)* | ✅ *(Todas)* | ✅ *(Todas)* |
| Operación en Local: `Confirmada → EnProceso → Completada` | ❌ | ❌ | ✅ | ✅ |
| Línea de Tiempo / Auditoría (`GET /api/reservas/{id}/historial`) | ❌ | ❌ | ✅ | ✅ |
| CRUD Catálogo Salas / Paquetes / Inventario (`POST`/`PUT`) | ❌ | ❌ | ❌ | ✅ |
| Administración de Usuarios y Roles (`/api/admin/usuarios/*`) | ❌ | ❌ | ❌ | ✅ |
| Dashboard de Reportes (`/api/reportes/*`) | ❌ | ❌ | ❌ | ✅ |

