using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Tests.Integration;

public class ApiFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _conn = new("DataSource=:memory:");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _conn.Open();
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, cfg) => cfg.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["JwtSettings:Secret"] = TestDb.Jwt.Secret,
            ["JwtSettings:Issuer"] = TestDb.Jwt.Issuer,
            ["JwtSettings:Audience"] = TestDb.Jwt.Audience,
            ["JwtSettings:ExpirationMinutes"] = "60",
            ["ConnectionStrings:SmashZoneDB"] = "Server=unused"
        }));
        builder.ConfigureServices(services =>
        {
            foreach (var d in services.Where(d =>
                d.ServiceType == typeof(SmashZoneDbContext) ||
                d.ServiceType == typeof(DbContextOptions<SmashZoneDbContext>) ||
                (d.ServiceType.IsGenericType && d.ServiceType.GetGenericArguments().Contains(typeof(SmashZoneDbContext)))).ToList())
                services.Remove(d);
            services.AddScoped<SmashZoneDbContext>(_ => new SqliteTestDbContext(
                new DbContextOptionsBuilder<SmashZoneDbContext>().UseSqlite(_conn).Options));
        });
    }

    public void Seed(Action<SmashZoneDbContext> action)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SmashZoneDbContext>();
        db.Database.EnsureCreated();
        if (!db.Roles.Any())
            db.Roles.AddRange(new Role { Id = 1, Nombre = "Admin" }, new Role { Id = 2, Nombre = "Staff" }, new Role { Id = 3, Nombre = "Cliente" });
        db.SaveChanges();
        action(db);
        db.SaveChanges();
    }
}

public class AuthEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;

    public AuthEndpointsTests(ApiFactory f)
    {
        _f = f;
        _f.Seed(db =>
        {
            if (db.Usuarios.Any()) return;
            db.Usuarios.Add(new Usuario
            {
                Id = Guid.NewGuid(), IdRol = 1, Nombre = "A", Apellido = "D", Email = "admin@t.com",
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
    public async Task RutaAdmin_SinToken_Da401()
    {
        var r = await _f.CreateClient().GetAsync("/api/admin/usuarios/resumen");
        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }

    [Fact]
    public async Task RutaAdmin_ComoCliente_Da403_YComoAdmin_Da200()
    {
        var reg = await _f.CreateClient().PostAsJsonAsync("/api/auth/registro",
            new RegistroDTO { Nombre = "C", Apellido = "L", Email = "cli@t.com", Password = "Password1!" });
        Assert.Equal(HttpStatusCode.Created, reg.StatusCode);

        var cliente = await ClienteAutenticado("cli@t.com", "Password1!");
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.GetAsync("/api/admin/usuarios/resumen")).StatusCode);

        var admin = await ClienteAutenticado("admin@t.com", "Password1!");
        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync("/api/admin/usuarios/resumen")).StatusCode);
    }

    [Fact]
    public async Task Registro_EmailDuplicado_Da409_YLoginMalo_Da401()
    {
        var c = _f.CreateClient();
        var dto = new RegistroDTO { Nombre = "D", Apellido = "U", Email = "dup@t.com", Password = "Password1!" };
        await c.PostAsJsonAsync("/api/auth/registro", dto);
        Assert.Equal(HttpStatusCode.Conflict, (await c.PostAsJsonAsync("/api/auth/registro", dto)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await c.PostAsJsonAsync("/api/auth/login", new LoginDTO { Email = "dup@t.com", Password = "x" })).StatusCode);
    }

    [Fact]
    public async Task Registro_PasswordDebil_Da400()
    {
        var r = await _f.CreateClient().PostAsJsonAsync("/api/auth/registro",
            new RegistroDTO { Nombre = "D", Apellido = "U", Email = "debil@t.com", Password = "123" });
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
    }

    [Fact]
    public async Task Me_DevuelvePerfilDelToken()
    {
        var admin = await ClienteAutenticado("admin@t.com", "Password1!");
        var me = await admin.GetFromJsonAsync<UsuarioDTO>("/api/usuarios/me");
        Assert.Equal("admin@t.com", me!.Email);
    }
}
