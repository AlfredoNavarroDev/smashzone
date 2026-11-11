# salas

Catálogo de salas físicas donde se juegan las reservas. CRUD simple con
activación/desactivación (no hay borrado físico).

**Files:** `Controllers/SalasController.cs`, `Services/SalaService.cs`,
`DTOs/CatalogoDTOs.cs` (DTOs `Sala*`), `Validators/CatalogoValidators.cs`
(`CrearSalaValidator`, `ActualizarSalaValidator`), `Mapping/CatalogoProfile.cs`
(`Sala` → `SalaDTO`), `Models/Sala.cs`.

## Entidades / Tablas

| Entity | DB table | Notas |
|---|---|---|
| `Sala` | `Salas` | Relación 1:N con `Reserva` (una sala tiene muchas reservas). |

## Endpoints / entry points

| Method | Path | Auth | Input | Output |
|---|---|---|---|---|
| GET | `/api/salas?activa=` | **Anónimo** (`[AllowAnonymous]` sobre `[Authorize(Roles="Admin")]` de clase) | `activa: bool?` query | `List<SalaDTO>` ordenado por `Nombre` |
| GET | `/api/salas/{id}` | **Anónimo** | — | `SalaDTO` o 404 |
| POST | `/api/salas` | Admin | `CrearSalaDTO` | `201 SalaDTO` |
| PUT | `/api/salas/{id}` | Admin | `ActualizarSalaDTO` | `SalaDTO` |
| PUT | `/api/salas/{id}/estado` | Admin | `CambiarEstadoDTO { Activo: bool }` | `SalaDTO` |
