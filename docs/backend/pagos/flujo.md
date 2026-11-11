# Flujo — pagos

## `POST /api/pagos` → `PagoService.CrearAsync`

1. **Resuelve método de pago.** `MetodosPago` por `IdMetodoPago` — `404`
   (`NoEncontradoException`) si no existe.

2. **Resuelve reserva** con `IdEstadoNavigation` e `IdClienteNavigation`
   cargados — `404` si no existe.

3. **Autorización por dueño, no por rol de controller.** Si el actor no
   es Staff/Admin y no es el dueño de la reserva (`reserva.IdCliente !=
   actorId`), lanza `404` — **no** `403`. Mismo patrón que
   `ReservaService`: no revela que la reserva existe a quien no es su
   dueño (`PagoService.cs:28-29`).

4. **Estado de la reserva.** Si `IdEstadoNavigation.Nombre !=
   ReservaService.EstadoPendiente`, `409` (`ConflictoException`). Solo se
   puede pagar una reserva `Pendiente`; ya confirmada o cancelada, rechaza.

5. **Calcula el monto.** `MontoPaquete + MontoExtras` de la reserva — el
   cliente nunca manda el monto, no existe campo `Monto` en
   `CrearPagoDTO`. Si el total es `<= 0`, `400`
   (`ReglaNegocioException`) **antes** de tocar Culqi o la base — evita
   que un paquete de precio `0` (catálogo válido, `Precio >= 0`) choque
   contra el `CHECK (Monto > 0)` de la tabla `Pagos` como un
   `DbUpdateException` sin traducir (`PagoService.cs:34-38`).

6. **Rama por método, por nombre literal** (`PagoService.MetodoTarjeta =
   "Tarjeta de Crédito/Débito"` — comparación por string, no por un
   enum/flag en la tabla `MetodosPago`; ver `dudas-recurrentes.md`):

   - **Tarjeta:** requiere `CulqiToken` no vacío (`400` si falta, antes de
     llamar a Culqi). Llama
     `ICulqiClient.CrearCargoAsync(token, montoEnCentimos, email)`. Si
     `resultado.Exitoso == false` → registra el intento fallido (paso 7)
     y lanza `400` con el mensaje de Culqi. Si es exitoso,
     `transaccionRef = resultado.ReferenciaCargo` (el id de cargo de
     Culqi).
   - **Cualquier otro método** (Efectivo, Transferencia Bancaria): exige
     `actorEsStaffOAdmin` (`400` si no — un Cliente no puede
     autoconfirmarse un pago manual). Exige `dto.Exitoso` no nulo (`400`
     si falta). Si `dto.Exitoso == false` → registra el intento fallido y
     lanza `400` con mensaje fijo. Si es `true`, `transaccionRef =
     dto.TransaccionRef` (lo que mandó el llamador, sin validar que
     corresponda a nada real — es un registro de confianza en quien opera).

7. **Intento fallido** (`RegistrarIntentoFallidoAsync`): inserta un
   `Pago` con `Exitoso = false`, `TransaccionRef = null`, y hace
   `SaveChangesAsync` **antes** de lanzar la excepción — el registro del
   rechazo persiste aunque la request termine en `400`. Tarjeta rechazada
   y pago manual fallido comparten exactamente este camino y el mismo
   contrato de respuesta (`400`, nunca un `201` con `exitoso: false`).

8. **Pago exitoso** (único camino que llega aquí sin haber lanzado):
   inserta `Pago` con `Exitoso = true`, `FechaPago =
   time.GetUtcNow().UtcDateTime` (UTC, vía `TimeProvider` inyectado —
   testeable), y llama
   `IReservaService.AplicarConfirmacionPorPagoAsync(reserva)` — ese
   método (documentado en el módulo `reservas`) hace la transición
   `Pendiente → Confirmada` y escribe el historial de estado. **Un solo
   `SaveChangesAsync`** al final persiste el `Pago` nuevo y el cambio de
   estado de la reserva juntos.

9. Devuelve `VoucherDTO` con `EstadoReserva =
   ReservaService.EstadoConfirmada` hardcodeado (no se vuelve a leer el
   estado real de la reserva — es correcto porque es el único desenlace
   posible al llegar aquí, pero significa que el DTO no refleja el estado
   post-si acaso `AplicarConfirmacionPorPagoAsync` cambiara de
   comportamiento a futuro).

## Acoplamiento con el módulo `reservas`

`PagoService` depende de `IReservaService.AplicarConfirmacionPorPagoAsync`
para la transición de estado — la lógica de esa transición (qué historial
escribe, qué pasa con el stock de extras) vive y se documenta en
`docs/backend/reservas/`, no aquí. También usa la constante pública
`ReservaService.EstadoPendiente` / `EstadoConfirmada` para comparar
nombres de estado por string en vez de por id.

## Límites conocidos (ya documentados en `docs/api-contracts.md`)

- **Dos pagos simultáneos sobre la misma reserva `Pendiente`:** el check
  de estado (paso 4) es una lectura previa sin lock. Dos requests
  concurrentes pueden pasar ambas la validación y cobrar dos veces en
  Culqi antes de que cualquiera persista — no hay `Idempotency-Key` ni
  lock optimista/pesimista sobre la reserva.
- **Cancelar una reserva ya `Confirmada` no reembolsa:** el módulo
  `reservas` repone stock de extras al cancelar, pero no anula el `Pago`
  exitoso previo ni llama a Culqi para un reembolso — queda como proceso
  manual fuera de este bloque.
