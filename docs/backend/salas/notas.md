# Notas — salas

## Dependencias

- `Reserva` (unit `reservas`) tiene FK a `Sala` — no se verificó en este
  pass si `ReservaService` consulta `Sala.Activa` antes de aceptar una
  reserva nueva. Gap abierto, cross-check pendiente con el unit
  `reservas`.
- `CatalogoDTOs.cs`, `CatalogoValidators.cs` y `CatalogoProfile.cs` son
  archivos compartidos con `paquetes` e `inventario` — cambios ahí
  afectan a los tres units.

## Notas

- No hay borrado físico de `Sala` — solo el flag `Activa`. Correcto dado
  que tiene reservas históricas con FK; un hard-delete rompería
  integridad referencial.
- Ninguna sala puede quedar "huérfana" de capacidad: `CapacidadMaxima`
  solo valida `> 0`, sin tope superior — una sala con capacidad 1,000,000
  pasa validación.
