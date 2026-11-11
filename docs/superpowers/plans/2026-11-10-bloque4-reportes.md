# Bloque 4 (parcial) — Reportes (backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar 3 endpoints de solo lectura (`ingresos-por-mes`, `paquete-mas-demandado`, `horas-pico`) que agregan datos ya existentes de `Reservas` y `Pagos` (Bloque 3) para el futuro dashboard, sin modificar ninguna tabla.

**Architecture:** Mismo patrón Controller → Service → EF Core de Bloques 1/2/3, pero sin `AutoMapper` (las queries proyectan directo a DTOs, no hay una entidad 1:1 que mapear) ni `FluentValidation` (no hay DTO de request con cuerpo — son query params simples, validados inline en el service).

**Tech Stack:** .NET 10 Web API, EF Core 10, xUnit + SQLite in-memory (`TestDb`), `System.Net.Http.Json`.

**Spec:** `docs/superpowers/specs/2026-11-10-bloque4-reportes-design.md`

## Global Constraints

- Los 3 endpoints usan `[Authorize(Roles = "Admin")]` a nivel de clase — Staff no tiene acceso.
- `desde`/`hasta` son `DateTime?` opcionales en los 3 endpoints. Si ambos vienen y `desde > hasta`, lanzar `ReglaNegocioException` (400).
- Campo de fecha filtrado por endpoint: `ingresos-por-mes` → `Pago.FechaPago`. `paquete-mas-demandado` y `horas-pico` → `Reserva.FechaHoraInicio`.
- `ingresos-por-mes` solo suma `Pago.Exitoso == true`.
- `paquete-mas-demandado` y `horas-pico` excluyen reservas con `Estado == "Cancelada"`.
- Controllers nunca tocan `SmashZoneDbContext` directo ni devuelven entidades EF — siempre DTOs vía Service.
- Comparar `EstadosReserva`/`MetodosPago` siempre por `Nombre` (string), nunca por `Id` literal.
- Commits: Conventional Commits, sin línea de coautor (preferencia del usuario para este repo). No mezclar con cambios de otro bloque.

---

### Task 1: `ReportesService` (los 3 reportes)

**Files:**
- Create: `Backend/Backend/DTOs/ReporteDTOs.cs`
- Create: `Backend/Backend/Services/ReportesService.cs`
- Modify: `Backend/Backend.Tests/TestHelpers.cs`
- Test: `Backend/Backend.Tests/Services/ReportesServiceTests.cs`

**Interfaces:**
- Consumes: nada nuevo — lee `db.Pagos`/`db.Reservas` (Bloque 3, ya existen), `ReglaNegocioException` (ya existe en `Backend/Backend/Services/DomainExceptions.cs`).
- Produces: `IReportesService.IngresosPorMesAsync/PaqueteMasDemandadoAsync/HorasPicoAsync(DateTime?, DateTime?)`. Task 2 (`ReportesController`) los consume. `IngresoMesDTO`/`PaqueteDemandaDTO`/`HoraPicoDTO` — consumidos por Task 2.

- [ ] **Step 1: Escribir los DTOs (soporte del test)**

```csharp
// Backend/Backend/DTOs/ReporteDTOs.cs
namespace Backend.DTOs;

public record IngresoMesDTO(int Anio, int Mes, decimal TotalIngresos);
public record PaqueteDemandaDTO(int IdPaquete, string Paquete, int TotalReservas);
public record HoraPicoDTO(int Hora, int TotalReservas);
```

- [ ] **Step 2: Agregar `AddPago` a `TestHelpers.cs`**

En `Backend/Backend.Tests/TestHelpers.cs`, agregar al `TestDb`, junto a `AddReserva`:

```csharp
    public Pago AddPago(Reserva reserva, int idMetodoPago, decimal monto, bool exitoso = true, DateTime? fechaPago = null)
    {
        var p = new Pago
        {
            Id = Guid.NewGuid(), IdReserva = reserva.Id, IdMetodoPago = idMetodoPago,
            Monto = monto, Exitoso = exitoso, FechaPago = fechaPago ?? Time.Now.UtcDateTime
        };
        Db.Pagos.Add(p);
        Db.SaveChanges();
        return p;
    }
```

- [ ] **Step 3: Escribir el test que falla**

