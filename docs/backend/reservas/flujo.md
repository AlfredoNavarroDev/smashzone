# Flujo — reservas

## `POST /api/reservas` → `ReservaService.CrearAsync`

Orden real de validación (`Services/ReservaService.cs:35-102`):

1. Si el actor es Staff/Admin y manda `IdCliente` en el DTO, se usa ese
   id como dueño de la reserva (se verifica que el usuario exista, 404
   si no). Si el actor es Cliente, `IdCliente` del DTO se ignora por
   completo — la reserva siempre queda a nombre del id del token.
2. `Sala` debe existir (404) y estar `Activa` (400).
3. `Paquete` debe existir (404) y estar `Activo` (400).
4. `FechaHoraInicio` debe ser futura respecto a `TimeProvider.GetUtcNow()`
   (400) — inyectado como `TimeProvider time`, no `DateTime.UtcNow`
   directo, para que los tests controlen el reloj.
5. `NumParticipantes` no puede superar `Sala.CapacidadMaxima` ni
   `Paquete.MaxParticipantes` (400, mensaje distinto por cada caso).
6. `FechaHoraFin` se calcula server-side: `FechaHoraInicio +
   Paquete.DuracionMinutos`. El cliente nunca la manda.
7. Chequeo de solapamiento: cualquier `Reserva` de la misma `IdSala` con
   estado `!= Cancelada` cuyo rango `[FechaHoraInicio, FechaHoraFin)`
   se cruce con el nuevo rango → `409 ConflictoException`. Una reserva
   `Cancelada` nunca bloquea el horario (`Crear_NoSolapaConReservaCancelada`).
8. Por cada extra del DTO: el ítem debe existir (404), y
   `IInventarioService.DescontarStockAsync` descuenta stock — lanza 400
   si no hay suficiente o el ítem está inactivo (lógica del módulo
   `inventario`, no duplicada aquí). El precio se congela en
   `DetallesReservaExtra.PrecioUnitarioHistorico` en el momento de la
   reserva, leído con `AsNoTracking()` para no arrastrar la entidad
   `ItemsExtra` al mismo `SaveChanges`.
9. Arma en memoria: `Reserva` (estado `Pendiente`, `MontoPaquete =
   Paquete.Precio`, `MontoExtras = Σ precio histórico × cantidad`) +
   sus `DetallesReservaExtra` + una fila de `HistorialEstadosReserva`
   con `IdEstadoAnterior = null`. **Un solo `SaveChangesAsync()`** al
   final — no hay `BeginTransaction()` explícito porque todo el grafo
   se persiste atómico en ese único call.
10. Recarga la reserva completa (`CargarConEstado`) para mapear el DTO
    de respuesta — necesario porque el insert inicial no tiene las
    navegaciones (`IdEstadoNavigation`, etc.) cargadas.

## `PUT /api/reservas/{id}/estado` → `ReservaService.CambiarEstadoAsync`

1. Carga la reserva; si el actor no es Staff/Admin y no es el dueño →
   `404 NoEncontradoException` (nunca `403`, para no revelar que la
   reserva existe si es de otro cliente).
2. `Confirmada` como destino siempre es `400` — no se puede alcanzar por
   este endpoint, solo automáticamente vía pago exitoso
   (`AplicarConfirmacionPorPagoAsync`, abajo).
3. Si el estado actual ya es `Completada` o `Cancelada` (terminal),
   cualquier transición es `400`.
4. Máquina de transiciones válidas (`ReservaService.cs:139-146`):

   ```
   Pendiente   → Cancelada
   Confirmada  → Cancelada
   Confirmada  → EnProceso
   EnProceso   → Completada
   ```

   Cualquier combinación fuera de esta tabla → `400`.
5. Permisos por transición: a `Cancelada` puede hacerlo el cliente
   dueño o Staff/Admin; cualquier otra transición válida (`EnProceso`,
   `Completada`) exige Staff/Admin — un Cliente que la intente recibe
   `400` (`ReglaNegocioException`, no `403`: la regla vive en el
   dominio, no en un atributo de autorización).
6. Si el destino es `Cancelada`, repone stock de cada
   `DetallesReservaExtra` vía `IInventarioService.ReponerStockAsync`
   antes de persistir.
7. Actualiza `IdEstado`, agrega fila a `HistorialEstadosReserva`
   (`IdUsuarioCambio` queda `null` si quien cambió fue el propio
   cliente — solo se registra el usuario cuando actúa Staff/Admin) y
   hace un solo `SaveChangesAsync()`.
8. Recarga la entidad para el DTO de respuesta — comentario explícito
   en el código (`ReservaService.cs:166-167`) sobre por qué: el
   `EstadosAsync()` interno usa `AsNoTracking()`, así que no actualiza
   el identity map y la entidad en memoria quedaría con la navegación
   de estado vieja si no se recarga.

## Confirmación automática por pago — `AplicarConfirmacionPorPagoAsync`

Método interno de `IReservaService`, **no expuesto por ningún endpoint
propio** — lo llama `PagoService` (módulo `pagos`) cuando un pago se
registra como exitoso, dentro de la misma unidad de trabajo (no hace su
propio `SaveChangesAsync`, el llamador persiste todo junto). Ver
`notas.md` para el punto exacto de acoplamiento.

Guarda defensiva propia (no confía en que `PagoService` ya validó el
estado): solo aplica si la reserva está en `Pendiente`; si no,
`400 ReglaNegocioException` — cubierto por
`AplicarConfirmacionPorPago_ReservaNoPendiente_LanzaReglaNegocio`.

## `GET /api/reservas` — listado

Cliente: solo sus propias reservas. Staff/Admin: todas, con filtro
opcional `?estado=` exacto por nombre. Incluye siempre
`IdEstadoNavigation`, `IdSalaNavigation`, `IdPaqueteNavigation` y
`DetallesReservaExtras.IdItemExtraNavigation` — una sola consulta,
ordenada por `FechaCreacion` descendente.

## `GET /api/reservas/{id}/historial`

Solo `Admin`/`Staff` (atributo de autorización a nivel de acción, no de
clase — el único endpoint de este controller con ese patrón). Devuelve
la línea de tiempo completa ordenada por `FechaCambio` ascendente, sin
filtrar por dueño.
