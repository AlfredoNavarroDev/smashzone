using AutoMapper;
using Backend.Configuration;
using Backend.Data;
using Backend.Mapping;
using Backend.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Backend.Tests;

/// <summary>SQLite no conoce getutcdate()/newid(): se quitan los DEFAULT de SQL Server (los servicios fijan Id y fechas).</summary>
public class SqliteTestDbContext(DbContextOptions<SmashZoneDbContext> options) : SmashZoneDbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        foreach (var prop in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetProperties()))
            if (prop.GetDefaultValueSql() is not null)
                prop.SetDefaultValueSql(null);
    }
}

public sealed class FakeTime : TimeProvider
{
    public DateTimeOffset Now { get; set; } = new(2026, 11, 9, 12, 0, 0, TimeSpan.Zero);
    public override DateTimeOffset GetUtcNow() => Now;
}

/// <summary>BD SQLite en memoria con los roles semilla (1=Admin, 2=Staff, 3=Cliente).</summary>
public sealed class TestDb : IDisposable
{
    private readonly SqliteConnection _conn;
    public SmashZoneDbContext Db { get; }
    public IMapper Mapper { get; }
    public FakeTime Time { get; } = new();

    public static JwtSettings Jwt => new()
    {
        Secret = "clave-de-pruebas-con-al-menos-32-caracteres!!",
        Issuer = "smashzone-tests",
        Audience = "smashzone-tests",
        ExpirationMinutes = 60
    };

    public static IOptions<JwtSettings> JwtOptions => Options.Create(Jwt);

    public TestDb()
    {
        _conn = new SqliteConnection("DataSource=:memory:");
        _conn.Open();
        Db = new SqliteTestDbContext(new DbContextOptionsBuilder<SmashZoneDbContext>().UseSqlite(_conn).Options);
        Db.Database.EnsureCreated();
        Db.Roles.AddRange(
            new Role { Id = 1, Nombre = "Admin" },
            new Role { Id = 2, Nombre = "Staff" },
            new Role { Id = 3, Nombre = "Cliente" });
        Db.SaveChanges();
        Mapper = new MapperConfiguration(c => c.AddProfile<UsuarioProfile>(), NullLoggerFactory.Instance).CreateMapper();
    }

    public Usuario AddUsuario(string email, int rol = 3, bool activo = true, string password = "Password1!",
        DateTime? ultimaActividad = null, DateTime? fechaRegistro = null)
    {
        var u = new Usuario
        {
            Id = Guid.NewGuid(), IdRol = rol, Nombre = "Nombre", Apellido = "Apellido", Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, 4), Activo = activo,
            UltimaActividad = ultimaActividad, FechaRegistro = fechaRegistro ?? Time.Now.UtcDateTime
        };
        Db.Usuarios.Add(u);
        Db.SaveChanges();
        return u;
    }

    public void Dispose() { Db.Dispose(); _conn.Dispose(); }
}
