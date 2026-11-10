# Bloque 3 — Core transaccional (Reservas + Pagos)

## Alcance

- Creación de reservas: sala, paquete, ítems extra, fecha/hora.
- **Prevención de solapamiento de horarios** (regla de negocio crítica del
  proyecto).
- Pago simulado + generación de comprobante (voucher DTO).
- Registro y transición de estado de la reserva: `Pendiente` →
  `Confirmada` → `EnProceso` → `Completada` / `Cancelada` (nombres exactos
  tal cual están seedeados en `EstadosReserva`, ver `script.sql`).

## Entidades dueñas

`Reservas`, `DetallesReservaExtras` (plural, nombre real de la tabla en
`script.sql`), `Pagos`, `HistorialEstadosReserva`.

## Auditoría de estados (para Admin)

Cada cambio de estado de una `Reserva` se registra en
`HistorialEstadosReserva` (`IdEstadoAnterior`, `IdEstadoNuevo`,
`IdUsuarioCambio`, `FechaCambio`). `IdEstadoAnterior`/`IdUsuarioCambio`
NULL = creación inicial de la reserva (no hubo transición ni Staff
involucrado todavía).

- El `ReservaService` debe insertar una fila en `HistorialEstadosReserva`
  cada vez que cambie `Reservas.IdEstado` — incluida la creación inicial
  (transición `NULL → Pendiente`). Hacerlo dentro de la misma transacción
  EF Core que actualiza `Reservas`, nunca como paso aparte.
- `IdUsuarioCambio` = el usuario autenticado (Staff/Admin) que ejecuta
  `PUT /api/reservas/{id}/estado`. Si el cambio lo dispara el propio
  cliente (ej. cancelación desde su panel) o un proceso automático,
  queda `NULL`.
- `GET /api/reservas/{id}/historial` — `[Authorize(Roles = "Admin,Staff")]`.
  Devuelve la línea de tiempo completa de una reserva: quién cambió qué
  estado y cuándo. Es el endpoint de auditoría que pide Admin.

## Backend — piezas a implementar

- `ReservasController`: `POST /api/reservas`, `GET /api/reservas/{id}`,
  `PUT /api/reservas/{id}/estado`, `GET /api/reservas` (historial del
  usuario autenticado o, para Staff/Admin, de todas),
  `GET /api/reservas/{id}/historial` (auditoría de estados, Admin/Staff).
- `PagosController`: `POST /api/pagos` (simulado).
- `ReservaService`:
  1. Validar que la Sala esté `Disponible` (bloque 2).
  2. Validar que no haya cruce de horario: otra reserva de la misma
     `SalaID` con rango `[FechaHoraInicio, FechaHoraFin)` superpuesto →
     `409 Conflict`.
  3. Validar/descontar stock de los extras vía el servicio del bloque 2.
  4. Validar `NumParticipantes` contra `Salas.CapacidadMaxima` y
     `Paquetes.MaxParticipantes` — regla de negocio en el Service, el
     schema no la fuerza.
  5. Calcular `MontoTotal` (precio del paquete + extras).
  6. Insertar la fila correspondiente en `HistorialEstadosReserva` en
     cada cambio de `IdEstado` (incluida la creación).
  7. Persistir todo en una única transacción EF Core
     (`dbContext.Database.BeginTransaction()` o `SaveChanges` atómico si
     no hay múltiples `SaveChanges`).
- DTOs: `CrearReservaDTO`, `ReservaDetalleDTO`, `CrearPagoDTO`,
  `VoucherDTO`, `HistorialEstadoDTO`.

## Query de solapamiento (referencia)

```csharp
bool haySolapamiento = await _context.Reservas.AnyAsync(r =>
    r.SalaID == dto.SalaId &&
    r.Estado != "Cancelada" &&
    dto.FechaHoraInicio < r.FechaHoraFin &&
    dto.FechaHoraFin > r.FechaHoraInicio);
```

## Frontend — piezas a implementar

- Flujo de reserva: elegir sala → elegir paquete → elegir extras → elegir
  fecha/hora (mostrar horarios ya ocupados) → confirmar.
- Pantalla de pago simulado (formulario de tarjeta ficticio).
- Confirmación con voucher/resumen.
- Historial de reservas del cliente autenticado.

## Contrato de API

Completar en `docs/api-contracts.md#bloque-3--core-transaccional`.

## Coordinación con otros bloques

- Depende de bloque 2 para disponibilidad de Sala/Paquete y stock de
  Inventario — definir el contrato de esos servicios antes de empezar.
- Bloque 4 (Reportes) lee `Reservas` y `Pagos` para ingresos y horas pico.
