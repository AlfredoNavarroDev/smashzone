# Bloque 3 — Core transaccional (Reservas + Pagos con Culqi) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar Reservas (con prevención de solapamiento, consumo de stock de Bloque 2, auditoría de estados) y Pagos (con Culqi real para tarjeta, manual para efectivo/transferencia) en el backend .NET 10.

**Architecture:** Mismo patrón Controller → Service → EF Core de Bloques 1/2 (DTOs, AutoMapper, FluentValidation, `DomainException` → `ProblemDetails`). Transacciones por un único `SaveChangesAsync()` atómico por operación — sin `BeginTransaction()` explícito. `IInventarioService` (Bloque 2) se extiende de forma aditiva. Culqi se aísla detrás de `ICulqiClient` (HttpClient tipado), reemplazable por un fake en tests.

**Tech Stack:** .NET 10 Web API, EF Core 10, AutoMapper, FluentValidation, xUnit + SQLite in-memory (`TestDb`), `System.Net.Http.Json`.

**Spec:** `docs/superpowers/specs/2026-11-10-bloque3-core-transaccional-design.md`

## Global Constraints

- `Reserva.MontoTotal` y `DetallesReservaExtra.Subtotal` son columnas calculadas en la DB (`HasComputedColumnSql`). **Nunca leerlas directo de la entidad** — siempre calcular en C# (`MontoPaquete + MontoExtras`, `Cantidad * PrecioUnitarioHistorico`). Evita depender de si EF recarga la columna generada igual en SQLite (tests) que en SQL Server (producción).
- Comparar `EstadosReserva`/`MetodosPago`/`Role` siempre por `Nombre` (string), nunca por `Id` literal — mismo estilo que `AdminUsuarioService.RolAdmin = "Admin"`.
- `CulqiSettings:SecretKey` nunca se commitea con valor real — vacío en `appsettings.json`, placeholder en `appsettings.Development.example.json`, valor real solo en `appsettings.Development.json` (ya gitignored).
- Ningún test pega a la API real de Culqi — siempre `ICulqiClient` fake o `HttpMessageHandler` fake.
- Controllers nunca tocan `SmashZoneDbContext` directo ni devuelven entidades EF — siempre DTOs vía Service.
- Commits: Conventional Commits, sin línea de coautor (preferencia del usuario para este repo).

---

### Task 1: Cliente de Culqi (`ICulqiClient`)

**Files:**
- Create: `Backend/Backend/Configuration/CulqiSettings.cs`
- Create: `Backend/Backend/Services/CulqiClient.cs`
- Modify: `Backend/Backend/appsettings.json`
- Modify: `Backend/Backend/appsettings.Development.example.json`
- Modify: `Backend/Backend/Program.cs`
- Test: `Backend/Backend.Tests/Services/CulqiClientTests.cs`

**Interfaces:**
- Produces: `ICulqiClient.CrearCargoAsync(string token, int montoCentimos, string email) : Task<ResultadoCargoCulqi>`, record `ResultadoCargoCulqi(bool Exitoso, string? ReferenciaCargo, string? MensajeUsuario)`. Task 7 (`PagoService`) consume esto.

- [ ] **Step 1: Escribir el test que falla**

```csharp
// Backend/Backend.Tests/Services/CulqiClientTests.cs
using System.Net;
using System.Text;
using Backend.Services;

namespace Backend.Tests.Services;

public class CulqiClientTests
{
    private static HttpClient ClienteCon(HttpStatusCode status, string jsonBody) =>
        new(new FakeHandler(status, jsonBody)) { BaseAddress = new Uri("https://api.culqi.com/v2/") };

    [Fact]
    public async Task CrearCargo_Aprobado_DevuelveExitosoConReferencia()
    {
        var http = ClienteCon(HttpStatusCode.OK, """{ "id": "chr_test_1" }""");
        var sut = new CulqiClient(http);
        var r = await sut.CrearCargoAsync("tkn_1", 10000, "a@x.com");
        Assert.True(r.Exitoso);
        Assert.Equal("chr_test_1", r.ReferenciaCargo);
    }

    [Fact]
    public async Task CrearCargo_Rechazado_DevuelveNoExitosoConMensaje()
    {
        var http = ClienteCon(HttpStatusCode.BadRequest, """{ "user_message": "Tarjeta rechazada por el banco." }""");
        var sut = new CulqiClient(http);
        var r = await sut.CrearCargoAsync("tkn_2", 10000, "a@x.com");
        Assert.False(r.Exitoso);
        Assert.Equal("Tarjeta rechazada por el banco.", r.MensajeUsuario);
    }

    [Fact]
    public async Task CrearCargo_ErrorInfraestructura_Lanza()
    {
        var http = ClienteCon(HttpStatusCode.InternalServerError, "{}");
        var sut = new CulqiClient(http);
        await Assert.ThrowsAsync<InvalidOperationException>(() => sut.CrearCargoAsync("tkn_3", 10000, "a@x.com"));
    }

    private class FakeHandler(HttpStatusCode status, string body) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(new HttpResponseMessage(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") });
    }
}
```

- [ ] **Step 2: Correr el test, verificar que falla**

Run: `cd Backend && dotnet test Backend.Tests --filter "FullyQualifiedName~CulqiClientTests"`
Expected: FAIL — `CulqiClient` no existe (`CS0246`).

- [ ] **Step 3: Implementación mínima**

```csharp
// Backend/Backend/Configuration/CulqiSettings.cs
namespace Backend.Configuration;

public class CulqiSettings
{
    public const string Section = "CulqiSettings";
    public string SecretKey { get; set; } = "";
}
```

```csharp
// Backend/Backend/Services/CulqiClient.cs
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Backend.Services;

public record ResultadoCargoCulqi(bool Exitoso, string? ReferenciaCargo, string? MensajeUsuario);

public interface ICulqiClient
{
    Task<ResultadoCargoCulqi> CrearCargoAsync(string token, int montoCentimos, string email);
}

public class CulqiClient(HttpClient http) : ICulqiClient
{
    public async Task<ResultadoCargoCulqi> CrearCargoAsync(string token, int montoCentimos, string email)
    {
        var body = new { amount = montoCentimos, currency_code = "PEN", email, source_id = token };
        var respuesta = await http.PostAsJsonAsync("charges", body);

        if (respuesta.IsSuccessStatusCode)
        {
            var cargo = await respuesta.Content.ReadFromJsonAsync<CulqiCargoRespuesta>();
            return new ResultadoCargoCulqi(true, cargo?.Id, null);
        }

        if ((int)respuesta.StatusCode is >= 400 and < 500)
        {
            var error = await respuesta.Content.ReadFromJsonAsync<CulqiErrorRespuesta>();
            return new ResultadoCargoCulqi(false, null, error?.UserMessage ?? "El pago fue rechazado por la pasarela.");
        }

        throw new InvalidOperationException($"Culqi respondió con un error inesperado ({(int)respuesta.StatusCode}).");
    }

    private class CulqiCargoRespuesta { [JsonPropertyName("id")] public string? Id { get; set; } }
    private class CulqiErrorRespuesta { [JsonPropertyName("user_message")] public string? UserMessage { get; set; } }
}
```

Agregar en `Backend/Backend/appsettings.json` (dentro del objeto raíz, junto a `"Cors"`):
```json
"CulqiSettings": { "SecretKey": "" }
```

Agregar en `Backend/Backend/appsettings.Development.example.json` (dentro del objeto raíz):
```json
"CulqiSettings": { "SecretKey": "<sk_test_...>" }
```

En `Backend/Backend/Program.cs`, agregar tras el bloque de `JwtSettings` (antes de `builder.Services.AddAuthentication(...)`):
```csharp
builder.Services.AddOptions<CulqiSettings>()
    .Bind(builder.Configuration.GetSection(CulqiSettings.Section))
    .ValidateOnStart();
```
Y en la sección `// --- Dominio ---`, junto a los demás `AddScoped`:
```csharp
builder.Services.AddHttpClient<ICulqiClient, CulqiClient>((sp, c) =>
{
    var settings = sp.GetRequiredService<IOptions<CulqiSettings>>().Value;
    c.BaseAddress = new Uri("https://api.culqi.com/v2/");
    c.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", settings.SecretKey);
});
```

- [ ] **Step 4: Correr el test, verificar que pasa**

Run: `cd Backend && dotnet test Backend.Tests --filter "FullyQualifiedName~CulqiClientTests"`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add Backend/Backend/Configuration/CulqiSettings.cs Backend/Backend/Services/CulqiClient.cs Backend/Backend/appsettings.json Backend/Backend/appsettings.Development.example.json Backend/Backend/Program.cs Backend/Backend.Tests/Services/CulqiClientTests.cs
git commit -m "feat(pagos): agrega cliente HTTP tipado para cargos de Culqi"
```

---

### Task 2: `IInventarioService.ReponerStockAsync` (extensión Bloque 2)

**Files:**
- Modify: `Backend/Backend/Services/InventarioService.cs`
- Test: `Backend/Backend.Tests/Services/InventarioServiceTests.cs`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: `IInventarioService.ReponerStockAsync(int idItem, int cantidad) : Task` — Task 5 (`CambiarEstadoAsync`, cancelación) lo consume.

- [ ] **Step 1: Escribir el test que falla**

Agregar a `Backend/Backend.Tests/Services/InventarioServiceTests.cs`:
```csharp
[Fact]
public async Task ReponerStock_SumaAlDisponible()
{
    var i = _t.AddItemExtra("Vaso", stock: 5);
    await _sut.ReponerStockAsync(i.Id, 3);
    await _t.Db.SaveChangesAsync();
    Assert.Equal(8, _t.Db.ItemsExtras.Single().StockDisponible);
}

