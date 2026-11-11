using Backend.DTOs;
using Backend.Validators;

namespace Backend.Tests.Services;

public class ReservaPagoValidatorTests
{
    private static CrearReservaDTO ReservaValida() => new()
    {
        IdSala = 1, IdPaquete = 1, FechaHoraInicio = DateTime.UtcNow.AddDays(1), NumParticipantes = 2
    };

    [Fact] public void CrearReserva_Valida_Pasa() => Assert.True(new CrearReservaValidator().Validate(ReservaValida()).IsValid);

    [Fact]
    public void CrearReserva_NumParticipantesCero_Falla()
    {
        var dto = ReservaValida();
        dto.NumParticipantes = 0;
        Assert.False(new CrearReservaValidator().Validate(dto).IsValid);
    }

    [Fact]
    public void CrearReserva_ExtraCantidadCero_Falla()
    {
        var dto = ReservaValida();
        dto.Extras = [new CrearDetalleExtraDTO { IdItemExtra = 1, Cantidad = 0 }];
        Assert.False(new CrearReservaValidator().Validate(dto).IsValid);
    }

    [Theory]
    [InlineData("Cancelada")]
    [InlineData("EnProceso")]
    [InlineData("Completada")]
    public void CambiarEstadoReserva_ValoresPermitidos_Pasa(string estado) =>
        Assert.True(new CambiarEstadoReservaValidator().Validate(new CambiarEstadoReservaDTO { NuevoEstado = estado }).IsValid);

    [Fact]
    public void CambiarEstadoReserva_Confirmada_Falla() =>
        Assert.False(new CambiarEstadoReservaValidator().Validate(new CambiarEstadoReservaDTO { NuevoEstado = "Confirmada" }).IsValid);

    [Fact]
    public void CrearPago_IdMetodoPagoCero_Falla() =>
        Assert.False(new CrearPagoValidator().Validate(new CrearPagoDTO { IdMetodoPago = 0 }).IsValid);

    [Fact]
    public void CrearPago_Valido_Pasa() =>
        Assert.True(new CrearPagoValidator().Validate(new CrearPagoDTO { IdMetodoPago = 1 }).IsValid);

    [Fact]
    public void CrearPago_TransaccionRefDemasiadoLarga_Falla() =>
        Assert.False(new CrearPagoValidator()
            .Validate(new CrearPagoDTO { IdMetodoPago = 2, TransaccionRef = new string('x', 101) }).IsValid);

    [Fact]
    public void CrearPago_TransaccionRefEnElLimite_Pasa() =>
        Assert.True(new CrearPagoValidator()
            .Validate(new CrearPagoDTO { IdMetodoPago = 2, TransaccionRef = new string('x', 100) }).IsValid);
}
