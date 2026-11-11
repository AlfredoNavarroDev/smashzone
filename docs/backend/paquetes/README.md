# paquetes

Catálogo de paquetes de juego (duración, precio, capacidad, cantidad de
ítems estándar incluidos). Es el catálogo que el cliente elige al crear
una reserva.

**Files:** `Controllers/PaquetesController.cs`, `Services/PaqueteService.cs`,
`DTOs/CatalogoDTOs.cs` (DTOs de Paquete), `Validators/CatalogoValidators.cs`
(validadores de Paquete), `Mapping/CatalogoProfile.cs` (mapeo de Paquete).

## Entidades / Tablas

| Entidad | Tabla | Notas |
|---|---|---|
| `Paquete` | `Paquetes` | `Nombre` único (índice `UQ__Paquetes...`). Relación 1:N con `Reserva` (`Reserva.IdPaquete`). **No** tiene relación con `ItemsExtra` — `CantidadItemsEstandar` es solo un entero informativo, no una FK al inventario (ver `notas.md`). |

## Endpoints / entry points

| Method | Path | Auth | Input | Output |
|---|---|---|---|---|
| GET | `/api/paquetes` | Anónimo (`[AllowAnonymous]`) | query `activo?: bool` | `List<PaqueteDTO>` ordenado por `Nombre` |
| GET | `/api/paquetes/{id}` | Anónimo | — | `PaqueteDTO` |
| POST | `/api/paquetes` | Admin | `CrearPaqueteDTO` | `201 PaqueteDTO` |
| PUT | `/api/paquetes/{id}` | Admin | `ActualizarPaqueteDTO` | `PaqueteDTO` |
| PUT | `/api/paquetes/{id}/estado` | Admin | `CambiarEstadoDTO { Activo }` | `PaqueteDTO` |

`[Authorize(Roles = "Admin")]` está a nivel de clase; los dos GET se abren
con `[AllowAnonymous]` (el catálogo debe verse sin login). No hay endpoint
de borrado — el ciclo de vida es soft a través de `estado`.
