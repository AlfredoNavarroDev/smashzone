# Diseño: Bloque 4 (parcial) — Reportes (backend)

**Fecha:** 2026-11-10
**Estado:** Aprobado

## Contexto

Bloques 1 (Auth), 2 (Catálogo) y 3 (Core transaccional: Reservas + Pagos)
ya están implementados y testeados (124/124 tests en verde en la rama
`feature/reservas-pagos-core-transaccional`). Bloque 4
(`docs/modulos/bloque-4-reportes.md`) cubre dos piezas independientes:
reportes/dashboard y el shell base del Frontend. Esta iteración cubre
**solo la pieza de backend de reportes** — el shell de Frontend y el
dashboard visual quedan fuera, documentados como dependencia pendiente
para quien tome esa pieza.

Objetivo: 3 endpoints de solo lectura que agregan datos ya existentes de
`Reservas` y `Pagos` (Bloque 3) para alimentar el futuro dashboard. No
modifican ninguna tabla de otros bloques.

## Decisiones

### 1. Acceso

Los 3 endpoints usan `[Authorize(Roles = "Admin")]` a nivel de clase —
mismo patrón que `PaquetesController`/`SalasController`/
`InventarioController`. Staff no tiene acceso (a diferencia de
Reservas, donde Staff opera sobre reservas; aquí Staff no necesita ver
métricas de negocio agregadas).

### 2. Filtro de fechas

Los 3 endpoints aceptan `desde`/`hasta` opcionales como query params
(`DateTime?`). Si ambos vienen y `desde > hasta`, `ReglaNegocioException`
(400) — validación inline en el service, sin FluentValidation (no hay
DTO de request con cuerpo, son query params simples, mismo criterio que
`estado` en `ReservasController.Listar`).

El campo de fecha que filtra cada reporte es el relevante a su dominio,
no uno fijo para los tres:
- `ingresos-por-mes` filtra por `Pago.FechaPago`.
- `paquete-mas-demandado` y `horas-pico` filtran por `Reserva.FechaHoraInicio`.

Sin `desde`/`hasta`: agrega sobre todo el histórico.

### 3. `GET /api/reportes/ingresos-por-mes`

Agrupa `Pagos` donde `Exitoso == true` (los intentos rechazados no son
ingreso real) por año-mes de `FechaPago`, sumando `Monto`.

`IngresoMesDTO`:
```
{ Anio: int, Mes: int, TotalIngresos: decimal }
```
Ordenado por `Anio, Mes` ascendente.

### 4. `GET /api/reportes/paquete-mas-demandado`

Agrupa `Reservas` donde `Estado != "Cancelada"` por `IdPaquete`, cuenta
reservas. Devuelve el **ranking completo** (no solo el top 1) para que
el dashboard pueda graficar todos los paquetes, ordenado desc por
conteo.

`PaqueteDemandaDTO`:
```
{ IdPaquete: int, Paquete: string, TotalReservas: int }
```

### 5. `GET /api/reportes/horas-pico`

Agrupa las mismas `Reservas` (`Estado != "Cancelada"`, filtro por
`FechaHoraInicio`) por hora del día de `FechaHoraInicio` (`.Hour`,
0–23), cuenta, ranking desc.

`HoraPicoDTO`:
```
{ Hora: int, TotalReservas: int }
```

### 6. Capa de servicio

`IReportesService` / `ReportesService(SmashZoneDbContext db)` — sin
`TimeProvider` (no genera timestamps, solo lee) ni `IMapper` (las 3
queries proyectan directo a los DTOs vía LINQ, no hay una entidad 1:1
que mapear como en los otros bloques).

```csharp
public interface IReportesService
{
    Task<List<IngresoMesDTO>> IngresosPorMesAsync(DateTime? desde, DateTime? hasta);
    Task<List<PaqueteDemandaDTO>> PaqueteMasDemandadoAsync(DateTime? desde, DateTime? hasta);
    Task<List<HoraPicoDTO>> HorasPicoAsync(DateTime? desde, DateTime? hasta);
}
```

Cada método valida `desde > hasta` al inicio (mismo chequeo repetido 3
veces — no hay DTO de request compartido que lo centralice, y
extraerlo a un helper privado es aceptable pero no obligatorio).

### 7. Controller

```csharp
[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/reportes")]
public class ReportesController(IReportesService reportes) : ControllerBase
{
    [HttpGet("ingresos-por-mes")]
    public async Task<ActionResult<List<IngresoMesDTO>>> IngresosPorMes([FromQuery] DateTime? desde, [FromQuery] DateTime? hasta) =>
        await reportes.IngresosPorMesAsync(desde, hasta);

    [HttpGet("paquete-mas-demandado")]
    public async Task<ActionResult<List<PaqueteDemandaDTO>>> PaqueteMasDemandado([FromQuery] DateTime? desde, [FromQuery] DateTime? hasta) =>
        await reportes.PaqueteMasDemandadoAsync(desde, hasta);

    [HttpGet("horas-pico")]
    public async Task<ActionResult<List<HoraPicoDTO>>> HorasPico([FromQuery] DateTime? desde, [FromQuery] DateTime? hasta) =>
        await reportes.HorasPicoAsync(desde, hasta);
}
```

Sin DI nueva de servicios externos — solo
`builder.Services.AddScoped<IReportesService, ReportesService>();` en
`Program.cs`.

### 8. Testing

- Unitarios de servicio (`ReportesServiceTests`, xUnit + `TestDb`):
  - `IngresosPorMes`: suma solo `Exitoso=true`, agrupa correctamente por
    mes, respeta `desde`/`hasta`, ignora pagos fuera de rango.
  - `PaqueteMasDemandado`: excluye `Cancelada`, cuenta bien, ordena desc.
  - `HorasPico`: excluye `Cancelada`, agrupa por hora, ordena desc.
  - Los 3: `desde > hasta` lanza `ReglaNegocioException`.
- Integración (`ReportesEndpointsTests`, `IClassFixture<ApiFactory>`):
  sin token → 401; token de Cliente → 403; token de Admin → 200 en los
  3 endpoints (happy path, no hace falta re-probar cada regla de
  agregación a nivel HTTP, eso ya lo cubren los unitarios).

### 9. Documentación de contratos

Reemplazar el placeholder `## Bloque 4 — Reportes` en
`docs/api-contracts.md` con los 3 endpoints, sus query params y shapes
de respuesta (igual nivel de detalle que Bloque 3).

## Fuera de alcance

- Dashboard visual / librería de gráficos (Frontend, Bloque 4).
- Shell base del Frontend (Router, layout, tema) — Bloque 4, pieza
  independiente de esta.
- Cualquier endpoint de reportes adicional no listado en
  `docs/modulos/bloque-4-reportes.md` (ej. por sala, por cliente) — no
  pedido, no se agrega (YAGNI).