[Fact]
public async Task ReponerStock_CantidadCeroONegativa_LanzaReglaNegocio()
{
    var i = _t.AddItemExtra("Vaso", stock: 5);
    await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.ReponerStockAsync(i.Id, 0));
    Assert.Equal(5, _t.Db.ItemsExtras.Single().StockDisponible);
}

[Fact]
public async Task ReponerStock_ItemNoExistente_LanzaNoEncontrado()
{
    await Assert.ThrowsAsync<NoEncontradoException>(() => _sut.ReponerStockAsync(999, 1));
}
```

- [ ] **Step 2: Correr el test, verificar que falla**

Run: `cd Backend && dotnet test Backend.Tests --filter "FullyQualifiedName~InventarioServiceTests.ReponerStock"`
Expected: FAIL — `ReponerStockAsync` no existe en `IInventarioService` (`CS1061`).

- [ ] **Step 3: Implementación mínima**

En `IInventarioService` (`Backend/Backend/Services/InventarioService.cs`), agregar a la interfaz:
```csharp
    /// <summary>
    /// Repone stock de un ítem (ej. al cancelar una reserva, Bloque 3). Mismo contrato
    /// "muta sin guardar" que <see cref="DescontarStockAsync"/>: deja la entidad trackeada
    /// en memoria, NO llama SaveChanges.
    /// </summary>
    Task ReponerStockAsync(int idItem, int cantidad);
```

En la clase `InventarioService`, agregar:
```csharp
    public async Task ReponerStockAsync(int idItem, int cantidad)
    {
        if (cantidad <= 0) throw new ReglaNegocioException("La cantidad a reponer debe ser mayor a 0.");
        var i = await Cargar(idItem);
        i.StockDisponible += cantidad;
    }
```

- [ ] **Step 4: Correr el test, verificar que pasa**

Run: `cd Backend && dotnet test Backend.Tests --filter "FullyQualifiedName~InventarioServiceTests"`
Expected: PASS (todos, incluidos los preexistentes).

- [ ] **Step 5: Commit**

```bash
git add Backend/Backend/Services/InventarioService.cs Backend/Backend.Tests/Services/InventarioServiceTests.cs
git commit -m "feat(inventario): agrega ReponerStockAsync para cancelacion de reservas"
```

---

### Task 3: `ReservaService.CrearAsync`

**Files:**
- Create: `Backend/Backend/DTOs/ReservaDTOs.cs`
- Create: `Backend/Backend/Mapping/ReservaProfile.cs`
- Create: `Backend/Backend/Services/ReservaService.cs`
- Modify: `Backend/Backend.Tests/TestHelpers.cs`
- Test: `Backend/Backend.Tests/Services/ReservaServiceTests.cs`

**Interfaces:**
- Consumes: `IInventarioService.DescontarStockAsync(int, int)` (Bloque 2, ya existe).
- Produces: `IReservaService.CrearAsync(CrearReservaDTO dto, Guid actorId, bool actorEsStaffOAdmin) : Task<ReservaDetalleDTO>`. Constantes públicas `ReservaService.EstadoPendiente/EstadoConfirmada/EstadoEnProceso/EstadoCompletada/EstadoCancelada` (string) — Tasks 5/6/7 las consumen. `ReservaDetalleDTO`/`DetalleExtraDTO`/`CrearReservaDTO`/`CrearDetalleExtraDTO` — consumidos por Tasks 4/5/9.

- [ ] **Step 1: Escribir los DTOs y el profile (sin lógica, soporte del test)**

```csharp
// Backend/Backend/DTOs/ReservaDTOs.cs
namespace Backend.DTOs;

public class CrearDetalleExtraDTO
{
    public int IdItemExtra { get; set; }
    public int Cantidad { get; set; }
}

public class CrearReservaDTO
{
    public Guid? IdCliente { get; set; }
    public int IdSala { get; set; }
    public int IdPaquete { get; set; }
    public DateTime FechaHoraInicio { get; set; }
    public int NumParticipantes { get; set; }
    public string? NotasEspeciales { get; set; }
    public List<CrearDetalleExtraDTO> Extras { get; set; } = new();
}

public class DetalleExtraDTO
{
    public int IdItemExtra { get; set; }
    public string ItemExtra { get; set; } = "";
    public int Cantidad { get; set; }
    public decimal PrecioUnitarioHistorico { get; set; }
    public decimal Subtotal { get; set; }
}

public class ReservaDetalleDTO
{
    public Guid Id { get; set; }
    public Guid IdCliente { get; set; }
    public int IdSala { get; set; }
    public string Sala { get; set; } = "";
    public int IdPaquete { get; set; }
    public string Paquete { get; set; } = "";
    public string Estado { get; set; } = "";
    public DateTime FechaHoraInicio { get; set; }
    public DateTime FechaHoraFin { get; set; }
    public int NumParticipantes { get; set; }
    public decimal MontoPaquete { get; set; }
    public decimal MontoExtras { get; set; }
    public decimal MontoTotal { get; set; }
    public string? NotasEspeciales { get; set; }
    public DateTime? FechaCreacion { get; set; }
    public List<DetalleExtraDTO> Extras { get; set; } = new();
}

public class CambiarEstadoReservaDTO
{
    public string NuevoEstado { get; set; } = "";
}

public class HistorialEstadoDTO
{
    public string? EstadoAnterior { get; set; }
    public string EstadoNuevo { get; set; } = "";
    public Guid? IdUsuarioCambio { get; set; }
    public string? UsuarioCambio { get; set; }
    public DateTime FechaCambio { get; set; }
}
```

```csharp
// Backend/Backend/Mapping/ReservaProfile.cs
using AutoMapper;
using Backend.DTOs;
using Backend.Models;

namespace Backend.Mapping;

public class ReservaProfile : Profile
{
    public ReservaProfile()
    {
        CreateMap<Reserva, ReservaDetalleDTO>()
            .ForMember(d => d.Sala, o => o.MapFrom(s => s.IdSalaNavigation.Nombre))
            .ForMember(d => d.Paquete, o => o.MapFrom(s => s.IdPaqueteNavigation.Nombre))
            .ForMember(d => d.Estado, o => o.MapFrom(s => s.IdEstadoNavigation.Nombre))
            .ForMember(d => d.MontoTotal, o => o.MapFrom(s => s.MontoPaquete + s.MontoExtras))
            .ForMember(d => d.Extras, o => o.MapFrom(s => s.DetallesReservaExtras));

        CreateMap<DetallesReservaExtra, DetalleExtraDTO>()
            .ForMember(d => d.ItemExtra, o => o.MapFrom(s => s.IdItemExtraNavigation.Nombre))
            .ForMember(d => d.Subtotal, o => o.MapFrom(s => s.Cantidad * s.PrecioUnitarioHistorico));

        CreateMap<HistorialEstadosReserva, HistorialEstadoDTO>()
            .ForMember(d => d.EstadoAnterior, o => o.MapFrom(s => s.IdEstadoAnteriorNavigation != null ? s.IdEstadoAnteriorNavigation.Nombre : null))
            .ForMember(d => d.EstadoNuevo, o => o.MapFrom(s => s.IdEstadoNuevoNavigation.Nombre))
            .ForMember(d => d.UsuarioCambio, o => o.MapFrom(s =>
                s.IdUsuarioCambioNavigation != null ? s.IdUsuarioCambioNavigation.Nombre + " " + s.IdUsuarioCambioNavigation.Apellido : null));
    }
}
```

En `Backend/Backend.Tests/TestHelpers.cs`:
1. Agregar `c.AddProfile<ReservaProfile>();` dentro del `MapperConfiguration` del constructor de `TestDb`.
2. En el constructor de `TestDb`, después del `Db.Roles.AddRange(...); Db.SaveChanges();` existente, agregar:
```csharp
        Db.EstadosReservas.AddRange(
            new EstadosReserva { Id = 1, Nombre = "Pendiente" },
            new EstadosReserva { Id = 2, Nombre = "Confirmada" },
            new EstadosReserva { Id = 3, Nombre = "EnProceso" },
            new EstadosReserva { Id = 4, Nombre = "Completada" },
            new EstadosReserva { Id = 5, Nombre = "Cancelada" });
        Db.MetodosPagos.AddRange(
            new MetodosPago { Id = 1, Nombre = "Tarjeta de Crédito/Débito" },
            new MetodosPago { Id = 2, Nombre = "Transferencia Bancaria" },
            new MetodosPago { Id = 3, Nombre = "Efectivo" });
        Db.SaveChanges();
