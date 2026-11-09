# Bloque 3 — Core transaccional (Reservas + Pagos)

## Alcance

- Creación de reservas: sala, paquete, ítems extra, fecha/hora.
- **Prevención de solapamiento de horarios** (regla de negocio crítica del
  proyecto).
- Pago simulado + generación de comprobante (voucher DTO).
- Registro y transición de estado de la reserva: `Pendiente` →
  `Confirmada` → `En Curso` → `Completada` / `Cancelada`.

## Entidades dueñas

`Reservas`, `DetalleReservaExtras`, `Pagos`.

## Backend — piezas a implementar

- `ReservasController`: `POST /api/reservas`, `GET /api/reservas/{id}`,
  `PUT /api/reservas/{id}/estado`, `GET /api/reservas` (historial del
  usuario autenticado o, para Staff/Admin, de todas).
- `PagosController`: `POST /api/pagos` (simulado).
- `ReservaService`:
  1. Validar que la Sala esté `Disponible` (bloque 2).
  2. Validar que no haya cruce de horario: otra reserva de la misma
     `SalaID` con rango `[FechaHoraInicio, FechaHoraFin)` superpuesto →
     `409 Conflict`.
  3. Validar/descontar stock de los extras vía el servicio del bloque 2.
  4. Calcular `MontoTotal` (precio del paquete + extras).
  5. Persistir todo en una única transacción EF Core
     (`dbContext.Database.BeginTransaction()` o `SaveChanges` atómico si
     no hay múltiples `SaveChanges`).
- DTOs: `CrearReservaDTO`, `ReservaDetalleDTO`, `CrearPagoDTO`,
  `VoucherDTO`.

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
