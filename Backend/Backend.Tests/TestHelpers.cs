using System.Security.Cryptography;
using AutoMapper;
using Backend.Configuration;
using Backend.Data;
using Backend.Mapping;
using Backend.Models;
using Backend.Services;
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

/// <summary>BD SQLite en memoria con los roles semilla (1=Admin, 2=Staff, 3=Cliente).</summary>
public sealed class TestDb : IDisposable
{
    private readonly SqliteConnection _conn;
    public SmashZoneDbContext Db { get; }
    public IMapper Mapper { get; }
    public FakeTime Time { get; } = new();

    // Se genera en cada ejecución: ningún secreto literal en el repositorio.
    private static readonly string TestSecret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));

    public static JwtSettings Jwt => new()
    {
        Secret = TestSecret,
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
        Mapper = new MapperConfiguration(c =>
        {
            c.AddProfile<UsuarioProfile>();
            c.AddProfile<CatalogoProfile>();
            c.AddProfile<ReservaProfile>();
        }, NullLoggerFactory.Instance).CreateMapper();
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

    public Sala AddSala(string nombre, int capacidad = 10, bool activa = true)
    {
        var s = new Sala { Nombre = nombre, CapacidadMaxima = capacidad, Activa = activa };
        Db.Salas.Add(s);
        Db.SaveChanges();
        return s;
    }

    public Paquete AddPaquete(string nombre, decimal precio = 100, bool activo = true)
    {
        var p = new Paquete
        {
            Nombre = nombre, Descripcion = "Descripcion", Precio = precio,
            DuracionMinutos = 30, MaxParticipantes = 4, CantidadItemsEstandar = 15, Activo = activo
        };
        Db.Paquetes.Add(p);
        Db.SaveChanges();
        return p;
    }

    public ItemsExtra AddItemExtra(string nombre, int stock = 10, bool activo = true)
    {
        var i = new ItemsExtra { Nombre = nombre, Categoria = "Vidrio", PrecioUnitario = 5, StockDisponible = stock, Activo = activo };
        Db.ItemsExtras.Add(i);
        Db.SaveChanges();
        return i;
    }

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

    public void Dispose() { Db.Dispose(); _conn.Dispose(); }
}