```
3. Agregar, junto a `AddItemExtra`:
```csharp
    public Reserva AddReserva(Usuario cliente, Sala sala, Paquete paquete, string estado = "Pendiente",
        DateTime? inicio = null, int participantes = 2)
    {
        var idEstado = Db.EstadosReservas.Single(e => e.Nombre == estado).Id;
        var fechaInicio = inicio ?? Time.Now.UtcDateTime.AddDays(1);
        var r = new Reserva
        {
            Id = Guid.NewGuid(), IdCliente = cliente.Id, IdSala = sala.Id, IdPaquete = paquete.Id,
            IdEstado = idEstado, FechaHoraInicio = fechaInicio,
            FechaHoraFin = fechaInicio.AddMinutes(paquete.DuracionMinutos),
            NumParticipantes = participantes, MontoPaquete = paquete.Precio, MontoExtras = 0,
            FechaCreacion = Time.Now.UtcDateTime
        };
        Db.Reservas.Add(r);
        Db.SaveChanges();
        return r;
    }
```

- [ ] **Step 2: Escribir el test que falla**

```csharp
// Backend/Backend.Tests/Services/ReservaServiceTests.cs
using Backend.DTOs;
using Backend.Services;

namespace Backend.Tests.Services;

public class ReservaServiceTests : IDisposable
{
    private readonly TestDb _t = new();
    private readonly InventarioService _inventario;
    private readonly ReservaService _sut;

    public ReservaServiceTests()
    {
        _inventario = new InventarioService(_t.Db, _t.Mapper);
        _sut = new ReservaService(_t.Db, _t.Mapper, _t.Time, _inventario);
    }
    public void Dispose() => _t.Dispose();

    private CrearReservaDTO Dto(Sala sala, Paquete paquete, DateTime? inicio = null, int participantes = 2,
        List<CrearDetalleExtraDTO>? extras = null) => new()
    {
        IdSala = sala.Id, IdPaquete = paquete.Id,
        FechaHoraInicio = inicio ?? _t.Time.Now.UtcDateTime.AddDays(1),
        NumParticipantes = participantes, Extras = extras ?? new()
    };

    [Fact]
    public async Task Crear_Valida_PersisteConEstadoPendienteYHistorialInicial()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A", capacidad: 10);
        var paquete = _t.AddPaquete("Paquete A", precio: 100);

        var dto = await _sut.CrearAsync(Dto(sala, paquete), cliente.Id, actorEsStaffOAdmin: false);

        Assert.Equal("Pendiente", dto.Estado);
        Assert.Equal(100, dto.MontoTotal);
        Assert.Single(_t.Db.HistorialEstadosReservas);
        var h = _t.Db.HistorialEstadosReservas.Single();
        Assert.Null(h.IdEstadoAnterior);
        Assert.Null(h.IdUsuarioCambio);
    }

    [Fact]
    public async Task Crear_ConExtras_DescuentaStockYSumaMontoExtras()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A", precio: 100);
        var item = _t.AddItemExtra("Vaso", stock: 10);

        var dto = await _sut.CrearAsync(
            Dto(sala, paquete, extras: [new CrearDetalleExtraDTO { IdItemExtra = item.Id, Cantidad = 3 }]),
            cliente.Id, actorEsStaffOAdmin: false);

        Assert.Equal(100 + 3 * 5, dto.MontoTotal); // precio item = 5 (default AddItemExtra)
        Assert.Equal(7, _t.Db.ItemsExtras.Single().StockDisponible);
    }

    [Fact]
    public async Task Crear_SalaInactiva_LanzaReglaNegocio()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A", activa: false);
        var paquete = _t.AddPaquete("Paquete A");
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.CrearAsync(Dto(sala, paquete), cliente.Id, false));
    }

    [Fact]
    public async Task Crear_FechaEnElPasado_LanzaReglaNegocio()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _sut.CrearAsync(Dto(sala, paquete, inicio: _t.Time.Now.UtcDateTime.AddDays(-1)), cliente.Id, false));
    }

    [Fact]
    public async Task Crear_SuperaCapacidadSala_LanzaReglaNegocio()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A", capacidad: 2);
        var paquete = _t.AddPaquete("Paquete A");
        await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _sut.CrearAsync(Dto(sala, paquete, participantes: 5), cliente.Id, false));
    }

    [Fact]
    public async Task Crear_Solapamiento_LanzaConflicto()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var inicio = _t.Time.Now.UtcDateTime.AddDays(1);
        _t.AddReserva(cliente, sala, paquete, inicio: inicio);

        await Assert.ThrowsAsync<ConflictoException>(() => _sut.CrearAsync(Dto(sala, paquete, inicio: inicio), cliente.Id, false));
    }

    [Fact]
    public async Task Crear_NoSolapaConReservaCancelada()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var inicio = _t.Time.Now.UtcDateTime.AddDays(1);
        _t.AddReserva(cliente, sala, paquete, estado: "Cancelada", inicio: inicio);

        var dto = await _sut.CrearAsync(Dto(sala, paquete, inicio: inicio), cliente.Id, false);
        Assert.Equal("Pendiente", dto.Estado);
    }

    [Fact]
    public async Task Crear_StockInsuficiente_LanzaReglaNegocio()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var item = _t.AddItemExtra("Vaso", stock: 1);
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.CrearAsync(
            Dto(sala, paquete, extras: [new CrearDetalleExtraDTO { IdItemExtra = item.Id, Cantidad = 5 }]),
            cliente.Id, false));
    }

    [Fact]
    public async Task Crear_StaffReservaParaOtroCliente_UsaIdClienteDelDto()
    {
        var staff = _t.AddUsuario("staff@x.com", rol: 2);
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var dto = Dto(sala, paquete);
        dto.IdCliente = cliente.Id;

        var creada = await _sut.CrearAsync(dto, staff.Id, actorEsStaffOAdmin: true);
        Assert.Equal(cliente.Id, creada.IdCliente);
    }
}
```

- [ ] **Step 3: Correr el test, verificar que falla**

Run: `cd Backend && dotnet test Backend.Tests --filter "FullyQualifiedName~ReservaServiceTests"`
Expected: FAIL — `ReservaService` no existe (`CS0246`).

- [ ] **Step 4: Implementación mínima**

```csharp
// Backend/Backend/Services/ReservaService.cs
using AutoMapper;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IReservaService
{
    Task<ReservaDetalleDTO> CrearAsync(CrearReservaDTO dto, Guid actorId, bool actorEsStaffOAdmin);
    Task<ReservaDetalleDTO> ObtenerAsync(Guid id, Guid actorId, bool actorEsStaffOAdmin);
    Task<List<ReservaDetalleDTO>> ListarAsync(Guid actorId, bool actorEsStaffOAdmin, string? estado);
    Task<ReservaDetalleDTO> CambiarEstadoAsync(Guid id, string nuevoEstado, Guid actorId, bool actorEsStaffOAdmin);
    Task<List<HistorialEstadoDTO>> HistorialAsync(Guid id);

    /// <summary>
    /// Uso interno de PagoService: confirma Pendiente -> Confirmada sobre una entidad
    /// Reserva ya trackeada por el mismo DbContext. Muta en memoria, NO llama SaveChanges
    /// — el llamador persiste todo junto (Pago + confirmación + historial).
    /// </summary>
    Task AplicarConfirmacionPorPagoAsync(Reserva reserva);
}

public class ReservaService(SmashZoneDbContext db, IMapper mapper, TimeProvider time, IInventarioService inventario) : IReservaService
{
    public const string EstadoPendiente = "Pendiente";
    public const string EstadoConfirmada = "Confirmada";
    public const string EstadoEnProceso = "EnProceso";
    public const string EstadoCompletada = "Completada";
    public const string EstadoCancelada = "Cancelada";

    private DateTime Ahora => time.GetUtcNow().UtcDateTime;

