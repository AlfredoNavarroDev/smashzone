using Backend.DTOs;
using Backend.Services;

namespace Backend.Tests.Services;

public class SalaServiceTests : IDisposable
{
    private readonly TestDb _t = new();
    private readonly SalaService _sut;

    public SalaServiceTests() => _sut = new SalaService(_t.Db, _t.Mapper);
    public void Dispose() => _t.Dispose();

    [Fact]
    public async Task Crear_PersisteYDevuelveDTO()
    {
        var dto = await _sut.CrearAsync(new CrearSalaDTO { Nombre = "Sala A", CapacidadMaxima = 8, Descripcion = "Grande" });
        Assert.NotEqual(0, dto.Id);
        Assert.Equal("Sala A", dto.Nombre);
        Assert.True(dto.Activa);
    }

    [Fact]
    public async Task Crear_NombreDuplicado_LanzaConflicto()
    {
        _t.AddSala("Sala A");
        await Assert.ThrowsAsync<ConflictoException>(() =>
            _sut.CrearAsync(new CrearSalaDTO { Nombre = "Sala A", CapacidadMaxima = 8 }));
    }

    [Fact]
    public async Task Obtener_NoExistente_LanzaNoEncontrado()
    {
        await Assert.ThrowsAsync<NoEncontradoException>(() => _sut.ObtenerAsync(999));
    }

    [Fact]
    public async Task Actualizar_CambiaDatos()
    {
        var s = _t.AddSala("Sala A");
        var dto = await _sut.ActualizarAsync(s.Id, new ActualizarSalaDTO { Nombre = "Sala Reformada", CapacidadMaxima = 12 });
        Assert.Equal("Sala Reformada", dto.Nombre);
        Assert.Equal(12, dto.CapacidadMaxima);
    }

    [Fact]
    public async Task CambiarEstado_Desactiva()
    {
        var s = _t.AddSala("Sala A");
        var dto = await _sut.CambiarEstadoAsync(s.Id, false);
        Assert.False(dto.Activa);
    }

    [Fact]
    public async Task Actualizar_NombreDuplicadoDeOtraSala_LanzaConflicto()
    {
        _t.AddSala("Sala A");
        var otra = _t.AddSala("Sala B");
        await Assert.ThrowsAsync<ConflictoException>(() =>
            _sut.ActualizarAsync(otra.Id, new ActualizarSalaDTO { Nombre = "Sala A", CapacidadMaxima = 8 }));
    }

    [Fact]
    public async Task Listar_FiltraPorActiva()
    {
        _t.AddSala("Activa", activa: true);
        _t.AddSala("Inactiva", activa: false);
        var resultado = await _sut.ListarAsync(activa: true);
        Assert.Single(resultado);
        Assert.Equal("Activa", resultado[0].Nombre);
    }
}