```csharp
// Backend/Backend.Tests/Services/ReportesServiceTests.cs
using Backend.Services;

namespace Backend.Tests.Services;

public class ReportesServiceTests : IDisposable
{
    private readonly TestDb _t = new();
    private readonly ReportesService _sut;

    public ReportesServiceTests()
    {
        _sut = new ReportesService(_t.Db);
    }
    public void Dispose() => _t.Dispose();

    [Fact]
    public async Task IngresosPorMes_SoloExitosos_SumaPorMes()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var reserva1 = _t.AddReserva(cliente, sala, paquete);
        var reserva2 = _t.AddReserva(cliente, sala, paquete, inicio: _t.Time.Now.UtcDateTime.AddDays(2));
        var idTarjeta = _t.Db.MetodosPagos.Single(m => m.Nombre == "Tarjeta de Crédito/Débito").Id;

        _t.AddPago(reserva1, idTarjeta, 100, exitoso: true, fechaPago: new DateTime(2026, 1, 15));
        _t.AddPago(reserva1, idTarjeta, 50, exitoso: true, fechaPago: new DateTime(2026, 1, 20));
        _t.AddPago(reserva2, idTarjeta, 999, exitoso: false, fechaPago: new DateTime(2026, 1, 25));
        _t.AddPago(reserva2, idTarjeta, 200, exitoso: true, fechaPago: new DateTime(2026, 2, 5));

        var reporte = await _sut.IngresosPorMesAsync(null, null);

        Assert.Equal(2, reporte.Count);
        Assert.Equal(2026, reporte[0].Anio);
        Assert.Equal(1, reporte[0].Mes);
        Assert.Equal(150m, reporte[0].TotalIngresos);
        Assert.Equal(2, reporte[1].Mes);
        Assert.Equal(200m, reporte[1].TotalIngresos);
    }

    [Fact]
    public async Task IngresosPorMes_FiltraPorRangoFechas()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var reserva = _t.AddReserva(cliente, sala, paquete);
        var idTarjeta = _t.Db.MetodosPagos.Single(m => m.Nombre == "Tarjeta de Crédito/Débito").Id;

        _t.AddPago(reserva, idTarjeta, 100, fechaPago: new DateTime(2026, 1, 10));
        _t.AddPago(reserva, idTarjeta, 200, fechaPago: new DateTime(2026, 3, 10));

        var reporte = await _sut.IngresosPorMesAsync(new DateTime(2026, 2, 1), new DateTime(2026, 12, 31));

        Assert.Single(reporte);
        Assert.Equal(3, reporte[0].Mes);
        Assert.Equal(200m, reporte[0].TotalIngresos);
    }

    [Fact]
    public async Task IngresosPorMes_DesdeMayorQueHasta_LanzaReglaNegocio() =>
        await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _sut.IngresosPorMesAsync(new DateTime(2026, 5, 1), new DateTime(2026, 1, 1)));

    [Fact]
    public async Task PaqueteMasDemandado_ExcluyeCanceladasYOrdenaDesc()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var popular = _t.AddPaquete("Popular");
        var raro = _t.AddPaquete("Raro");
        var inicio = _t.Time.Now.UtcDateTime.AddDays(1);

        _t.AddReserva(cliente, sala, popular, inicio: inicio);
        _t.AddReserva(cliente, sala, popular, inicio: inicio.AddHours(2));
        _t.AddReserva(cliente, sala, popular, estado: "Cancelada", inicio: inicio.AddHours(4));
        _t.AddReserva(cliente, sala, raro, inicio: inicio.AddHours(6));

        var reporte = await _sut.PaqueteMasDemandadoAsync(null, null);

        Assert.Equal(2, reporte.Count);
        Assert.Equal("Popular", reporte[0].Paquete);
        Assert.Equal(2, reporte[0].TotalReservas);
        Assert.Equal("Raro", reporte[1].Paquete);
        Assert.Equal(1, reporte[1].TotalReservas);
    }

    [Fact]
    public async Task PaqueteMasDemandado_DesdeMayorQueHasta_LanzaReglaNegocio() =>
        await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _sut.PaqueteMasDemandadoAsync(new DateTime(2026, 5, 1), new DateTime(2026, 1, 1)));

    [Fact]
    public async Task HorasPico_ExcluyeCanceladasYAgrupaPorHora()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");

        _t.AddReserva(cliente, sala, paquete, inicio: new DateTime(2026, 12, 1, 18, 0, 0));
        _t.AddReserva(cliente, sala, paquete, inicio: new DateTime(2026, 12, 2, 18, 30, 0));
        _t.AddReserva(cliente, sala, paquete, estado: "Cancelada", inicio: new DateTime(2026, 12, 3, 18, 0, 0));
        _t.AddReserva(cliente, sala, paquete, inicio: new DateTime(2026, 12, 4, 10, 0, 0));

        var reporte = await _sut.HorasPicoAsync(null, null);

        Assert.Equal(2, reporte.Count);
        Assert.Equal(18, reporte[0].Hora);
        Assert.Equal(2, reporte[0].TotalReservas);
        Assert.Equal(10, reporte[1].Hora);
        Assert.Equal(1, reporte[1].TotalReservas);
    }

    [Fact]
    public async Task HorasPico_DesdeMayorQueHasta_LanzaReglaNegocio() =>
        await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _sut.HorasPicoAsync(new DateTime(2026, 5, 1), new DateTime(2026, 1, 1)));
}
```

