using Backend.DTOs;
using Backend.Validators;

namespace Backend.Tests.Services;

public class CatalogoValidatorTests
{
    private static CrearSalaDTO SalaValida() => new() { Nombre = "Sala A", CapacidadMaxima = 8, Descripcion = "Grande" };

    [Fact] public void CrearSala_Valida_Pasa() => Assert.True(new CrearSalaValidator().Validate(SalaValida()).IsValid);

    [Fact]
    public void CrearSala_NombreVacio_Falla()
    {
        var dto = SalaValida();
        dto.Nombre = "";
        Assert.False(new CrearSalaValidator().Validate(dto).IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void CrearSala_CapacidadNoPositiva_Falla(int capacidad)
    {
        var dto = SalaValida();
        dto.CapacidadMaxima = capacidad;
        Assert.False(new CrearSalaValidator().Validate(dto).IsValid);
    }

    private static CrearPaqueteDTO PaqueteValido() => new()
    {
        Nombre = "Paquete A", Descripcion = "Rompe todo", Precio = 150,
        DuracionMinutos = 45, MaxParticipantes = 6, CantidadItemsEstandar = 20
    };

    [Fact] public void CrearPaquete_Valido_Pasa() => Assert.True(new CrearPaqueteValidator().Validate(PaqueteValido()).IsValid);

    [Fact]
    public void CrearPaquete_DescripcionVacia_Falla()
    {
        var dto = PaqueteValido();
        dto.Descripcion = "";
        Assert.False(new CrearPaqueteValidator().Validate(dto).IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-10)]
    public void CrearPaquete_PrecioNoPositivo_Falla(decimal precio)
    {
        var dto = PaqueteValido();
        dto.Precio = precio;
        Assert.False(new CrearPaqueteValidator().Validate(dto).IsValid);
    }

    [Fact]
    public void CrearPaquete_MaxParticipantesCero_Falla()
    {
        var dto = PaqueteValido();
        dto.MaxParticipantes = 0;
        Assert.False(new CrearPaqueteValidator().Validate(dto).IsValid);
    }

    private static CrearItemExtraDTO ItemValido() => new() { Nombre = "Vaso", Categoria = "Vidrio", PrecioUnitario = 5, StockDisponible = 10 };

    [Fact] public void CrearItemExtra_Valido_Pasa() => Assert.True(new CrearItemExtraValidator().Validate(ItemValido()).IsValid);

    [Fact]
    public void CrearItemExtra_CategoriaVacia_Falla()
    {
        var dto = ItemValido();
        dto.Categoria = "";
        Assert.False(new CrearItemExtraValidator().Validate(dto).IsValid);
    }

    [Fact]
    public void CrearItemExtra_StockNegativo_Falla()
    {
        var dto = ItemValido();
        dto.StockDisponible = -1;
        Assert.False(new CrearItemExtraValidator().Validate(dto).IsValid);
    }
}