    public async Task<ReservaDetalleDTO> CrearAsync(CrearReservaDTO dto, Guid actorId, bool actorEsStaffOAdmin)
    {
        var idCliente = actorEsStaffOAdmin && dto.IdCliente is not null ? dto.IdCliente.Value : actorId;
        if (actorEsStaffOAdmin && dto.IdCliente is not null)
        {
            var existeCliente = await db.Usuarios.AnyAsync(u => u.Id == idCliente);
            if (!existeCliente) throw new NoEncontradoException("El usuario indicado como cliente no existe.");
        }

        var sala = await db.Salas.SingleOrDefaultAsync(s => s.Id == dto.IdSala)
            ?? throw new NoEncontradoException("Sala no encontrada.");
        if (!sala.Activa) throw new ReglaNegocioException("La sala no está disponible.");

        var paquete = await db.Paquetes.SingleOrDefaultAsync(p => p.Id == dto.IdPaquete)
            ?? throw new NoEncontradoException("Paquete no encontrado.");
        if (!paquete.Activo) throw new ReglaNegocioException("El paquete no está disponible.");

        if (dto.FechaHoraInicio <= Ahora)
            throw new ReglaNegocioException("La fecha de inicio debe ser futura.");

        if (dto.NumParticipantes > sala.CapacidadMaxima)
            throw new ReglaNegocioException($"Supera la capacidad máxima de la sala ({sala.CapacidadMaxima}).");
        if (dto.NumParticipantes > paquete.MaxParticipantes)
            throw new ReglaNegocioException($"Supera el máximo de participantes del paquete ({paquete.MaxParticipantes}).");

        var fechaFin = dto.FechaHoraInicio.AddMinutes(paquete.DuracionMinutos);

        var haySolapamiento = await db.Reservas.AnyAsync(r =>
            r.IdSala == dto.IdSala &&
            r.IdEstadoNavigation.Nombre != EstadoCancelada &&
            dto.FechaHoraInicio < r.FechaHoraFin && fechaFin > r.FechaHoraInicio);
        if (haySolapamiento) throw new ConflictoException("La sala ya está reservada en ese horario.");

        var idPendiente = (await EstadosAsync())[EstadoPendiente];
        var reserva = new Reserva
        {
            Id = Guid.NewGuid(), IdCliente = idCliente, IdSala = dto.IdSala, IdPaquete = dto.IdPaquete,
            IdEstado = idPendiente, FechaHoraInicio = dto.FechaHoraInicio, FechaHoraFin = fechaFin,
            NumParticipantes = dto.NumParticipantes, MontoPaquete = paquete.Precio, MontoExtras = 0,
            NotasEspeciales = string.IsNullOrWhiteSpace(dto.NotasEspeciales) ? null : dto.NotasEspeciales.Trim(),
            FechaCreacion = Ahora
        };
        db.Reservas.Add(reserva);

        decimal montoExtras = 0;
        foreach (var extra in dto.Extras)
        {
            var item = await db.ItemsExtras.AsNoTracking().SingleOrDefaultAsync(i => i.Id == extra.IdItemExtra)
                ?? throw new NoEncontradoException($"Ítem de inventario {extra.IdItemExtra} no encontrado.");
            await inventario.DescontarStockAsync(extra.IdItemExtra, extra.Cantidad);
            db.DetallesReservaExtras.Add(new DetallesReservaExtra
            {
                IdReserva = reserva.Id, IdItemExtra = extra.IdItemExtra,
                Cantidad = extra.Cantidad, PrecioUnitarioHistorico = item.PrecioUnitario
            });
            montoExtras += item.PrecioUnitario * extra.Cantidad;
        }
        reserva.MontoExtras = montoExtras;

        db.HistorialEstadosReservas.Add(new HistorialEstadosReserva
        {
            IdReserva = reserva.Id, IdEstadoAnterior = null, IdEstadoNuevo = idPendiente,
            IdUsuarioCambio = null, FechaCambio = Ahora
        });

        await db.SaveChangesAsync();
        return mapper.Map<ReservaDetalleDTO>(await CargarConEstado(reserva.Id));
    }

    public async Task<ReservaDetalleDTO> ObtenerAsync(Guid id, Guid actorId, bool actorEsStaffOAdmin)
    {
        var reserva = await CargarConEstado(id);
        if (!actorEsStaffOAdmin && reserva.IdCliente != actorId)
            throw new NoEncontradoException("Reserva no encontrada.");
        return mapper.Map<ReservaDetalleDTO>(reserva);
    }

    public async Task<List<ReservaDetalleDTO>> ListarAsync(Guid actorId, bool actorEsStaffOAdmin, string? estado)
    {
        var q = db.Reservas.AsNoTracking()
            .Include(r => r.IdEstadoNavigation)
            .Include(r => r.IdSalaNavigation)
            .Include(r => r.IdPaqueteNavigation)
            .Include(r => r.DetallesReservaExtras).ThenInclude(d => d.IdItemExtraNavigation)
            .AsQueryable();
        if (!actorEsStaffOAdmin) q = q.Where(r => r.IdCliente == actorId);
        if (!string.IsNullOrWhiteSpace(estado)) q = q.Where(r => r.IdEstadoNavigation.Nombre == estado);
        var reservas = await q.OrderByDescending(r => r.FechaCreacion).ToListAsync();
        return mapper.Map<List<ReservaDetalleDTO>>(reservas);
    }

    public async Task<ReservaDetalleDTO> CambiarEstadoAsync(Guid id, string nuevoEstado, Guid actorId, bool actorEsStaffOAdmin)
    {
        var reserva = await CargarConEstado(id);
        if (!actorEsStaffOAdmin && reserva.IdCliente != actorId)
            throw new NoEncontradoException("Reserva no encontrada.");

        if (nuevoEstado == EstadoConfirmada)
            throw new ReglaNegocioException("No se puede confirmar manualmente; la confirmación ocurre al registrar un pago exitoso.");

        var estadoActual = reserva.IdEstadoNavigation.Nombre;
        if (estadoActual is EstadoCompletada or EstadoCancelada)
            throw new ReglaNegocioException($"La reserva ya está en un estado final ({estadoActual}).");

        var transicionValida = (estadoActual, nuevoEstado) switch
        {
            (EstadoPendiente, EstadoCancelada) => true,
            (EstadoConfirmada, EstadoCancelada) => true,
            (EstadoConfirmada, EstadoEnProceso) => true,
            (EstadoEnProceso, EstadoCompletada) => true,
            _ => false
        };
        if (!transicionValida)
            throw new ReglaNegocioException($"No se puede pasar de '{estadoActual}' a '{nuevoEstado}'.");

        if (nuevoEstado != EstadoCancelada && !actorEsStaffOAdmin)
            throw new ReglaNegocioException("Solo Staff/Admin puede realizar esta transición.");

        if (nuevoEstado == EstadoCancelada)
            foreach (var d in reserva.DetallesReservaExtras)
                await inventario.ReponerStockAsync(d.IdItemExtra, d.Cantidad);

        var estados = await EstadosAsync();
        var idAnterior = reserva.IdEstado;
        reserva.IdEstado = estados[nuevoEstado];
        db.HistorialEstadosReservas.Add(new HistorialEstadosReserva
        {
            IdReserva = reserva.Id, IdEstadoAnterior = idAnterior, IdEstadoNuevo = reserva.IdEstado,
            IdUsuarioCambio = actorEsStaffOAdmin ? actorId : null, FechaCambio = Ahora
        });
        await db.SaveChangesAsync();
        return mapper.Map<ReservaDetalleDTO>(reserva);
    }

    public async Task<List<HistorialEstadoDTO>> HistorialAsync(Guid id)
    {
        _ = await CargarConEstado(id);
        var historial = await db.HistorialEstadosReservas.AsNoTracking()
            .Where(h => h.IdReserva == id)
            .Include(h => h.IdEstadoAnteriorNavigation)
            .Include(h => h.IdEstadoNuevoNavigation)
            .Include(h => h.IdUsuarioCambioNavigation)
            .OrderBy(h => h.FechaCambio)
            .ToListAsync();
        return mapper.Map<List<HistorialEstadoDTO>>(historial);
    }

    public async Task AplicarConfirmacionPorPagoAsync(Reserva reserva)
    {
        var idConfirmada = (await EstadosAsync())[EstadoConfirmada];
        var idAnterior = reserva.IdEstado;
        reserva.IdEstado = idConfirmada;
        db.HistorialEstadosReservas.Add(new HistorialEstadosReserva
        {
            IdReserva = reserva.Id, IdEstadoAnterior = idAnterior, IdEstadoNuevo = idConfirmada,
            IdUsuarioCambio = null, FechaCambio = Ahora
        });
    }

    private async Task<Reserva> CargarConEstado(Guid id) =>
        await db.Reservas
            .Include(r => r.IdEstadoNavigation)
            .Include(r => r.IdSalaNavigation)
            .Include(r => r.IdPaqueteNavigation)
            .Include(r => r.DetallesReservaExtras).ThenInclude(d => d.IdItemExtraNavigation)
            .SingleOrDefaultAsync(r => r.Id == id)
        ?? throw new NoEncontradoException("Reserva no encontrada.");