- [ ] **Step 4: Correr el test, verificar que falla**

Run: `cd Backend && dotnet test Backend.Tests --filter "FullyQualifiedName~ReportesServiceTests"`
Expected: FAIL — `ReportesService` no existe (`CS0246`).

- [ ] **Step 5: Implementación mínima**

```csharp
// Backend/Backend/Services/ReportesService.cs
using Backend.Data;
using Backend.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IReportesService
{
    Task<List<IngresoMesDTO>> IngresosPorMesAsync(DateTime? desde, DateTime? hasta);
    Task<List<PaqueteDemandaDTO>> PaqueteMasDemandadoAsync(DateTime? desde, DateTime? hasta);
    Task<List<HoraPicoDTO>> HorasPicoAsync(DateTime? desde, DateTime? hasta);
}

public class ReportesService(SmashZoneDbContext db) : IReportesService
{
    public async Task<List<IngresoMesDTO>> IngresosPorMesAsync(DateTime? desde, DateTime? hasta)
    {
        ValidarRango(desde, hasta);
        var q = db.Pagos.AsNoTracking().Where(p => p.Exitoso);
        if (desde is not null) q = q.Where(p => p.FechaPago >= desde);
        if (hasta is not null) q = q.Where(p => p.FechaPago <= hasta);

        var proyectado = q.Select(p => new { Anio = p.FechaPago!.Value.Year, Mes = p.FechaPago!.Value.Month, p.Monto });

        var grupos = await proyectado
            .GroupBy(x => new { x.Anio, x.Mes })
            .Select(g => new IngresoMesDTO(g.Key.Anio, g.Key.Mes, g.Sum(x => x.Monto)))
            .ToListAsync();

        return grupos.OrderBy(g => g.Anio).ThenBy(g => g.Mes).ToList();
    }

    public async Task<List<PaqueteDemandaDTO>> PaqueteMasDemandadoAsync(DateTime? desde, DateTime? hasta)
    {
        ValidarRango(desde, hasta);
        var q = db.Reservas.AsNoTracking().Where(r => r.IdEstadoNavigation.Nombre != "Cancelada");
        if (desde is not null) q = q.Where(r => r.FechaHoraInicio >= desde);
        if (hasta is not null) q = q.Where(r => r.FechaHoraInicio <= hasta);

        var grupos = await q
            .GroupBy(r => new { r.IdPaquete, Nombre = r.IdPaqueteNavigation.Nombre })
            .Select(g => new PaqueteDemandaDTO(g.Key.IdPaquete, g.Key.Nombre, g.Count()))
            .ToListAsync();

        return grupos.OrderByDescending(g => g.TotalReservas).ToList();
    }

    public async Task<List<HoraPicoDTO>> HorasPicoAsync(DateTime? desde, DateTime? hasta)
    {
        ValidarRango(desde, hasta);
        var q = db.Reservas.AsNoTracking().Where(r => r.IdEstadoNavigation.Nombre != "Cancelada");
        if (desde is not null) q = q.Where(r => r.FechaHoraInicio >= desde);
        if (hasta is not null) q = q.Where(r => r.FechaHoraInicio <= hasta);

        var grupos = await q
            .GroupBy(r => r.FechaHoraInicio.Hour)
            .Select(g => new HoraPicoDTO(g.Key, g.Count()))
            .ToListAsync();

        return grupos.OrderByDescending(g => g.TotalReservas).ToList();
    }

    private static void ValidarRango(DateTime? desde, DateTime? hasta)
    {
        if (desde is not null && hasta is not null && desde > hasta)
            throw new ReglaNegocioException("La fecha 'desde' no puede ser posterior a 'hasta'.");
    }
}
```

