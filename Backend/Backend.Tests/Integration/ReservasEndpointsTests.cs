using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Backend.DTOs;
using Backend.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Tests.Integration;

public class ReservasEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    private Sala _sala = null!;
    private Paquete _paquete = null!;
    private MetodosPago _metodoManual = null!;

    public ReservasEndpointsTests(ApiFactory f)
    {
        _f = f;
        _f.Seed(db =>
        {
            if (!db.MetodosPagos.Any())
                db.MetodosPagos.AddRange(
                    new MetodosPago { Id = 1, Nombre = "Tarjeta de Crédito/Débito" },
                    new MetodosPago { Id = 2, Nombre = "Transferencia Bancaria" },
                    new MetodosPago { Id = 3, Nombre = "Efectivo" });
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
        _metodoManual = db.MetodosPagos.Single(m => m.Nombre == "Transferencia Bancaria");
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

    /// <summary>Ningún test debe poder salir a api.culqi.com por accidente.</summary>
    [Fact]
    public void HostDePruebas_ResuelveLaPasarelaFalsa()
    {
        using var scope = _f.Services.CreateScope();
        Assert.IsType<FakeCulqiClient>(scope.ServiceProvider.GetRequiredService<Backend.Services.ICulqiClient>());
    }

    /// <summary>
    /// Cubre /api/pagos a nivel HTTP: el endpoint existe, exige token y aplica la regla de
    /// que un pago manual (Transferencia/Efectivo) solo lo confirma Staff/Admin.
    /// </summary>
    [Fact]
    public async Task PostPagos_ManualComoCliente_Da400_YSinToken_Da401()
    {
        var reg = await _f.CreateClient().PostAsJsonAsync("/api/auth/registro",
            new RegistroDTO { Nombre = "C", Apellido = "L", Email = "cli-pago@t.com", Password = "Password1!" });
        Assert.Equal(HttpStatusCode.Created, reg.StatusCode);
        var cliente = await ClienteAutenticado("cli-pago@t.com", "Password1!");

        var crear = await cliente.PostAsJsonAsync("/api/reservas",
            new CrearReservaDTO { IdSala = _sala.Id, IdPaquete = _paquete.Id, FechaHoraInicio = DateTime.UtcNow.AddDays(5), NumParticipantes = 2 });
        Assert.Equal(HttpStatusCode.Created, crear.StatusCode);
        var creada = await crear.Content.ReadFromJsonAsync<ReservaDetalleDTO>();

        var pagoDto = new CrearPagoDTO { IdReserva = creada!.Id, IdMetodoPago = _metodoManual.Id, Exitoso = true };

        Assert.Equal(HttpStatusCode.Unauthorized,
            (await _f.CreateClient().PostAsJsonAsync("/api/pagos", pagoDto)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await cliente.PostAsJsonAsync("/api/pagos", pagoDto)).StatusCode);
    }
}
