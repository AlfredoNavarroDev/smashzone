# Inventario

Ítems extra (vasos, platos, etc.) que un cliente puede agregar a una
reserva por una cantidad y precio adicional. El catálogo es administrado
por Admin; el descuento/reposición de stock lo invoca el módulo de
Reservas (Bloque 3), no un endpoint propio.

**Files:** `Controllers/InventarioController.cs`,
`Services/InventarioService.cs`, DTOs de ítem extra en
`DTOs/CatalogoDTOs.cs` (compartido con `salas`/`paquetes` — ver esos
módulos para el resto del archivo), validadores en
`Validators/CatalogoValidators.cs`.

## Entidades / Tablas

| Entidad | Tabla | Notas |
|---|---|---|
| `ItemsExtra` | `ItemsExtra` | `Nombre` único (`UQ__ItemsExt__...`). Relación 1:N con `DetallesReservaExtra` (Bloque Reservas) vía `IdItemExtra`, `OnDelete(ClientSetNull)`. |

## Endpoints

| Method | Path | Auth | Input | Output |
|---|---|---|---|---|
| GET | `/api/inventario` | Anónimo (`[AllowAnonymous]`) | query `categoria?`, `activo?` | `List<ItemExtraDTO>` ordenado por `Nombre` |
| GET | `/api/inventario/{id}` | Anónimo | — | `ItemExtraDTO` o 404 |
| POST | `/api/inventario` | Admin | `CrearItemExtraDTO` | 201 + `ItemExtraDTO` |
| PUT | `/api/inventario/{id}` | Admin | `ActualizarItemExtraDTO` | `ItemExtraDTO` |
| PUT | `/api/inventario/{id}/estado` | Admin | `CambiarEstadoDTO { Activo: bool }` | `ItemExtraDTO` |

Las dos lecturas están marcadas `[AllowAnonymous]` a pesar del
`[Authorize(Roles = "Admin")]` a nivel de clase — igual patrón que
`SalasController`/`PaquetesController`: catálogo público de lectura,
mutación solo Admin.