- [ ] **Step 6: Correr el test, verificar que pasa**

Run: `cd Backend && dotnet test Backend.Tests --filter "FullyQualifiedName~ReportesServiceTests"`
Expected: PASS (8/8).

- [ ] **Step 7: Commit**

```bash
git add Backend/Backend/DTOs/ReporteDTOs.cs Backend/Backend/Services/ReportesService.cs Backend/Backend.Tests/TestHelpers.cs Backend/Backend.Tests/Services/ReportesServiceTests.cs
git commit -m "feat(reportes): agrega ingresos por mes, paquete mas demandado y horas pico"
```

---

### Task 2: `ReportesController` + DI + autorización (integration tests)

**Files:**
- Create: `Backend/Backend/Controllers/ReportesController.cs`
- Modify: `Backend/Backend/Program.cs`
- Test: `Backend/Backend.Tests/Integration/ReportesEndpointsTests.cs`

**Interfaces:**
- Consumes: `IReportesService` (Task 1).
- Produces: endpoints HTTP finales del bloque.

- [ ] **Step 1: Escribir el test que falla**

```csharp
// Backend/Backend.Tests/Integration/ReportesEndpointsTests.cs
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Backend.DTOs;
using Backend.Models;

namespace Backend.Tests.Integration;

public class ReportesEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;

    public ReportesEndpointsTests(ApiFactory f)
    {
        _f = f;
        _f.Seed(db =>
        {
            if (!db.Usuarios.Any(u => u.Email == "admin-reportes@t.com"))
                db.Usuarios.Add(new Usuario
                {
                    Id = Guid.NewGuid(), IdRol = 1, Nombre = "A", Apellido = "D", Email = "admin-reportes@t.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password1!", 4), Activo = true
                });
        });
    }

    private async Task<HttpClient> ClienteAutenticado(string email, string pwd)
    {
        var c = _f.CreateClient();
        var r = await c.PostAsJsonAsync("/api/auth/login", new LoginDTO { Email = email, Password = pwd });
        r.EnsureSuccessStatusCode();
        var body = await r.Content.ReadFromJsonAsync<LoginRespuestaDTO>();
        c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body!.Token);
        return c;
    }

    [Fact]
    public async Task GetIngresosPorMes_SinToken_Da401()
    {
        var r = await _f.CreateClient().GetAsync("/api/reportes/ingresos-por-mes");
        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }

    [Fact]
    public async Task GetIngresosPorMes_ComoCliente_Da403()
    {
        var reg = await _f.CreateClient().PostAsJsonAsync("/api/auth/registro",
            new RegistroDTO { Nombre = "C", Apellido = "L", Email = "cliente-reportes@t.com", Password = "Password1!" });
        Assert.Equal(HttpStatusCode.Created, reg.StatusCode);
        var cliente = await ClienteAutenticado("cliente-reportes@t.com", "Password1!");

        var r = await cliente.GetAsync("/api/reportes/ingresos-por-mes");
        Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode);
    }

    [Fact]
    public async Task GetReportes_ComoAdmin_Da200EnLosTres()
    {
        var admin = await ClienteAutenticado("admin-reportes@t.com", "Password1!");

        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync("/api/reportes/ingresos-por-mes")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync("/api/reportes/paquete-mas-demandado")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync("/api/reportes/horas-pico")).StatusCode);
    }
}
```

- [ ] **Step 2: Correr el test, verificar que falla**

Run: `cd Backend && dotnet test Backend.Tests --filter "FullyQualifiedName~ReportesEndpointsTests"`
Expected: FAIL — `404` en vez de `401`/`403`/`200` (no existen las rutas `/api/reportes`), o error de compilación si `ReportesController` no existe todavía.

- [ ] **Step 3: Implementación mínima**