    private async Task<Dictionary<string, int>> EstadosAsync() =>
        await db.EstadosReservas.AsNoTracking().ToDictionaryAsync(e => e.Nombre, e => e.Id);
}
```

- [ ] **Step 5: Correr el test, verificar que pasa**

Run: `cd Backend && dotnet test Backend.Tests --filter "FullyQualifiedName~ReservaServiceTests"`
Expected: PASS (9/9).

- [ ] **Step 6: Commit**

```bash
git add Backend/Backend/DTOs/ReservaDTOs.cs Backend/Backend/Mapping/ReservaProfile.cs Backend/Backend/Services/ReservaService.cs Backend/Backend.Tests/TestHelpers.cs Backend/Backend.Tests/Services/ReservaServiceTests.cs
git commit -m "feat(reservas): implementa creacion de reserva con solapamiento, cupo y stock"
```

---

### Task 4: `CambiarEstadoAsync` — transiciones, permisos y reposición de stock

**Files:**
- Test: `Backend/Backend.Tests/Services/ReservaServiceTests.cs` (agregar casos)

**Interfaces:**
- Consumes: `ReservaService.CambiarEstadoAsync` (ya implementado en Task 3), `IInventarioService.ReponerStockAsync` (Task 2).
- Produces: nada nuevo (cobertura de un método ya escrito — este task cierra los casos de borde que Task 3 no cubrió explícitamente).

- [ ] **Step 1: Escribir los tests que fallan (si corresponde)**

Agregar a `ReservaServiceTests.cs`:
```csharp
[Fact]
public async Task CambiarEstado_ClienteCancelaPropia_ReponeStockYQuedaCancelada()
{
    var cliente = _t.AddUsuario("c@x.com");
    var sala = _t.AddSala("Sala A");
    var paquete = _t.AddPaquete("Paquete A");
    var item = _t.AddItemExtra("Vaso", stock: 10);
    var creada = await _sut.CrearAsync(
        Dto(sala, paquete, extras: [new CrearDetalleExtraDTO { IdItemExtra = item.Id, Cantidad = 4 }]),
        cliente.Id, false);

    var dto = await _sut.CambiarEstadoAsync(creada.Id, "Cancelada", cliente.Id, actorEsStaffOAdmin: false);

    Assert.Equal("Cancelada", dto.Estado);
    Assert.Equal(10, _t.Db.ItemsExtras.Single().StockDisponible);
    Assert.Equal(2, _t.Db.HistorialEstadosReservas.Count()); // creacion + cancelacion
}

[Fact]
public async Task CambiarEstado_ClienteCancelaReservaAjena_LanzaNoEncontrado()
{
    var cliente = _t.AddUsuario("c@x.com");
    var otro = _t.AddUsuario("otro@x.com");
    var sala = _t.AddSala("Sala A");
    var paquete = _t.AddPaquete("Paquete A");
    var creada = await _sut.CrearAsync(Dto(sala, paquete), cliente.Id, false);

    await Assert.ThrowsAsync<NoEncontradoException>(() =>
        _sut.CambiarEstadoAsync(creada.Id, "Cancelada", otro.Id, actorEsStaffOAdmin: false));
}

[Fact]
public async Task CambiarEstado_ClienteIntentaEnProceso_LanzaReglaNegocio()
{
    var cliente = _t.AddUsuario("c@x.com");
    var sala = _t.AddSala("Sala A");
    var paquete = _t.AddPaquete("Paquete A");
    var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Confirmada");

    // Transición válida (Confirmada -> EnProceso), pero el actor no es Staff/Admin.
    await Assert.ThrowsAsync<ReglaNegocioException>(() =>
        _sut.CambiarEstadoAsync(reserva.Id, "EnProceso", cliente.Id, actorEsStaffOAdmin: false));
}

[Fact]
public async Task CambiarEstado_StaffAvanzaConfirmadaAEnProcesoYCompletada()
{
    var cliente = _t.AddUsuario("c@x.com");
    var staff = _t.AddUsuario("s@x.com", rol: 2);
    var sala = _t.AddSala("Sala A");
    var paquete = _t.AddPaquete("Paquete A");
    var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Confirmada");

    var enProceso = await _sut.CambiarEstadoAsync(reserva.Id, "EnProceso", staff.Id, actorEsStaffOAdmin: true);
    Assert.Equal("EnProceso", enProceso.Estado);

    var completada = await _sut.CambiarEstadoAsync(reserva.Id, "Completada", staff.Id, actorEsStaffOAdmin: true);
    Assert.Equal("Completada", completada.Estado);
}

[Fact]
public async Task CambiarEstado_DesdeEstadoTerminal_LanzaReglaNegocio()
{
    var cliente = _t.AddUsuario("c@x.com");
    var staff = _t.AddUsuario("s@x.com", rol: 2);
    var sala = _t.AddSala("Sala A");
    var paquete = _t.AddPaquete("Paquete A");
    var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Completada");

    await Assert.ThrowsAsync<ReglaNegocioException>(() =>
        _sut.CambiarEstadoAsync(reserva.Id, "Cancelada", staff.Id, actorEsStaffOAdmin: true));
}

[Fact]
public async Task CambiarEstado_ConfirmadaManual_LanzaReglaNegocio()
{
    var cliente = _t.AddUsuario("c@x.com");
    var staff = _t.AddUsuario("s@x.com", rol: 2);
    var sala = _t.AddSala("Sala A");
    var paquete = _t.AddPaquete("Paquete A");
    var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Pendiente");

    await Assert.ThrowsAsync<ReglaNegocioException>(() =>
        _sut.CambiarEstadoAsync(reserva.Id, "Confirmada", staff.Id, actorEsStaffOAdmin: true));
}
```

- [ ] **Step 2: Correr los tests, verificar que fallan o pasan por la razón correcta**

Run: `cd Backend && dotnet test Backend.Tests --filter "FullyQualifiedName~ReservaServiceTests"`
Expected: como `CambiarEstadoAsync` ya quedó implementado completo en el Task 3, estos tests deberían pasar en verde de entrada — confirman que esa implementación cubre los casos de borde. Si alguno falla, es un bug real en la lógica de Task 3: arreglar `ReservaService.CambiarEstadoAsync` hasta que los 6 pasen.

- [ ] **Step 3: (solo si algo falló) corregir `ReservaService.cs` y re-correr hasta PASS**

- [ ] **Step 4: Commit**

```bash
git add Backend/Backend.Tests/Services/ReservaServiceTests.cs
git commit -m "test(reservas): cubre transiciones de estado, permisos y reposicion de stock"
```

---

### Task 5: `PagoDTOs` + `PagoService.CrearAsync`

**Files:**
- Create: `Backend/Backend/DTOs/PagoDTOs.cs`
- Create: `Backend/Backend/Services/PagoService.cs`
- Modify: `Backend/Backend.Tests/TestHelpers.cs` (agregar `FakeCulqiClient`)
- Test: `Backend/Backend.Tests/Services/PagoServiceTests.cs`

**Interfaces:**
- Consumes: `IReservaService.AplicarConfirmacionPorPagoAsync(Reserva)` (Task 3), `ICulqiClient.CrearCargoAsync` (Task 1), `ReservaService.EstadoPendiente/EstadoConfirmada` (Task 3).
- Produces: `IPagoService.CrearAsync(CrearPagoDTO dto, Guid actorId, bool actorEsStaffOAdmin) : Task<VoucherDTO>`, `PagoService.MetodoTarjeta` (string) — Task 9 (controller) y Task 6 (validator) lo consumen indirectamente vía el DTO.

- [ ] **Step 1: Escribir los DTOs (soporte del test)**

```csharp
// Backend/Backend/DTOs/PagoDTOs.cs
namespace Backend.DTOs;

public class CrearPagoDTO
{
    public Guid IdReserva { get; set; }
    public int IdMetodoPago { get; set; }
    public string? CulqiToken { get; set; }
    public bool? Exitoso { get; set; }
    public string? TransaccionRef { get; set; }
}

public class VoucherDTO
{
    public Guid IdPago { get; set; }
    public Guid IdReserva { get; set; }
    public decimal Monto { get; set; }
    public string MetodoPago { get; set; } = "";
    public bool Exitoso { get; set; }
    public string? TransaccionRef { get; set; }
    public DateTime FechaPago { get; set; }
    public string EstadoReserva { get; set; } = "";
}
```

Agregar en `Backend/Backend.Tests/TestHelpers.cs` (archivo nuevo helper, junto a `FakeTime`):
```csharp
public sealed class FakeCulqiClient : ICulqiClient
{
    public bool ProximoExitoso { get; set; } = true;
    public string? ProximoMensaje { get; set; }
    public string ProximaReferencia { get; set; } = "chr_test_123";

    public Task<ResultadoCargoCulqi> CrearCargoAsync(string token, int montoCentimos, string email) =>
        Task.FromResult(ProximoExitoso
            ? new ResultadoCargoCulqi(true, ProximaReferencia, null)
            : new ResultadoCargoCulqi(false, null, ProximoMensaje ?? "Tarjeta rechazada."));
}
```
(Agregar `using Backend.Services;` al inicio de `TestHelpers.cs` si no está ya importado.)

- [ ] **Step 2: Escribir el test que falla**

```csharp
// Backend/Backend.Tests/Services/PagoServiceTests.cs
using Backend.DTOs;
using Backend.Services;

namespace Backend.Tests.Services;

public class PagoServiceTests : IDisposable
{
    private readonly TestDb _t = new();
    private readonly FakeCulqiClient _culqi = new();
    private readonly ReservaService _reservas;
    private readonly PagoService _sut;

    public PagoServiceTests()
    {
        var inventario = new InventarioService(_t.Db, _t.Mapper);
        _reservas = new ReservaService(_t.Db, _t.Mapper, _t.Time, inventario);
        _sut = new PagoService(_t.Db, _t.Time, _culqi, _reservas);
    }
    public void Dispose() => _t.Dispose();

