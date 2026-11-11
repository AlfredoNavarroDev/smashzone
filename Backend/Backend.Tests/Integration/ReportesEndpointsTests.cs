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