```csharp
// Backend/Backend/Controllers/ReportesController.cs
using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

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

En `Backend/Backend/Program.cs`, agregar junto a `builder.Services.AddScoped<IReservaService, ReservaService>();`:
```csharp
builder.Services.AddScoped<IReportesService, ReportesService>();
```

- [ ] **Step 4: Correr el test, verificar que pasa**

Run: `cd Backend && dotnet test Backend.Tests --filter "FullyQualifiedName~ReportesEndpointsTests"`
Expected: PASS (3/3).

- [ ] **Step 5: Correr toda la suite**

Run: `cd Backend && dotnet test`
Expected: todos los tests en verde (Bloques 1, 2, 3 y 4).

- [ ] **Step 6: Commit**

```bash
git add Backend/Backend/Controllers/ReportesController.cs Backend/Backend/Program.cs Backend/Backend.Tests/Integration/ReportesEndpointsTests.cs
git commit -m "feat(reportes): expone controller y conecta DI"
```

---

### Task 3: Documentación de contratos (`docs/api-contracts.md`)

**Files:**
- Modify: `docs/api-contracts.md`

**Interfaces:**
- Consumes: nada (documentación, no código).
- Produces: nada.

- [ ] **Step 1: Reemplazar el placeholder del Bloque 4**

Reemplazar en `docs/api-contracts.md` el bloque `## Bloque 4 — Reportes` completo (el placeholder actual de 2 líneas) por:

```markdown
## Bloque 4 — Reportes

Todos los endpoints requieren `Authorization: Bearer <jwt>` y rol
`Admin` (`[Authorize(Roles = "Admin")]`) — Staff no tiene acceso.
Los 3 aceptan `desde`/`hasta` opcionales (query params, `DateTime`).
`400` si `desde > hasta`. Sin filtro, agregan sobre todo el histórico.

### `GET /api/reportes/ingresos-por-mes?desde=&hasta=`
Filtra por `Pago.FechaPago`. Suma `Monto` de pagos con `Exitoso = true`,
agrupado por año-mes. Response `200`:
```json
[{ "anio": 2026, "mes": 1, "totalIngresos": 1500.00 }]
```
Ordenado por `anio, mes` ascendente.

### `GET /api/reportes/paquete-mas-demandado?desde=&hasta=`
Filtra por `Reserva.FechaHoraInicio`. Cuenta reservas con
`Estado != "Cancelada"`, agrupado por paquete. Response `200`
(ranking completo, no solo el top 1):
```json
[{ "idPaquete": 2, "paquete": "Paquete VIP", "totalReservas": 14 }]
```
Ordenado por `totalReservas` descendente.

### `GET /api/reportes/horas-pico?desde=&hasta=`
Mismo filtro y exclusión de `Cancelada` que el anterior, agrupado por
hora del día (0–23) de `FechaHoraInicio`. Response `200`:
```json
[{ "hora": 18, "totalReservas": 9 }]
```
Ordenado por `totalReservas` descendente.
```

- [ ] **Step 2: Commit**

```bash
git add docs/api-contracts.md
git commit -m "docs(reportes): documenta contratos de los 3 endpoints de reportes"
```

---

## Self-review

- **Cobertura del spec:** ingresos-por-mes solo `Exitoso=true` (Task 1) · paquete-mas-demandado y horas-pico excluyen `Cancelada` (Task 1) · filtro `desde`/`hasta` por campo correcto por endpoint y validación 400 (Task 1) · controller `Admin`-only + DI (Task 2) · docs (Task 3). Todo cubierto. Dashboard/shell Frontend quedan fuera, igual que marca la spec.
- **Placeholders:** ninguno — cada step tiene código completo, ningún `TODO`/`TBD`.
- **Consistencia de tipos:** `IngresoMesDTO`/`PaqueteDemandaDTO`/`HoraPicoDTO` (Task 1) se usan igual en el controller (Task 2) y en los ejemplos de respuesta de la doc (Task 3). `IReportesService.IngresosPorMesAsync/PaqueteMasDemandadoAsync/HorasPicoAsync(DateTime?, DateTime?)` (Task 1) coincide exactamente con las llamadas del controller (Task 2). `TestDb.AddPago` (Task 1) solo lo usa `ReportesServiceTests` — ninguna otra task lo necesita.
