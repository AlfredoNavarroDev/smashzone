using Backend.DTOs;
using Backend.Services;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Services;

public class AuthServiceTests : IDisposable
{
    private readonly TestDb _t = new();
    private readonly AuthService _sut;

    public AuthServiceTests() =>
        _sut = new AuthService(_t.Db, _t.Mapper, new JwtTokenService(TestDb.JwtOptions, _t.Time), _t.Time);

    public void Dispose() => _t.Dispose();

    private static RegistroDTO Registro(string email = "ana@correo.com") => new()
    {
        Nombre = "Ana", Apellido = "Garcia", Email = email, Password = "Password1!", Telefono = "999888777"
    };

    [Fact]
    public async Task Registrar_CreaClienteConPasswordHasheado()
    {
        var dto = await _sut.RegistrarAsync(Registro());

        Assert.Equal("Cliente", dto.Rol);
        Assert.True(dto.Activo);
        var u = await _t.Db.Usuarios.SingleAsync();
        Assert.NotEqual("Password1!", u.PasswordHash);
        Assert.True(BCrypt.Net.BCrypt.Verify("Password1!", u.PasswordHash));
    }

    [Fact]
    public async Task Registrar_EmailDuplicadoSinImportarMayusculas_LanzaConflicto()
    {
        await _sut.RegistrarAsync(Registro("ana@correo.com"));
        await Assert.ThrowsAsync<ConflictoException>(() => _sut.RegistrarAsync(Registro("ANA@correo.com")));
    }

    [Fact]
    public async Task Login_Correcto_DevuelveTokenYActualizaUltimoAcceso()
    {
        _t.AddUsuario("ana@correo.com");

        var res = await _sut.LoginAsync(new LoginDTO { Email = "ana@correo.com", Password = "Password1!" });

        Assert.False(string.IsNullOrWhiteSpace(res.Token));
        Assert.Equal("Cliente", res.Usuario.Rol);
        var u = await _t.Db.Usuarios.SingleAsync();
        Assert.Equal(_t.Time.Now.UtcDateTime, u.UltimoAcceso);
        Assert.Equal(_t.Time.Now.UtcDateTime, u.UltimaActividad);
    }

    [Fact]
    public async Task Login_PasswordIncorrecto_LanzaNoAutorizado()
    {
        _t.AddUsuario("ana@correo.com");
        await Assert.ThrowsAsync<NoAutorizadoException>(() =>
            _sut.LoginAsync(new LoginDTO { Email = "ana@correo.com", Password = "mala" }));
    }

    [Fact]
    public async Task Login_EmailInexistente_LanzaNoAutorizado()
    {
        await Assert.ThrowsAsync<NoAutorizadoException>(() =>
            _sut.LoginAsync(new LoginDTO { Email = "nadie@correo.com", Password = "x" }));
    }

    [Fact]
    public async Task Login_UsuarioDeshabilitado_LanzaNoAutorizado()
    {
        _t.AddUsuario("ana@correo.com", activo: false);
        await Assert.ThrowsAsync<NoAutorizadoException>(() =>
            _sut.LoginAsync(new LoginDTO { Email = "ana@correo.com", Password = "Password1!" }));
    }

    [Fact]
    public async Task Heartbeat_ActualizaUltimaActividad()
    {
        var u = _t.AddUsuario("ana@correo.com");
        await _sut.HeartbeatAsync(u.Id);
        Assert.Equal(_t.Time.Now.UtcDateTime, (await _t.Db.Usuarios.SingleAsync()).UltimaActividad);
    }
}