    [Fact]
    public async Task Crear_PagoConTarjetaExitoso_ConfirmaReserva()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A", precio: 100);
        var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Pendiente");
        var idTarjeta = _t.Db.MetodosPagos.Single(m => m.Nombre == "Tarjeta de Crédito/Débito").Id;

        var voucher = await _sut.CrearAsync(
            new CrearPagoDTO { IdReserva = reserva.Id, IdMetodoPago = idTarjeta, CulqiToken = "tkn_1" },
            cliente.Id, actorEsStaffOAdmin: false);

        Assert.True(voucher.Exitoso);
        Assert.Equal("Confirmada", voucher.EstadoReserva);
        Assert.Equal(100, voucher.Monto);
        Assert.Equal(2, _t.Db.Reservas.Single().IdEstado); // Confirmada = Id 2 (ver seed de EstadosReservas en TestDb)
    }

    [Fact]
    public async Task Crear_PagoConTarjetaRechazado_ReservaSigueySinTokenLanza()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Pendiente");
        var idTarjeta = _t.Db.MetodosPagos.Single(m => m.Nombre == "Tarjeta de Crédito/Débito").Id;
        _culqi.ProximoExitoso = false;
        _culqi.ProximoMensaje = "Fondos insuficientes.";

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.CrearAsync(
            new CrearPagoDTO { IdReserva = reserva.Id, IdMetodoPago = idTarjeta, CulqiToken = "tkn_2" },
            cliente.Id, false));

        Assert.Equal("Pendiente", _t.Db.EstadosReservas.Single(e => e.Id == _t.Db.Reservas.Single().IdEstado).Nombre);
        Assert.Single(_t.Db.Pagos); // el intento fallido queda registrado
    }

    [Fact]
    public async Task Crear_PagoConTarjetaSinToken_LanzaReglaNegocio()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Pendiente");
        var idTarjeta = _t.Db.MetodosPagos.Single(m => m.Nombre == "Tarjeta de Crédito/Débito").Id;

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.CrearAsync(
            new CrearPagoDTO { IdReserva = reserva.Id, IdMetodoPago = idTarjeta }, cliente.Id, false));
    }

    [Fact]
    public async Task Crear_PagoManualPorStaff_ConfirmaReserva()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var staff = _t.AddUsuario("s@x.com", rol: 2);
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A", precio: 50);
        var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Pendiente");
        var idEfectivo = _t.Db.MetodosPagos.Single(m => m.Nombre == "Efectivo").Id;

        var voucher = await _sut.CrearAsync(
            new CrearPagoDTO { IdReserva = reserva.Id, IdMetodoPago = idEfectivo, Exitoso = true }, staff.Id, true);

        Assert.True(voucher.Exitoso);
        Assert.Equal("Confirmada", voucher.EstadoReserva);
    }

    [Fact]
    public async Task Crear_PagoManualPorCliente_LanzaReglaNegocio()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Pendiente");
        var idEfectivo = _t.Db.MetodosPagos.Single(m => m.Nombre == "Efectivo").Id;

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.CrearAsync(
            new CrearPagoDTO { IdReserva = reserva.Id, IdMetodoPago = idEfectivo, Exitoso = true }, cliente.Id, false));
    }

    [Fact]
    public async Task Crear_ReservaNoPendiente_LanzaConflicto()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Confirmada");
        var idTarjeta = _t.Db.MetodosPagos.Single(m => m.Nombre == "Tarjeta de Crédito/Débito").Id;

        await Assert.ThrowsAsync<ConflictoException>(() => _sut.CrearAsync(
            new CrearPagoDTO { IdReserva = reserva.Id, IdMetodoPago = idTarjeta, CulqiToken = "tkn_3" },
            cliente.Id, false));
    }
}
```

- [ ] **Step 3: Correr el test, verificar que falla**

Run: `cd Backend && dotnet test Backend.Tests --filter "FullyQualifiedName~PagoServiceTests"`
Expected: FAIL — `PagoService` no existe (`CS0246`).

- [ ] **Step 4: Implementación mínima**

```csharp
// Backend/Backend/Services/PagoService.cs
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IPagoService
{
    Task<VoucherDTO> CrearAsync(CrearPagoDTO dto, Guid actorId, bool actorEsStaffOAdmin);
}

public class PagoService(SmashZoneDbContext db, TimeProvider time, ICulqiClient culqi, IReservaService reservas) : IPagoService
{
    public const string MetodoTarjeta = "Tarjeta de Crédito/Débito";

    public async Task<VoucherDTO> CrearAsync(CrearPagoDTO dto, Guid actorId, bool actorEsStaffOAdmin)
    {
        var metodo = await db.MetodosPagos.AsNoTracking().SingleOrDefaultAsync(m => m.Id == dto.IdMetodoPago)
            ?? throw new NoEncontradoException("Método de pago no encontrado.");

        var reserva = await db.Reservas
            .Include(r => r.IdEstadoNavigation)
            .Include(r => r.IdClienteNavigation)
            .SingleOrDefaultAsync(r => r.Id == dto.IdReserva)
            ?? throw new NoEncontradoException("Reserva no encontrada.");

        if (!actorEsStaffOAdmin && reserva.IdCliente != actorId)
            throw new NoEncontradoException("Reserva no encontrada.");

        if (reserva.IdEstadoNavigation.Nombre != ReservaService.EstadoPendiente)
            throw new ConflictoException("La reserva no está pendiente de pago.");

        var montoTotal = reserva.MontoPaquete + reserva.MontoExtras;
        bool exitoso;
        string? transaccionRef;

        if (metodo.Nombre == MetodoTarjeta)
        {
            if (string.IsNullOrWhiteSpace(dto.CulqiToken))
                throw new ReglaNegocioException("Falta el token de Culqi para este método de pago.");

            var resultado = await culqi.CrearCargoAsync(dto.CulqiToken, (int)(montoTotal * 100), reserva.IdClienteNavigation.Email);
            exitoso = resultado.Exitoso;
            transaccionRef = resultado.ReferenciaCargo;
            if (!exitoso)
            {
                db.Pagos.Add(new Pago
                {
                    Id = Guid.NewGuid(), IdReserva = reserva.Id, IdMetodoPago = metodo.Id,
                    Monto = montoTotal, TransaccionRef = null, Exitoso = false, FechaPago = time.GetUtcNow().UtcDateTime
                });
                await db.SaveChangesAsync();
                throw new ReglaNegocioException(resultado.MensajeUsuario ?? "El pago fue rechazado por la pasarela.");
            }
        }
        else
        {
            if (!actorEsStaffOAdmin)
                throw new ReglaNegocioException("Solo Staff/Admin puede registrar un pago manual.");
            if (dto.Exitoso is null)
                throw new ReglaNegocioException("Debe indicar si el pago manual fue exitoso.");
            exitoso = dto.Exitoso.Value;
            transaccionRef = dto.TransaccionRef;
        }

        var pago = new Pago
        {
            Id = Guid.NewGuid(), IdReserva = reserva.Id, IdMetodoPago = metodo.Id,
            Monto = montoTotal, TransaccionRef = transaccionRef, Exitoso = exitoso, FechaPago = time.GetUtcNow().UtcDateTime
        };
        db.Pagos.Add(pago);

        if (exitoso)
            await reservas.AplicarConfirmacionPorPagoAsync(reserva);

        await db.SaveChangesAsync();

        return new VoucherDTO
        {
            IdPago = pago.Id, IdReserva = reserva.Id, Monto = pago.Monto, MetodoPago = metodo.Nombre,
            Exitoso = pago.Exitoso, TransaccionRef = pago.TransaccionRef, FechaPago = pago.FechaPago!.Value,
            EstadoReserva = exitoso ? ReservaService.EstadoConfirmada : ReservaService.EstadoPendiente
        };
    }
}
```

- [ ] **Step 5: Correr el test, verificar que pasa**

Run: `cd Backend && dotnet test Backend.Tests --filter "FullyQualifiedName~PagoServiceTests"`
Expected: PASS (6/6).

- [ ] **Step 6: Commit**

```bash
git add Backend/Backend/DTOs/PagoDTOs.cs Backend/Backend/Services/PagoService.cs Backend/Backend.Tests/TestHelpers.cs Backend/Backend.Tests/Services/PagoServiceTests.cs
git commit -m "feat(pagos): ruteo gateway/manual, Culqi confirma reserva automaticamente"
```

---

### Task 6: Validators (FluentValidation)

**Files:**
- Create: `Backend/Backend/Validators/ReservaValidators.cs`
- Create: `Backend/Backend/Validators/PagoValidators.cs`
- Test: `Backend/Backend.Tests/Services/ReservaPagoValidatorTests.cs`

**Interfaces:**
- Consumes: `CrearReservaDTO`, `CambiarEstadoReservaDTO` (Task 3), `CrearPagoDTO` (Task 5).
- Produces: nada que otras tasks consuman — son terminales (los recoge `AddValidatorsFromAssemblyContaining` automático, sin tocar `Program.cs`).

- [ ] **Step 1: Escribir el test que falla**

```csharp
// Backend/Backend.Tests/Services/ReservaPagoValidatorTests.cs
using Backend.DTOs;
using Backend.Validators;

