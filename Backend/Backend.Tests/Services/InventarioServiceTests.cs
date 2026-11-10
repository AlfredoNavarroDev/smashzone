using Backend.DTOs;
using Backend.Services;

namespace Backend.Tests.Services;

public class InventarioServiceTests : IDisposable
{
    private readonly TestDb _t = new();
    private readonly InventarioService _sut;

    public InventarioServiceTests() => _sut = new InventarioService(_t.Db, _t.Mapper);
    public void Dispose() => _t.Dispose();

    private static CrearItemExtraDTO CrearDto(string nombre = "Vaso de vidrio") => new()
    {
        Nombre = nombre, Categoria = "Vidrio", PrecioUnitario = 5, StockDisponible = 10
    };

    [Fact]
    public async Task Crear_PersisteYDevuelveDTO()
    {
        var dto = await _sut.CrearAsync(CrearDto());
        Assert.NotEqual(0, dto.Id);
        Assert.Equal(10, dto.StockDisponible);
        Assert.True(dto.Activo);
    }

    [Fact]
    public async Task Crear_NombreDuplicado_LanzaConflicto()
    {
        _t.AddItemExtra("Vaso de vidrio");
        await Assert.ThrowsAsync<ConflictoException>(() => _sut.CrearAsync(CrearDto("Vaso de vidrio")));
    }

    [Fact]
    public async Task Obtener_NoExistente_LanzaNoEncontrado()
    {
        await Assert.ThrowsAsync<NoEncontradoException>(() => _sut.ObtenerAsync(999));
    }

    [Fact]
    public async Task Actualizar_CambiaDatos()
    {
        var i = _t.AddItemExtra("Vaso de vidrio");
        var dto = await _sut.ActualizarAsync(i.Id, new ActualizarItemExtraDTO
        {
            Nombre = "Vaso grande", Categoria = "Vidrio", PrecioUnitario = 8, StockDisponible = 20
        });
        Assert.Equal("Vaso grande", dto.Nombre);
        Assert.Equal(20, dto.StockDisponible);
    }

    [Fact]
    public async Task CambiarEstado_Desactiva()
    {
        var i = _t.AddItemExtra("Vaso de vidrio");
        var dto = await _sut.CambiarEstadoAsync(i.Id, false);
        Assert.False(dto.Activo);
    }

    [Fact]
    public async Task Listar_FiltraPorCategoriaYActivo()
    {
        _t.Db.ItemsExtras.Add(new Backend.Models.ItemsExtra { Nombre = "Plato", Categoria = "Ceramica", PrecioUnitario = 3, StockDisponible = 5, Activo = true });
        _t.AddItemExtra("Vaso", activo: true);
        _t.Db.SaveChanges();
        var resultado = await _sut.ListarAsync(categoria: "Vidrio", activo: true);
        Assert.Single(resultado);
        Assert.Equal("Vaso", resultado[0].Nombre);
    }

    [Fact]
    public async Task DescontarStock_ConStockSuficiente_Descuenta()
    {
        var i = _t.AddItemExtra("Vaso", stock: 10);
        await _sut.DescontarStockAsync(i.Id, 4);
        await _t.Db.SaveChangesAsync();
        Assert.Equal(6, _t.Db.ItemsExtras.Single().StockDisponible);
    }

    [Fact]
    public async Task DescontarStock_Insuficiente_LanzaReglaNegocioYNoDescuenta()
    {
        var i = _t.AddItemExtra("Vaso", stock: 2);
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.DescontarStockAsync(i.Id, 5));
        Assert.Equal(2, _t.Db.ItemsExtras.Single().StockDisponible);
    }

    [Fact]
    public async Task DescontarStock_ItemInactivo_LanzaReglaNegocio()
    {
        var i = _t.AddItemExtra("Vaso", stock: 10, activo: false);
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.DescontarStockAsync(i.Id, 1));
    }
}
