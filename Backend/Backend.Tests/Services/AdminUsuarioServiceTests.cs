using Backend.DTOs;
using Backend.Services;

namespace Backend.Tests.Services;

public class AdminUsuarioServiceTests : IDisposable
{
    private readonly TestDb _t = new();
    private readonly AdminUsuarioService _sut;

    public AdminUsuarioServiceTests() => _sut = new AdminUsuarioService(_t.Db, _t.Mapper, _t.Time);
    public void Dispose() => _t.Dispose();

    private DateTime Ahora => _t.Time.Now.UtcDateTime;

    [Fact]
    public async Task Resumen_CuentaTotalesHabilitadosOnlineYActivos7d()
    {
        _t.AddUsuario("admin@x.com", rol: 1, ultimaActividad: Ahora.AddMinutes(-1));   // online
        _t.AddUsuario("a@x.com", ultimaActividad: Ahora.AddMinutes(-10));              // activo 7d, no online
        _t.AddUsuario("b@x.com", ultimaActividad: Ahora.AddDays(-30));                 // inactivo
        _t.AddUsuario("c@x.com", activo: false, ultimaActividad: Ahora.AddMinutes(-1)); // deshabilitado

        var r = await _sut.ResumenAsync();

        Assert.Equal(4, r.TotalRegistrados);
        Assert.Equal(3, r.Habilitados);
        Assert.Equal(1, r.Deshabilitados);
        Assert.Equal(1, r.OnlineAhora);
        Assert.Equal(2, r.Activos7Dias);
        Assert.Equal(1, r.PorRol.Single(x => x.Rol == "Admin").Cantidad);
        Assert.Equal(3, r.PorRol.Single(x => x.Rol == "Cliente").Cantidad);
    }

    [Fact]
    public async Task Resumen_RegistrosPorDia_AgrupaUltimos30Dias()
    {
        _t.AddUsuario("a@x.com", fechaRegistro: Ahora);
        _t.AddUsuario("b@x.com", fechaRegistro: Ahora);
        _t.AddUsuario("c@x.com", fechaRegistro: Ahora.AddDays(-2));
        _t.AddUsuario("viejo@x.com", fechaRegistro: Ahora.AddDays(-90));

        var r = await _sut.ResumenAsync();

        Assert.Equal(2, r.RegistrosPorDia.Single(x => x.Fecha == DateOnly.FromDateTime(Ahora)).Cantidad);
        Assert.Equal(1, r.RegistrosPorDia.Single(x => x.Fecha == DateOnly.FromDateTime(Ahora.AddDays(-2))).Cantidad);
        Assert.DoesNotContain(r.RegistrosPorDia, x => x.Fecha == DateOnly.FromDateTime(Ahora.AddDays(-90)));
    }

    [Fact]
    public async Task Listar_FiltraPorTextoRolYOnline_YPagina()
    {
        _t.AddUsuario("ana@x.com", ultimaActividad: Ahora.AddMinutes(-1));
        _t.AddUsuario("beto@x.com");
        _t.AddUsuario("staff@x.com", rol: 2);

        var porTexto = await _sut.ListarAsync(new FiltroUsuariosDTO { Texto = "ana" });
        Assert.Single(porTexto.Items);

        var porRol = await _sut.ListarAsync(new FiltroUsuariosDTO { IdRol = 2 });
        Assert.Equal("staff@x.com", porRol.Items.Single().Email);

        var online = await _sut.ListarAsync(new FiltroUsuariosDTO { Online = true });
        Assert.True(online.Items.Single().Online);

        var pag = await _sut.ListarAsync(new FiltroUsuariosDTO { Pagina = 2, TamanoPagina = 2 });
        Assert.Equal(3, pag.Total);
        Assert.Single(pag.Items);
    }

    [Fact]
    public async Task CambiarRol_ActualizaRol()
    {
        var admin = _t.AddUsuario("admin@x.com", rol: 1);
        var u = _t.AddUsuario("a@x.com");

        var dto = await _sut.CambiarRolAsync(u.Id, 2, admin.Id);

        Assert.Equal("Staff", dto.Rol);
    }

    [Fact]
    public async Task CambiarRol_RolInexistente_LanzaNoEncontrado()
    {
        var admin = _t.AddUsuario("admin@x.com", rol: 1);
        var u = _t.AddUsuario("a@x.com");
        await Assert.ThrowsAsync<NoEncontradoException>(() => _sut.CambiarRolAsync(u.Id, 99, admin.Id));
    }

    [Fact]
    public async Task CambiarRol_AdminNoPuedeQuitarseSuPropioRol()
    {
        var admin = _t.AddUsuario("admin@x.com", rol: 1);
        _t.AddUsuario("otro-admin@x.com", rol: 1);
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.CambiarRolAsync(admin.Id, 3, admin.Id));
    }

    [Fact]
    public async Task CambiarRol_NoPuedeDejarElSistemaSinAdmins()
    {
        var admin = _t.AddUsuario("admin@x.com", rol: 1);
        var otro = _t.AddUsuario("a@x.com");
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.CambiarRolAsync(admin.Id, 3, otro.Id));
    }

    [Fact]
    public async Task CambiarEstado_DeshabilitaYHabilita()
    {
        var admin = _t.AddUsuario("admin@x.com", rol: 1);
        var u = _t.AddUsuario("a@x.com");

        Assert.False((await _sut.CambiarEstadoAsync(u.Id, false, admin.Id)).Activo);
        Assert.True((await _sut.CambiarEstadoAsync(u.Id, true, admin.Id)).Activo);
    }

    [Fact]
    public async Task CambiarEstado_AdminNoPuedeDeshabilitarseASiMismo()
    {
        var admin = _t.AddUsuario("admin@x.com", rol: 1);
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.CambiarEstadoAsync(admin.Id, false, admin.Id));
    }

    [Fact]
    public async Task CambiarEstado_UsuarioInexistente_LanzaNoEncontrado()
    {
        var admin = _t.AddUsuario("admin@x.com", rol: 1);
        await Assert.ThrowsAsync<NoEncontradoException>(() => _sut.CambiarEstadoAsync(Guid.NewGuid(), false, admin.Id));
    }

    [Fact]
    public async Task ListarRoles_DevuelveLosTres()
    {
        Assert.Equal(3, (await _sut.ListarRolesAsync()).Count);
    }
}
