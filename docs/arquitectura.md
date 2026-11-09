# Arquitectura

## Visión general

```
[ Cliente (React SPA) ]
          │ HTTP/HTTPS (JSON) + Bearer JWT
          ▼
┌─────────────────────────────────────────┐
│          Backend (.NET 10 API)           │
│  Controllers → Services → Data (EF Core) │
└───────────────────┬───────────────────────┘
                     ▼
          [ SQL Server (Docker / Cloud) ]
```

Detalle completo del diagrama y del dominio funcional en
[`Rage Room Management Platform Specification.md`](./Rage%20Room%20Management%20Platform%20Specification.md).

## Capas del Backend

### Controllers

- Un controller por entidad/recurso principal (`ReservasController`,
  `SalasController`, `PaquetesController`, `InventarioController`,
  `UsuariosController`, `AuthController`, `ReportesController`).
- Reciben DTO de entrada, llaman al Service correspondiente, devuelven DTO
  de salida con el código HTTP correcto (`201 Created`, `400 BadRequest`,
  `404 NotFound`, `409 Conflict` para solapamiento de horarios, etc.).
- Decorados con `[Authorize(Roles = "...")]` según la tabla de roles del
  spec funcional.

### Services

- Contienen la lógica de negocio: validar stock, prevenir solapamiento de
  reservas, calcular monto total, cambiar estado de una reserva.
- Usan `IMapper` (AutoMapper) para convertir Entidad ↔ DTO.
- No conocen HTTP (no devuelven `IActionResult`, devuelven DTOs o lanzan
  excepciones de dominio que el Controller traduce a código HTTP).

### Data / Repositorios

- `AppDbContext` (EF Core 10) con un `DbSet<T>` por entidad.
- Las queries complejas (ej. verificar solapamiento de horario por sala)
  viven en el Service o en un método de repositorio dedicado, nunca
  repetidas inline en varios controllers.

## Frontend

- React + TypeScript, Vite.
- Estructura sugerida dentro de `Frontend/src/`:
  ```
  src/
  ├── api/          → clientes HTTP por dominio (reservas.ts, auth.ts, ...)
  ├── components/   → componentes reutilizables
  ├── pages/         → una carpeta por bloque funcional
  ├── context/       → AuthContext (JWT en memoria/localStorage)
  └── router/        → rutas + guards por rol
  ```
- El token JWT se guarda tras login y se envía en el header
  `Authorization: Bearer <token>` en cada request autenticado.

## Prevención de solapamiento de reservas

Regla de negocio central del módulo 3 (Core transaccional): al crear una
reserva, el Service debe verificar que no exista otra reserva para la
misma `SalaID` cuyo rango `[FechaHoraInicio, FechaHoraFin)` se cruce con el
rango solicitado. Si hay cruce, devolver `409 Conflict` con un mensaje
claro. Detalle de implementación en `docs/modulos/bloque-3-core-transaccional.md`.
