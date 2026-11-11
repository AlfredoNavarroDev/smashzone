# Dudas recurrentes — Inventario

**P: ¿Desactivar un ítem (`PUT /estado`) rompe las reservas que ya lo usaron?**
R: No. `CambiarEstadoAsync` solo cambia el flag `Activo`
(`Services/InventarioService.cs:76-82`); no toca `DetallesReservaExtra`
existentes, que guardan su propio `PrecioUnitarioHistorico`. El flag solo
bloquea *nuevos* descuentos de stock (`DescontarStockAsync` revisa
`i.Activo`, línea 88).

**P: ¿Por qué `DescontarStockAsync`/`ReponerStockAsync` no llaman `SaveChangesAsync`?**
R: Para que el caller (`ReservaService`, Bloque 3) pueda persistir reserva
+ detalles + ajuste de stock en una sola transacción atómica, misma
instancia scoped de `DbContext`. Contrato documentado explícitamente en
el XML-doc de `IInventarioService` (`Services/InventarioService.cs:18-36`).

**P: ¿Qué pasa si dos reservas descuentan stock del mismo ítem al mismo tiempo?**
R: No hay protección — `ItemsExtra` no tiene columna de concurrencia
optimista, así que ambas lecturas pueden ver el mismo `StockDisponible`
antes de que cualquiera persista. Documentado como responsabilidad del
módulo de Reservas, sin resolver aquí.

**P: ¿La unicidad de `Nombre` da 400 o 409?**
R: 409 (`ConflictoException`) — es una regla de negocio en el service
(`ValidarNombreUnico`), no una validación de FluentValidation. La tabla
tiene además un índice único como respaldo (`SmashZoneDbContext.cs:125`).
