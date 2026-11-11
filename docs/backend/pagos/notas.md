# Notas — pagos

## Dependencias

- Depende de `IReservaService.AplicarConfirmacionPorPagoAsync` (módulo
  `reservas`) para la transición de estado tras un pago exitoso.
- Depende de `ICulqiClient` (este mismo módulo) para el cobro con
  tarjeta, inyectado vía `AddHttpClient` en `Program.cs`.
- Consumido por `docs/backend/reportes` (`ingresos-por-mes` agrega
  `Pago.Monto` donde `Exitoso = true`) — ese módulo documenta su propia
  lectura, no se repite aquí.

## Notas

- **Sin test de integración HTTP.** No existe `PagosEndpointsTests.cs` —
  a diferencia de `auth`, `catalogo`, `reservas` y `reportes`, que sí
  tienen su archivo en `Backend.Tests/Integration/`. El flujo completo
  (incluyendo el `[Authorize]` sin rol del controller, y el
  `actorEsStaffOAdmin` calculado desde `User.IsInRole` en
  `PagosController.cs:17`) solo está cubierto a nivel de servicio, nunca
  a través del pipeline HTTP real (middleware de excepciones, JWT,
  `FluentValidationFilter`) para este endpoint específico.
- **Sin timeout explícito a Culqi** y sin test que cubra qué pasa si la
  pasarela no responde — ver `dudas-recurrentes.md`.
- **Comparación por nombre literal del método de pago** en vez de un
  flag — frágil ante un método de pago automático nuevo (ver
  `dudas-recurrentes.md`).
- **Sin idempotencia / lock sobre la reserva al pagar** — ya documentado
  en `docs/api-contracts.md` ("Límites conocidos"), repetido aquí en
  `flujo.md` porque es central al comportamiento de este módulo.
