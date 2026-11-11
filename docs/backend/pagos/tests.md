# Tests — pagos

## `Services/PagoServiceTests.cs`

- `Crear_PagoConTarjetaExitoso_ConfirmaReserva`: tarjeta exitosa confirma
  la reserva (`IdEstado` pasa a `Confirmada`).
- `Crear_PagoConTarjetaRechazado_ReservaSigueySinTokenLanza`: tarjeta
  rechazada por Culqi → `400`, la reserva sigue `Pendiente`, el intento
  fallido queda como único `Pago` en la tabla.
- `Crear_PagoConTarjetaSinToken_LanzaReglaNegocio`: falta `CulqiToken` →
  `400` antes de llamar a Culqi.
- `Crear_PagoManualPorStaff_ConfirmaReserva`: Staff registra Efectivo
  exitoso → confirma.
- `Crear_PagoManualPorCliente_LanzaReglaNegocio`: Cliente intentando
  confirmar un pago manual → `400` (no puede autoconfirmarse).
- `Crear_PagoManualNoExitoso_LanzaReglaNegocioYRegistraElIntento`: Staff
  registra un manual fallido → `400`, reserva sigue `Pendiente`, intento
  queda guardado con `Exitoso = false`.
- `Crear_MontoTotalCero_LanzaReglaNegocio`: paquete gratis (`Precio = 0`)
  → `400` *antes* de tocar la tabla `Pagos` — ningún registro se crea
  (evita el `CHECK (Monto > 0)` de la base).
- `Flujo_CrearConExtras_Pagar_Cancelar_DevuelveElStock`: flujo end-to-end
  cruzando los tres módulos (reservas, extras/inventario, pagos) —
  crea con extras, paga con tarjeta (monto = paquete + extras, nunca la
  columna calculada), cancela, verifica que el stock vuelve al valor
  original y que el historial de estado tiene las dos entradas
  esperadas (creación + `Pendiente→Confirmada`).
- `Crear_ReservaNoPendiente_LanzaConflicto`: reserva ya `Confirmada` →
  `409`.

## `Services/CulqiClientTests.cs`

Contra un `HttpMessageHandler` fake (sin red real):

- `CrearCargo_Aprobado_DevuelveExitosoConReferencia`: `200` → exitoso,
  devuelve el `id` del cargo.
- `CrearCargo_Rechazado_DevuelveNoExitosoConMensaje`: `402` → no exitoso,
  devuelve `user_message` de Culqi.
- `CrearCargo_ErrorInfraestructura_Lanza`: `500` → lanza
  `InvalidOperationException` (no se interpreta como rechazo).
- `CrearCargo_ErrorDeAutenticacion_Lanza`: `401` (API key inválida) →
  lanza, no se reporta como "tarjeta rechazada" — distingue fallo de
  configuración de rechazo real.
- `CrearCargo_RequestMalFormado_Lanza`: `400` → lanza, mismo criterio.

## `Services/ReservaPagoValidatorTests.cs` (casos de `CrearPagoValidator`)

- `CrearPago_IdMetodoPagoCero_Falla` / `CrearPago_Valido_Pasa`.
- `CrearPago_TransaccionRefDemasiadoLarga_Falla` (101 chars) /
  `CrearPago_TransaccionRefEnElLimite_Pasa` (100 chars exactos) — cubre
  el límite de `MaximumLength(100)` en ambos bordes.

## Cobertura de integración

No existe un `PagosEndpointsTests.cs` (ni ningún archivo bajo
`Backend.Tests/Integration/` que ejercite `POST /api/pagos` por HTTP) —
ver `notas.md`.
