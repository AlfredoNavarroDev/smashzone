# Notas — paquetes

## Dependencias

- Consumido por `reservas` (`Reserva.IdPaquete` FK, `FK_Reservas_Paquetes`,
  `OnDelete(ClientSetNull)` — sin efecto práctico porque no existe
  endpoint de borrado de `Paquete`).
- Consumido por `reportes`: `ReportesService.PaqueteMasDemandadoAsync`
  agrupa `Reservas` por `IdPaquete` y usa `IdPaqueteNavigation.Nombre`
  para el ranking de demanda (no re-documentado aquí, ver
  `docs/backend/reportes/`).
- `DTOs/CatalogoDTOs.cs`, `Validators/CatalogoValidators.cs` y
  `Mapping/CatalogoProfile.cs` son archivos compartidos con `salas` e
  `inventario` — cada unidad documenta solo su porción.

## Notas

- Nombre único: el check de servicio compara con `==` en LINQ-to-EF,
  traducido a SQL por EF Core; la sensibilidad a mayúsculas real depende
  de la collation de la columna/BD, no confirmada leyendo solo el código
  de la app — abierto.
- La columna `Activo` tiene `HasDefaultValue(true)` y `CantidadItemsEstandar`
  `HasDefaultValue(15)` / `MaxParticipantes` `HasDefaultValue(1)` a nivel
  DB (`SmashZoneDbContext.cs:171-173`), pero el service siempre envía
  estos valores explícitamente al insertar — los defaults de columna solo
  aplicarían ante un insert que los omita fuera de este código (ej. script
  SQL directo), no se ejercitan en la práctica vía la API.
- Sin test de integración dedicado a `/api/paquetes` (ver `tests.md`) —
  gap menor, el patrón de auth ya está cubierto por `salas` a nivel HTTP.
