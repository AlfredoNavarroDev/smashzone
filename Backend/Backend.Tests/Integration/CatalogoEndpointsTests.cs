using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;

namespace Backend.Tests.Integration;

public class CatalogoEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;

    public CatalogoEndpointsTests(ApiFactory f)
    {
        _f = f;
        _f.Seed(db =>
        {
            if (db.Usuarios.Any(u => u.Email == "admin2@t.com")) return;
            db.Usuarios.Add(new Usuario
            {
                Id = Guid.NewGuid(), IdRol = 1, Nombre = "A", Apellido = "D", Email = "admin2@t.com",
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
    public async Task GetSalas_SinToken_Da200()
    {
        var r = await _f.CreateClient().GetAsync("/api/salas");
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
    }

    [Fact]
    public async Task PostSalas_SinToken_Da401()
    {
        var r = await _f.CreateClient().PostAsJsonAsync("/api/salas", new CrearSalaDTO { Nombre = "X", CapacidadMaxima = 5 });
        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }

    [Fact]
    public async Task PostSalas_ComoCliente_Da403_YComoAdmin_Da201()
    {
        var reg = await _f.CreateClient().PostAsJsonAsync("/api/auth/registro",
            new RegistroDTO { Nombre = "C", Apellido = "L", Email = "cli-catalogo@t.com", Password = "Password1!" });
        Assert.Equal(HttpStatusCode.Created, reg.StatusCode);

        var cliente = await ClienteAutenticado("cli-catalogo@t.com", "Password1!");
        Assert.Equal(HttpStatusCode.Forbidden,
            (await cliente.PostAsJsonAsync("/api/salas", new CrearSalaDTO { Nombre = "Sala Cliente", CapacidadMaxima = 5 })).StatusCode);

        var admin = await ClienteAutenticado("admin2@t.com", "Password1!");
        Assert.Equal(HttpStatusCode.Created,
            (await admin.PostAsJsonAsync("/api/salas", new CrearSalaDTO { Nombre = "Sala Admin", CapacidadMaxima = 5 })).StatusCode);
    }

    [Fact]
    public async Task GetInventario_SinToken_Da200()
    {
        var r = await _f.CreateClient().GetAsync("/api/inventario");
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
    }
}