namespace Backend.Tests.Services;

public class ReservaPagoValidatorTests
{
    private static CrearReservaDTO ReservaValida() => new()
    {
        IdSala = 1, IdPaquete = 1, FechaHoraInicio = DateTime.UtcNow.AddDays(1), NumParticipantes = 2
    };

    [Fact] public void CrearReserva_Valida_Pasa() => Assert.True(new CrearReservaValidator().Validate(ReservaValida()).IsValid);

    [Fact]
    public void CrearReserva_NumParticipantesCero_Falla()
    {
        var dto = ReservaValida();
        dto.NumParticipantes = 0;
        Assert.False(new CrearReservaValidator().Validate(dto).IsValid);
    }

    [Fact]
    public void CrearReserva_ExtraCantidadCero_Falla()
    {
        var dto = ReservaValida();
        dto.Extras = [new CrearDetalleExtraDTO { IdItemExtra = 1, Cantidad = 0 }];
        Assert.False(new CrearReservaValidator().Validate(dto).IsValid);
    }

    [Theory]
    [InlineData("Cancelada")]
    [InlineData("EnProceso")]
    [InlineData("Completada")]
    public void CambiarEstadoReserva_ValoresPermitidos_Pasa(string estado) =>
        Assert.True(new CambiarEstadoReservaValidator().Validate(new CambiarEstadoReservaDTO { NuevoEstado = estado }).IsValid);

    [Fact]
    public void CambiarEstadoReserva_Confirmada_Falla() =>
        Assert.False(new CambiarEstadoReservaValidator().Validate(new CambiarEstadoReservaDTO { NuevoEstado = "Confirmada" }).IsValid);

    [Fact]
    public void CrearPago_IdMetodoPagoCero_Falla() =>
        Assert.False(new CrearPagoValidator().Validate(new CrearPagoDTO { IdMetodoPago = 0 }).IsValid);

    [Fact]
    public void CrearPago_Valido_Pasa() =>
        Assert.True(new CrearPagoValidator().Validate(new CrearPagoDTO { IdMetodoPago = 1 }).IsValid);
}
```

- [ ] **Step 2: Correr el test, verificar que falla**

Run: `cd Backend && dotnet test Backend.Tests --filter "FullyQualifiedName~ReservaPagoValidatorTests"`
Expected: FAIL — `CrearReservaValidator`/`CambiarEstadoReservaValidator`/`CrearPagoValidator` no existen.

- [ ] **Step 3: Implementación mínima**

```csharp
// Backend/Backend/Validators/ReservaValidators.cs
using Backend.DTOs;
using FluentValidation;

namespace Backend.Validators;

public class CrearReservaValidator : AbstractValidator<CrearReservaDTO>
{
    public CrearReservaValidator()
    {
        RuleFor(x => x.IdSala).GreaterThan(0);
        RuleFor(x => x.IdPaquete).GreaterThan(0);
        RuleFor(x => x.NumParticipantes).GreaterThan(0);
        RuleFor(x => x.NotasEspeciales).MaximumLength(500);
        RuleForEach(x => x.Extras).ChildRules(e =>
        {
            e.RuleFor(d => d.IdItemExtra).GreaterThan(0);
            e.RuleFor(d => d.Cantidad).GreaterThan(0);
        });
    }
}

public class CambiarEstadoReservaValidator : AbstractValidator<CambiarEstadoReservaDTO>
{
    public CambiarEstadoReservaValidator()
    {
        RuleFor(x => x.NuevoEstado).NotEmpty()
            .Must(e => e is "Cancelada" or "EnProceso" or "Completada")
            .WithMessage("NuevoEstado debe ser 'Cancelada', 'EnProceso' o 'Completada'.");
    }
}
```

```csharp
// Backend/Backend/Validators/PagoValidators.cs
using Backend.DTOs;
using FluentValidation;

namespace Backend.Validators;

public class CrearPagoValidator : AbstractValidator<CrearPagoDTO>
{
    public CrearPagoValidator()
    {
        RuleFor(x => x.IdMetodoPago).GreaterThan(0);
    }
}
```

- [ ] **Step 4: Correr el test, verificar que pasa**

Run: `cd Backend && dotnet test Backend.Tests --filter "FullyQualifiedName~ReservaPagoValidatorTests"`
Expected: PASS (7/7).

- [ ] **Step 5: Commit**

```bash
git add Backend/Backend/Validators/ReservaValidators.cs Backend/Backend/Validators/PagoValidators.cs Backend/Backend.Tests/Services/ReservaPagoValidatorTests.cs
git commit -m "feat(reservas,pagos): agrega validadores FluentValidation"
```

---

### Task 7: Controllers + DI + autorización (integration tests)

**Files:**
- Create: `Backend/Backend/Controllers/ReservasController.cs`
- Create: `Backend/Backend/Controllers/PagosController.cs`
- Modify: `Backend/Backend/Program.cs`
- Test: `Backend/Backend.Tests/Integration/ReservasEndpointsTests.cs`

**Interfaces:**
- Consumes: `IReservaService` (Task 3), `IPagoService` (Task 5), `ClaimsPrincipalExtensions.GetUserId()` (ya existe en `Infrastructure.cs`).
- Produces: endpoints HTTP finales del bloque.

- [ ] **Step 1: Escribir el test que falla**

```csharp
// Backend/Backend.Tests/Integration/ReservasEndpointsTests.cs
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Backend.DTOs;
using Backend.Models;

namespace Backend.Tests.Integration;

public class ReservasEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    private Sala _sala = null!;
    private Paquete _paquete = null!;

    public ReservasEndpointsTests(ApiFactory f)
    {
        _f = f;
        _f.Seed(db =>
        {
            if (!db.EstadosReservas.Any())
                db.EstadosReservas.AddRange(
                    new EstadosReserva { Id = 1, Nombre = "Pendiente" },
                    new EstadosReserva { Id = 2, Nombre = "Confirmada" },
                    new EstadosReserva { Id = 3, Nombre = "EnProceso" },
                    new EstadosReserva { Id = 4, Nombre = "Completada" },
                    new EstadosReserva { Id = 5, Nombre = "Cancelada" });
            if (!db.Salas.Any(s => s.Nombre == "Sala Reservas Test"))
                db.Salas.Add(new Sala { Nombre = "Sala Reservas Test", CapacidadMaxima = 10, Activa = true });
            if (!db.Paquetes.Any(p => p.Nombre == "Paquete Reservas Test"))
                db.Paquetes.Add(new Paquete
                {
                    Nombre = "Paquete Reservas Test", Descripcion = "Test", Precio = 100,
                    DuracionMinutos = 30, MaxParticipantes = 10, CantidadItemsEstandar = 5, Activo = true
                });
        });
        using var scope = _f.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<Backend.Data.SmashZoneDbContext>();
        _sala = db.Salas.Single(s => s.Nombre == "Sala Reservas Test");
        _paquete = db.Paquetes.Single(p => p.Nombre == "Paquete Reservas Test");
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
    public async Task PostReservas_SinToken_Da401()
    {
        var r = await _f.CreateClient().PostAsJsonAsync("/api/reservas",
            new CrearReservaDTO { IdSala = _sala.Id, IdPaquete = _paquete.Id, FechaHoraInicio = DateTime.UtcNow.AddDays(2), NumParticipantes = 2 });
        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }

    [Fact]
    public async Task PostReservas_ComoCliente_Da201_YGetPropia_Da200()
    {
        var reg = await _f.CreateClient().PostAsJsonAsync("/api/auth/registro",
            new RegistroDTO { Nombre = "C", Apellido = "L", Email = "cli-reserva@t.com", Password = "Password1!" });
        Assert.Equal(HttpStatusCode.Created, reg.StatusCode);
        var cliente = await ClienteAutenticado("cli-reserva@t.com", "Password1!");

        var crear = await cliente.PostAsJsonAsync("/api/reservas",
            new CrearReservaDTO { IdSala = _sala.Id, IdPaquete = _paquete.Id, FechaHoraInicio = DateTime.UtcNow.AddDays(3), NumParticipantes = 2 });
        Assert.Equal(HttpStatusCode.Created, crear.StatusCode);
        var creada = await crear.Content.ReadFromJsonAsync<ReservaDetalleDTO>();

        Assert.Equal(HttpStatusCode.OK, (await cliente.GetAsync($"/api/reservas/{creada!.Id}")).StatusCode);
    }

    [Fact]
    public async Task GetHistorial_ComoCliente_Da403()
    {
        var reg = await _f.CreateClient().PostAsJsonAsync("/api/auth/registro",
            new RegistroDTO { Nombre = "C", Apellido = "L", Email = "cli-hist@t.com", Password = "Password1!" });
        Assert.Equal(HttpStatusCode.Created, reg.StatusCode);
        var cliente = await ClienteAutenticado("cli-hist@t.com", "Password1!");

        var crear = await cliente.PostAsJsonAsync("/api/reservas",
            new CrearReservaDTO { IdSala = _sala.Id, IdPaquete = _paquete.Id, FechaHoraInicio = DateTime.UtcNow.AddDays(4), NumParticipantes = 2 });
        var creada = await crear.Content.ReadFromJsonAsync<ReservaDetalleDTO>();

        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.GetAsync($"/api/reservas/{creada!.Id}/historial")).StatusCode);
    }
}
```

- [ ] **Step 2: Correr el test, verificar que falla**

Run: `cd Backend && dotnet test Backend.Tests --filter "FullyQualifiedName~ReservasEndpointsTests"`
Expected: FAIL — `404` en vez de `201`/`401`/`403` (no existen las rutas `/api/reservas`), o error de compilación si `ReservasController`/`PagosController` no existen todavía.

- [ ] **Step 3: Implementación mínima**

```csharp
// Backend/Backend/Controllers/ReservasController.cs
using Backend.DTOs;
using Backend.Infrastructure;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Authorize]
[Route("api/reservas")]
public class ReservasController(IReservaService reservas) : ControllerBase
{
    private bool EsStaffOAdmin => User.IsInRole("Staff") || User.IsInRole("Admin");

