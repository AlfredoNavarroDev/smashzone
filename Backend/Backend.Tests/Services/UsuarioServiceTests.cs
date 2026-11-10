using Backend.DTOs;
using Backend.Services;

namespace Backend.Tests.Services;

public class UsuarioServiceTests : IDisposable
{
    private readonly TestDb _t = new();
    private readonly UsuarioService _sut;

    public UsuarioServiceTests() => _sut = new UsuarioService(_t.Db, _t.Mapper);
    public void Dispose() => _t.Dispose();

    [Fact]
    public async Task ObtenerPerfil_NoExponePasswordHash()
    {
        var u = _t.AddUsuario("a@x.com");
        var dto = await _sut.ObtenerPerfilAsync(u.Id);
        Assert.Equal("a@x.com", dto.Email);
        Assert.DoesNotContain(typeof(UsuarioDTO).GetProperties(), p => p.Name.Contains("Password"));
    }

    [Fact]
    public async Task ActualizarPerfil_CambiaDatosEditables()
    {
        var u = _t.AddUsuario("a@x.com");
        var dto = await _sut.ActualizarPerfilAsync(u.Id,
            new ActualizarPerfilDTO { Nombre = "Nuevo", Apellido = "Apellido", Telefono = "111" });
        Assert.Equal("Nuevo", dto.Nombre);
        Assert.Equal("111", dto.Telefono);
    }

    [Fact]
    public async Task CambiarPassword_Correcta_ActualizaHash()
    {
        var u = _t.AddUsuario("a@x.com");
        await _sut.CambiarPasswordAsync(u.Id,
            new CambiarPasswordDTO { PasswordActual = "Password1!", PasswordNueva = "NuevaClave9!" });
        Assert.True(BCrypt.Net.BCrypt.Verify("NuevaClave9!", _t.Db.Usuarios.Single().PasswordHash));
    }

    [Fact]
    public async Task CambiarPassword_ActualIncorrecta_LanzaReglaNegocio()
    {
        var u = _t.AddUsuario("a@x.com");
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.CambiarPasswordAsync(u.Id,
            new CambiarPasswordDTO { PasswordActual = "mala", PasswordNueva = "NuevaClave9!" }));
    }
}
