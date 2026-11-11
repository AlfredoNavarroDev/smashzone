# Tests — reservas

## `Backend.Tests/Services/ReservaServiceTests.cs`

- `Crear_Valida_PersisteConEstadoPendienteYHistorialInicial` — happy
  path: estado `Pendiente`, `MontoTotal` correcto, una sola fila de
  historial con `IdEstadoAnterior`/`IdUsuarioCambio` en `null`.
- `Crear_ConExtras_DescuentaStockYSumaMontoExtras` — verifica el
  descuento real de stock y que `MontoExtras` suma precio histórico ×
  cantidad.
- `Crear_SalaInactiva_LanzaReglaNegocio`, `Crear_FechaEnElPasado_...`,
  `Crear_SuperaCapacidadSala_...`, `Crear_StockInsuficiente_...` — cada
  regla de validación de `CrearAsync` por separado.
- `Crear_Solapamiento_LanzaConflicto` / `Crear_NoSolapaConReservaCancelada`
  — el filtro de solapamiento sí cruza contra reservas activas y nunca
  contra una `Cancelada`.
- `Crear_StaffReservaParaOtroCliente_UsaIdClienteDelDto` — Staff puede
  reservar a nombre de otro usuario.
- `CambiarEstado_ClienteCancelaPropia_ReponeStockYQuedaCancelada` —
  cancelación repone stock y agrega la segunda fila de historial.
- `CambiarEstado_SinEstadosTrackeados_DevuelveElEstadoNuevoEnElDTO` —
  caso adversarial explícito: limpia el `ChangeTracker` a mitad de
  prueba para forzar que el DTO de respuesta solo pueda ser correcto si
  el service recarga la entidad (prueba directamente el comentario de
  `ReservaService.cs:166-167`).
- `CambiarEstado_ClienteCancelaReservaAjena_LanzaNoEncontrado` — 404,
  no 403, sobre reserva de otro cliente.
- `CambiarEstado_ClienteIntentaEnProceso_LanzaReglaNegocio` — transición
  válida en la máquina de estados, pero rechazada por rol.
- `CambiarEstado_StaffAvanzaConfirmadaAEnProcesoYCompletada` — camino
  feliz completo de las dos transiciones exclusivas de Staff/Admin.
- `CambiarEstado_DesdeEstadoTerminal_LanzaReglaNegocio` — ninguna
  transición sale de `Completada`.
- `AplicarConfirmacionPorPago_ReservaNoPendiente_LanzaReglaNegocio` —
  la guarda defensiva del método interno se dispara aun si el llamador
  (`PagoService`) no la invocó con una reserva `Pendiente`; no se
  inserta historial.
- `CambiarEstado_ConfirmadaManual_LanzaReglaNegocio` — `PUT /estado`
  nunca acepta `Confirmada`, ni siquiera para Staff/Admin.

## `Backend.Tests/Services/ReservaPagoValidatorTests.cs`

Casos de `CrearReservaValidator`/`CambiarEstadoReservaValidator`
(comparte archivo con los validators de `pagos` — ver ese módulo para
los suyos).

## `Backend.Tests/Integration/ReservasEndpointsTests.cs`

Comparte archivo con integración de `pagos` (el fixture siembra
`MetodosPago` y `EstadosReserva` para ambos). Casos propios de este
módulo:
- `PostReservas_SinToken_Da401`.
- `PostReservas_ComoCliente_Da201_YGetPropia_Da200` — camino feliz HTTP.
- `GetHistorial_ComoCliente_Da403` — confirma que el atributo de rol en
  el endpoint de historial sí se aplica a nivel HTTP, no solo en el
  service.
