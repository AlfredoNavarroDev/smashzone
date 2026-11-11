# reportes

Reportes de solo lectura que agregan datos ya existentes de `Reservas` y
`Pagos` (unidades `reservas` y `pagos`) para alimentar el futuro dashboard
de administración. No modifica ninguna tabla — los 3 endpoints son
consultas de agregación puras.

**Files:** `Controllers/ReportesController.cs`, `Services/ReportesService.cs`,
`DTOs/ReporteDTOs.cs`.

## Entidades / Tablas

No define entidades propias. Lee `Pago` (unidad `pagos`) y `Reserva`
(unidad `reservas`) vía `SmashZoneDbContext`, sin trackear cambios
(`AsNoTracking`).

## Endpoints / entry points

| Method | Path | Auth | Input | Output |
|---|---|---|---|---|
| GET | `/api/reportes/ingresos-por-mes` | Admin | `desde?`, `hasta?` (query, `DateTime`) | `List<IngresoMesDTO>` |
| GET | `/api/reportes/paquete-mas-demandado` | Admin | `desde?`, `hasta?` (query, `DateTime`) | `List<PaqueteDemandaDTO>` |
| GET | `/api/reportes/horas-pico` | Admin | `desde?`, `hasta?` (query, `DateTime`) | `List<HoraPicoDTO>` |

Todos con `[Authorize(Roles = "Admin")]` a nivel de clase — Staff no tiene
acceso (`Backend/Backend/Controllers/ReportesController.cs:9`). Sin esos
roles, llega a `ExcepcionesMiddleware` solo si la autorización de ASP.NET
falla antes de entrar al action (401/403 nativos, no `DomainException`).
