using Backend.DTOs;
using Backend.Services;

namespace Backend.Tests.Services;

public class PagoServiceTests : IDisposable
{
    private readonly TestDb _t = new();
    private readonly FakeCulqiClient _culqi = new();
    private readonly ReservaService _reservas;
    private readonly PagoService _sut;

    public PagoServiceTests()
    {
        var inventario = new InventarioService(_t.Db, _t.Mapper);
        _reservas = new ReservaService(_t.Db, _t.Mapper, _t.Time, inventario);
        _sut = new PagoService(_t.Db, _t.Time, _culqi, _reservas);
    }
    public void Dispose() => _t.Dispose();

    [Fact]
    public async Task Crear_PagoConTarjetaExitoso_ConfirmaReserva()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A", precio: 100);
        var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Pendiente");
        var idTarjeta = _t.Db.MetodosPagos.Single(m => m.Nombre == "Tarjeta de Crédito/Débito").Id;

        var voucher = await _sut.CrearAsync(
            new CrearPagoDTO { IdReserva = reserva.Id, IdMetodoPago = idTarjeta, CulqiToken = "tkn_1" },
            cliente.Id, actorEsStaffOAdmin: false);

        Assert.True(voucher.Exitoso);
        Assert.Equal("Confirmada", voucher.EstadoReserva);
        Assert.Equal(100, voucher.Monto);
        Assert.Equal(2, _t.Db.Reservas.Single().IdEstado); // Confirmada = Id 2 (ver seed de EstadosReservas en TestDb)
    }

    [Fact]
    public async Task Crear_PagoConTarjetaRechazado_ReservaSigueySinTokenLanza()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Pendiente");
        var idTarjeta = _t.Db.MetodosPagos.Single(m => m.Nombre == "Tarjeta de Crédito/Débito").Id;
        _culqi.ProximoExitoso = false;
        _culqi.ProximoMensaje = "Fondos insuficientes.";

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.CrearAsync(
            new CrearPagoDTO { IdReserva = reserva.Id, IdMetodoPago = idTarjeta, CulqiToken = "tkn_2" },
            cliente.Id, false));

        Assert.Equal("Pendiente", _t.Db.EstadosReservas.Single(e => e.Id == _t.Db.Reservas.Single().IdEstado).Nombre);
        Assert.Single(_t.Db.Pagos); // el intento fallido queda registrado
    }

    [Fact]
    public async Task Crear_PagoConTarjetaSinToken_LanzaReglaNegocio()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Pendiente");
        var idTarjeta = _t.Db.MetodosPagos.Single(m => m.Nombre == "Tarjeta de Crédito/Débito").Id;

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.CrearAsync(
            new CrearPagoDTO { IdReserva = reserva.Id, IdMetodoPago = idTarjeta }, cliente.Id, false));
    }

    [Fact]
    public async Task Crear_PagoManualPorStaff_ConfirmaReserva()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var staff = _t.AddUsuario("s@x.com", rol: 2);
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A", precio: 50);
        var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Pendiente");
        var idEfectivo = _t.Db.MetodosPagos.Single(m => m.Nombre == "Efectivo").Id;

        var voucher = await _sut.CrearAsync(
            new CrearPagoDTO { IdReserva = reserva.Id, IdMetodoPago = idEfectivo, Exitoso = true }, staff.Id, true);

        Assert.True(voucher.Exitoso);
        Assert.Equal("Confirmada", voucher.EstadoReserva);
    }

    [Fact]
    public async Task Crear_PagoManualPorCliente_LanzaReglaNegocio()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Pendiente");
        var idEfectivo = _t.Db.MetodosPagos.Single(m => m.Nombre == "Efectivo").Id;

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.CrearAsync(
            new CrearPagoDTO { IdReserva = reserva.Id, IdMetodoPago = idEfectivo, Exitoso = true }, cliente.Id, false));
    }

    [Fact]
    public async Task Crear_ReservaNoPendiente_LanzaConflicto()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Confirmada");
        var idTarjeta = _t.Db.MetodosPagos.Single(m => m.Nombre == "Tarjeta de Crédito/Débito").Id;

        await Assert.ThrowsAsync<ConflictoException>(() => _sut.CrearAsync(
            new CrearPagoDTO { IdReserva = reserva.Id, IdMetodoPago = idTarjeta, CulqiToken = "tkn_3" },
            cliente.Id, false));
    }
}
