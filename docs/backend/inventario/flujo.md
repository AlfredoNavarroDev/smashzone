# Flujo — Inventario

## Listar / Obtener

Proyección directa a `ItemExtraDTO` vía `ProjectTo` (AutoMapper), sin
tracking. `Listar` filtra opcionalmente por `categoria` (igualdad exacta,
no `Contains`) y `activo`.

## Crear

Valida nombre único (`ValidarNombreUnico`, case-sensitive por comparación
exacta en SQL) antes de insertar. `Activo` se fuerza a `true` al crear —
no es parte de `CrearItemExtraDTO`.

## Actualizar

Reemplaza todos los campos editables (`Nombre`, `Categoria`,
`PrecioUnitario`, `StockDisponible`); no toca `Activo`. Revalida nombre
único excluyendo el propio id.

## CambiarEstado (`PUT /{id}/estado`)

Solo cambia el flag `Activo`. **No tiene efecto retroactivo**: no
revisa ni modifica reservas existentes que ya referencian el ítem vía
`DetallesReservaExtra` — esas filas guardan `PrecioUnitarioHistorico` propio
y no dependen del ítem seguir activo. El flag solo compuerta llamadas
*futuras* a `DescontarStockAsync`.

## DescontarStockAsync / ReponerStockAsync (no son endpoints HTTP)

Invocados por `ReservaService` (Bloque 3) dentro de su propia transacción.
Contrato explícito en el XML-doc de la interfaz
(`Services/InventarioService.cs:18-36`): **mutan la entidad trackeada en
memoria pero no llaman `SaveChangesAsync`** — el caller persiste todo
junto (reserva + detalles + stock) en una sola transacción, misma
instancia de `DbContext` (scoped por request).

- `DescontarStockAsync`: `ReglaNegocioException` (400) si `cantidad <= 0`,
  si el ítem está inactivo, o si `StockDisponible < cantidad`.
- `ReponerStockAsync`: `ReglaNegocioException` (400) si `cantidad <= 0`.
  No valida que el ítem esté activo (se puede reponer stock de un ítem
  desactivado — ej. al cancelar una reserva vieja que lo usó mientras
  estaba activo).
- Ambos lanzan `NoEncontradoException` (404) si el id no existe.

**Sin protección de concurrencia**: `ItemsExtra` no tiene columna de
concurrencia optimista. Dos reservas simultáneas sobre el mismo ítem
pueden leer el mismo `StockDisponible` antes de que cualquiera persista —
el módulo de Reservas es responsable de serializar el acceso si esto
importa en producción (documentado explícitamente en el XML-doc de la
interfaz, no es un olvido).
