# Notas — reservas

## Dependencias

- Consume `IInventarioService.DescontarStockAsync`/`ReponerStockAsync`
  (módulo `inventario`) — mutan la entidad trackeada sin `SaveChanges`
  propio, para componerse en la misma transacción de `CrearAsync`/
  `CambiarEstadoAsync`.
- Expone `AplicarConfirmacionPorPagoAsync` (en `IReservaService`) para
  que `PagoService` (módulo `pagos`) confirme la reserva dentro de su
  propia unidad de trabajo tras un pago exitoso
  (`PagoService.cs:73`, `await reservas.AplicarConfirmacionPorPagoAsync(reserva)`,
  antes de su propio `SaveChangesAsync`). Es el único punto de
  acoplamiento entre los dos módulos — `PagoService` no toca
  `HistorialEstadosReserva` ni `Reserva.IdEstado` directamente.
- Lee `Sala`/`Paquete` (módulos `salas`/`paquetes`) y `ItemsExtra`
  (módulo `inventario`) por id; no los posee.
- `ReservasEndpointsTests.cs` es compartido con el módulo `pagos` (el
  mismo fixture siembra datos para ambos) — ver `tests.md`.

## Notas

- **`ExencionesResponsabilidad` no está implementada en este módulo.**
  Existe la tabla/modelo (FK única 1:1 a `Reserva`) pero ningún código
  de `ReservaService`/`ReservasController` la lee ni la escribe. No es
  un descuido: `docs/superpowers/specs/2026-11-10-bloque3-core-transaccional-design.md`
  la declara explícitamente fuera de alcance del bloque 3. Sigue siendo
  un hueco funcional real (una reserva nunca queda con exención
  firmada) para quien use esa tabla en el futuro.
- **El listado `GET /api/reservas` no está paginado.** El spec de
  diseño (`...bloque3-core-transaccional-design.md`, sección 2) decía
  "reutiliza el patrón `PaginadoDTO<T>` ya usado en
  `AdminUsuariosController`" para este endpoint — la implementación
  final devuelve `List<ReservaDetalleDTO>` plano, sin paginar
  (`ReservasController.cs:27-29`, `ReservaService.cs:112-124`). Ni el
  código ni `docs/api-contracts.md` reflejan esa intención del spec;
  es drift entre el diseño aprobado y lo implementado, no documentado
  en ningún lado hasta ahora.
- `MontoTotal` (en `Reserva`) y `Subtotal` (en `DetallesReservaExtra`)
  son columnas SQL Server calculadas (`HasComputedColumnSql`,
  `SmashZoneDbContext.cs:50-52` y `:190-192`) — el `AutoMapper`
  (`ReservaProfile.cs:15` y `:20`) las recalcula en C# con la misma
  fórmula exacta en vez de leer el valor ya calculado por la base. Es
  deliberado y no causa drift porque la fórmula es idéntica en ambos
  lados, pero el cálculo existe por duplicado.
- Hay una carrera de concurrencia conocida y deliberadamente no
  resuelta: el chequeo de solapamiento en `CrearAsync` es un `SELECT`
  previo al `INSERT`, sin lock ni índice único — dos requests
  simultáneos para la misma sala/horario pueden crear reservas
  solapadas. Documentado en `docs/api-contracts.md` ("Límites
  conocidos", bloque 3), no en el código.