    [HttpPost]
    public async Task<ActionResult<ReservaDetalleDTO>> Crear(CrearReservaDTO dto)
    {
        var creada = await reservas.CrearAsync(dto, User.GetUserId(), EsStaffOAdmin);
        return CreatedAtAction(nameof(Obtener), new { id = creada.Id }, creada);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ReservaDetalleDTO>> Obtener(Guid id) =>
        await reservas.ObtenerAsync(id, User.GetUserId(), EsStaffOAdmin);

    [HttpGet]
    public async Task<ActionResult<List<ReservaDetalleDTO>>> Listar([FromQuery] string? estado) =>
        await reservas.ListarAsync(User.GetUserId(), EsStaffOAdmin, estado);

    [HttpPut("{id:guid}/estado")]
    public async Task<ActionResult<ReservaDetalleDTO>> CambiarEstado(Guid id, CambiarEstadoReservaDTO dto) =>
        await reservas.CambiarEstadoAsync(id, dto.NuevoEstado, User.GetUserId(), EsStaffOAdmin);

    [HttpGet("{id:guid}/historial")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<List<HistorialEstadoDTO>>> Historial(Guid id) => await reservas.HistorialAsync(id);
}
```

```csharp
// Backend/Backend/Controllers/PagosController.cs
using Backend.DTOs;
using Backend.Infrastructure;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Authorize]
[Route("api/pagos")]
public class PagosController(IPagoService pagos) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<VoucherDTO>> Crear(CrearPagoDTO dto)
    {
        var voucher = await pagos.CrearAsync(dto, User.GetUserId(), User.IsInRole("Staff") || User.IsInRole("Admin"));
        return StatusCode(StatusCodes.Status201Created, voucher);
    }
}
```

En `Backend/Backend/Program.cs`, agregar junto a los demás `AddScoped`:
```csharp
builder.Services.AddAutoMapper(cfg =>
{
    cfg.AddProfile<UsuarioProfile>();
    cfg.AddProfile<CatalogoProfile>();
    cfg.AddProfile<ReservaProfile>();
});
```
(reemplaza el `AddAutoMapper` existente, agregando la línea del nuevo profile) y:
```csharp
builder.Services.AddScoped<IReservaService, ReservaService>();
builder.Services.AddScoped<IPagoService, PagoService>();
```

- [ ] **Step 4: Correr el test, verificar que pasa**

Run: `cd Backend && dotnet test Backend.Tests --filter "FullyQualifiedName~ReservasEndpointsTests"`
Expected: PASS (3/3).

- [ ] **Step 5: Correr toda la suite**

Run: `cd Backend && dotnet test`
Expected: todos los tests en verde (Bloques 1, 2 y 3).

- [ ] **Step 6: Commit**

```bash
git add Backend/Backend/Controllers/ReservasController.cs Backend/Backend/Controllers/PagosController.cs Backend/Backend/Program.cs Backend/Backend.Tests/Integration/ReservasEndpointsTests.cs
git commit -m "feat(reservas,pagos): expone controllers y conecta DI"
```

---

### Task 8: Documentación de contratos (`docs/api-contracts.md`)

**Files:**
- Modify: `docs/api-contracts.md`

**Interfaces:**
- Consumes: nada (documentación, no código).
- Produces: nada.

- [ ] **Step 1: Reemplazar el placeholder del Bloque 3**

Reemplazar en `docs/api-contracts.md` el bloque `## Bloque 3 — Core transaccional` completo (desde el placeholder actual hasta antes de `## Bloque 4`) por:

```markdown
## Bloque 3 — Core transaccional

Todos los endpoints requieren `Authorization: Bearer <jwt>`. Un Cliente
solo ve/opera sus propias reservas — `GET`/`PUT estado` sobre una
reserva ajena devuelve `404` (no `403`, para no filtrar su existencia).

### `POST /api/reservas`
Cliente (reserva para sí), Staff o Admin (`IdCliente` opcional, reserva
a nombre de otro usuario — ignorado si el actor es Cliente).
Request (`CrearReservaDTO`):
```json
{ "idSala": 1, "idPaquete": 2, "fechaHoraInicio": "2026-12-10T16:00:00",
  "numParticipantes": 4, "notasEspeciales": null,
  "extras": [{ "idItemExtra": 5, "cantidad": 2 }] }
```
`fechaHoraFin` se calcula server-side (`fechaHoraInicio + Paquete.DuracionMinutos`),
no se manda. Response `201` (`ReservaDetalleDTO`). `400` si sala/paquete
inactivos, fecha pasada, o supera cupo. `404` si sala/paquete/ítem extra
no existen. `409` si hay solapamiento de horario en la sala o stock
insuficiente de algún extra.

### `GET /api/reservas/{id}` · `GET /api/reservas?estado=`
Cliente ve solo las propias; Staff/Admin ven todas, filtro opcional por
`estado` (`Pendiente`/`Confirmada`/`EnProceso`/`Completada`/`Cancelada`).

### `PUT /api/reservas/{id}/estado`
Request: `{ "nuevoEstado": "Cancelada" }`. Transiciones válidas:
`Pendiente|Confirmada → Cancelada` (cliente dueño o Staff/Admin),
`Confirmada → EnProceso` y `EnProceso → Completada` (solo Staff/Admin).
`Confirmada` **no** es un destino válido aquí (solo vía pago exitoso).
`400` si la transición no es válida o la reserva ya está en estado
terminal. Al cancelar, repone el stock de los extras consumidos.

### `GET /api/reservas/{id}/historial`
`[Authorize(Roles = "Admin,Staff")]`. Devuelve `HistorialEstadoDTO[]`
con la línea de tiempo completa de cambios de estado.

### `POST /api/pagos`
Request (`CrearPagoDTO`): `{ "idReserva": "guid", "idMetodoPago": 1,
"culqiToken": "tkn_..." }` para `Tarjeta de Crédito/Débito` (vía Culqi:
el resultado lo decide el gateway), o `{ "idReserva": "guid",
"idMetodoPago": 2, "exitoso": true, "transaccionRef": "..." }` para
`Transferencia Bancaria`/`Efectivo` (solo Staff/Admin, confirman a
mano). `monto` nunca lo manda el cliente — el servidor lo fija como
`MontoPaquete + MontoExtras` de la reserva. La reserva debe estar
`Pendiente` — `409` si no. Pago exitoso confirma la reserva
(`Pendiente → Confirmada`) en la misma operación. Response `201`
(`VoucherDTO`). `400` si tarjeta rechazada por Culqi o falta el token.
```

- [ ] **Step 2: Commit**

```bash
git add docs/api-contracts.md
git commit -m "docs(bloque3): documenta contratos de reservas y pagos"
```

---

## Self-review

- **Cobertura del spec:** máquina de estados (Task 3/4) · creación con validaciones y stock (Task 3) · cancelación + reposición (Task 4) · ruteo de pagos gateway/manual + Culqi (Task 1/5) · validators (Task 6) · controllers + autorización (Task 7) · docs (Task 8) · estrategia de rama (ya aplicada al crear `feature/reservas-pagos-core-transaccional` antes de este plan). Todo cubierto.
- **Placeholders:** ninguno — cada step tiene código completo, ningún `TODO`/`TBD`.
- **Consistencia de tipos:** `ReservaDetalleDTO`, `CrearReservaDTO`, `CambiarEstadoReservaDTO`, `HistorialEstadoDTO` (Task 3) se usan igual en Tasks 4/6/7. `IReservaService.AplicarConfirmacionPorPagoAsync(Reserva)` (Task 3) coincide exactamente con el uso en `PagoService` (Task 5). `IInventarioService.ReponerStockAsync` (Task 2) coincide con el uso en `ReservaService.CambiarEstadoAsync` (Task 3). `ICulqiClient`/`ResultadoCargoCulqi` (Task 1) coinciden con el uso en `PagoService` (Task 5).
