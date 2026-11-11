using Backend.Services;

namespace Backend.Tests.Services;

public class ReportesServiceTests : IDisposable
{
    private readonly TestDb _t = new();
    private readonly ReportesService _sut;

    public ReportesServiceTests()
    {
        _sut = new ReportesService(_t.Db);
    }
    public void Dispose() => _t.Dispose();

    [Fact]
    public async Task IngresosPorMes_SoloExitosos_SumaPorMes()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var reserva1 = _t.AddReserva(cliente, sala, paquete);
        var reserva2 = _t.AddReserva(cliente, sala, paquete, inicio: _t.Time.Now.UtcDateTime.AddDays(2));
        var idTarjeta = _t.Db.MetodosPagos.Single(m => m.Nombre == "Tarjeta de Crédito/Débito").Id;

        _t.AddPago(reserva1, idTarjeta, 100, exitoso: true, fechaPago: new DateTime(2026, 1, 15));
        _t.AddPago(reserva1, idTarjeta, 50, exitoso: true, fechaPago: new DateTime(2026, 1, 20));
        _t.AddPago(reserva2, idTarjeta, 999, exitoso: false, fechaPago: new DateTime(2026, 1, 25));
        _t.AddPago(reserva2, idTarjeta, 200, exitoso: true, fechaPago: new DateTime(2026, 2, 5));

        var reporte = await _sut.IngresosPorMesAsync(null, null);

        Assert.Equal(2, reporte.Count);
        Assert.Equal(2026, reporte[0].Anio);
        Assert.Equal(1, reporte[0].Mes);
        Assert.Equal(150m, reporte[0].TotalIngresos);
        Assert.Equal(2, reporte[1].Mes);
        Assert.Equal(200m, reporte[1].TotalIngresos);
    }

    [Fact]
    public async Task IngresosPorMes_FiltraPorRangoFechas()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var reserva = _t.AddReserva(cliente, sala, paquete);
        var idTarjeta = _t.Db.MetodosPagos.Single(m => m.Nombre == "Tarjeta de Crédito/Débito").Id;

        _t.AddPago(reserva, idTarjeta, 100, fechaPago: new DateTime(2026, 1, 10));
        _t.AddPago(reserva, idTarjeta, 200, fechaPago: new DateTime(2026, 3, 10));

        var reporte = await _sut.IngresosPorMesAsync(new DateTime(2026, 2, 1), new DateTime(2026, 12, 31));

        Assert.Single(reporte);
        Assert.Equal(3, reporte[0].Mes);
        Assert.Equal(200m, reporte[0].TotalIngresos);
    }

    [Fact]
    public async Task IngresosPorMes_DesdeMayorQueHasta_LanzaReglaNegocio() =>
        await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _sut.IngresosPorMesAsync(new DateTime(2026, 5, 1), new DateTime(2026, 1, 1)));

    [Fact]
    public async Task PaqueteMasDemandado_ExcluyeCanceladasYOrdenaDesc()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var popular = _t.AddPaquete("Popular");
        var raro = _t.AddPaquete("Raro");
        var inicio = _t.Time.Now.UtcDateTime.AddDays(1);

        _t.AddReserva(cliente, sala, popular, inicio: inicio);
        _t.AddReserva(cliente, sala, popular, inicio: inicio.AddHours(2));
        _t.AddReserva(cliente, sala, popular, estado: "Cancelada", inicio: inicio.AddHours(4));
        _t.AddReserva(cliente, sala, raro, inicio: inicio.AddHours(6));

        var reporte = await _sut.PaqueteMasDemandadoAsync(null, null);

        Assert.Equal(2, reporte.Count);
        Assert.Equal("Popular", reporte[0].Paquete);
        Assert.Equal(2, reporte[0].TotalReservas);
        Assert.Equal("Raro", reporte[1].Paquete);
        Assert.Equal(1, reporte[1].TotalReservas);
    }

    [Fact]
    public async Task PaqueteMasDemandado_DesdeMayorQueHasta_LanzaReglaNegocio() =>
        await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _sut.PaqueteMasDemandadoAsync(new DateTime(2026, 5, 1), new DateTime(2026, 1, 1)));

    [Fact]
    public async Task HorasPico_ExcluyeCanceladasYAgrupaPorHora()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");

        _t.AddReserva(cliente, sala, paquete, inicio: new DateTime(2026, 12, 1, 18, 0, 0));
        _t.AddReserva(cliente, sala, paquete, inicio: new DateTime(2026, 12, 2, 18, 30, 0));
        _t.AddReserva(cliente, sala, paquete, estado: "Cancelada", inicio: new DateTime(2026, 12, 3, 18, 0, 0));
        _t.AddReserva(cliente, sala, paquete, inicio: new DateTime(2026, 12, 4, 10, 0, 0));

        var reporte = await _sut.HorasPicoAsync(null, null);

        Assert.Equal(2, reporte.Count);
        Assert.Equal(18, reporte[0].Hora);
        Assert.Equal(2, reporte[0].TotalReservas);
        Assert.Equal(10, reporte[1].Hora);
        Assert.Equal(1, reporte[1].TotalReservas);
    }

    [Fact]
    public async Task HorasPico_DesdeMayorQueHasta_LanzaReglaNegocio() =>
        await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _sut.HorasPicoAsync(new DateTime(2026, 5, 1), new DateTime(2026, 1, 1)));

    [Fact]
    public async Task IngresosPorMes_HastaEsFechaSola_IncluyeTodoEseDia()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var reserva = _t.AddReserva(cliente, sala, paquete);
        var idTarjeta = _t.Db.MetodosPagos.Single(m => m.Nombre == "Tarjeta de Crédito/Débito").Id;

        _t.AddPago(reserva, idTarjeta, 100, fechaPago: new DateTime(2026, 1, 31, 23, 30, 0));

        var reporte = await _sut.IngresosPorMesAsync(null, new DateTime(2026, 1, 31));

        Assert.Single(reporte);
        Assert.Equal(100m, reporte[0].TotalIngresos);
    }

    [Fact]
    public async Task PaqueteMasDemandado_HastaEsFechaSola_IncluyeTodoEseDia()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");

        _t.AddReserva(cliente, sala, paquete, inicio: new DateTime(2026, 6, 10, 23, 45, 0));

        var reporte = await _sut.PaqueteMasDemandadoAsync(null, new DateTime(2026, 6, 10));

        Assert.Single(reporte);
        Assert.Equal(1, reporte[0].TotalReservas);
    }
}
