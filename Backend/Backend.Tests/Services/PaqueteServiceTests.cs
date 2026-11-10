using Backend.DTOs;
using Backend.Services;

namespace Backend.Tests.Services;

public class PaqueteServiceTests : IDisposable
{
    private readonly TestDb _t = new();
    private readonly PaqueteService _sut;

    public PaqueteServiceTests() => _sut = new PaqueteService(_t.Db, _t.Mapper);
    public void Dispose() => _t.Dispose();

    private static CrearPaqueteDTO CrearDto(string nombre = "Paquete A") => new()
    {
        Nombre = nombre, Descripcion = "Rompe todo", Precio = 150, DuracionMinutos = 45,
        MaxParticipantes = 6, CantidadItemsEstandar = 20
    };

    [Fact]
    public async Task Crear_PersisteYDevuelveDTO()
    {
        var dto = await _sut.CrearAsync(CrearDto());
        Assert.NotEqual(0, dto.Id);
        Assert.Equal(150, dto.Precio);
        Assert.True(dto.Activo);
    }

    [Fact]
    public async Task Crear_NombreDuplicado_LanzaConflicto()
    {
        _t.AddPaquete("Paquete A");
        await Assert.ThrowsAsync<ConflictoException>(() => _sut.CrearAsync(CrearDto("Paquete A")));
    }

    [Fact]
    public async Task Obtener_NoExistente_LanzaNoEncontrado()
    {
        await Assert.ThrowsAsync<NoEncontradoException>(() => _sut.ObtenerAsync(999));
    }

    [Fact]
    public async Task Actualizar_CambiaDatos()
    {
        var p = _t.AddPaquete("Paquete A");
        var dto = await _sut.ActualizarAsync(p.Id, new ActualizarPaqueteDTO
        {
            Nombre = "Paquete Pro", Descripcion = "Nuevo", Precio = 200,
            DuracionMinutos = 60, MaxParticipantes = 8, CantidadItemsEstandar = 25
        });
        Assert.Equal("Paquete Pro", dto.Nombre);
        Assert.Equal(200, dto.Precio);
    }

    [Fact]
    public async Task CambiarEstado_Desactiva()
    {
        var p = _t.AddPaquete("Paquete A");
        var dto = await _sut.CambiarEstadoAsync(p.Id, false);
        Assert.False(dto.Activo);
    }

    [Fact]
    public async Task Actualizar_NombreDuplicadoDeOtroPaquete_LanzaConflicto()
    {
        _t.AddPaquete("Paquete A");
        var otro = _t.AddPaquete("Paquete B");
        await Assert.ThrowsAsync<ConflictoException>(() => _sut.ActualizarAsync(otro.Id, new ActualizarPaqueteDTO
        {
            Nombre = "Paquete A", Descripcion = "Nuevo", Precio = 200,
            DuracionMinutos = 60, MaxParticipantes = 8, CantidadItemsEstandar = 25
        }));
    }

    [Fact]
    public async Task Listar_FiltraPorActivo()
    {
        _t.AddPaquete("Activo", activo: true);
        _t.AddPaquete("Inactivo", activo: false);
        var resultado = await _sut.ListarAsync(activo: true);
        Assert.Single(resultado);
        Assert.Equal("Activo", resultado[0].Nombre);
    }
}
