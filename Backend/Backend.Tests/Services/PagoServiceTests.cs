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
    public async Task Crear_PagoManualNoExitoso_LanzaReglaNegocioYRegistraElIntento()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var staff = _t.AddUsuario("s@x.com", rol: 2);
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A", precio: 50);
        var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Pendiente");
        var idEfectivo = _t.Db.MetodosPagos.Single(m => m.Nombre == "Efectivo").Id;

        // Mismo contrato que el rechazo de tarjeta: 400, no un 201 con exitoso=false.
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.CrearAsync(
            new CrearPagoDTO { IdReserva = reserva.Id, IdMetodoPago = idEfectivo, Exitoso = false }, staff.Id, true));

        Assert.False(_t.Db.Pagos.Single().Exitoso); // el intento fallido queda registrado
        Assert.Equal("Pendiente", _t.Db.EstadosReservas.Single(e => e.Id == _t.Db.Reservas.Single().IdEstado).Nombre);
    }

    [Fact]
    public async Task Crear_MontoTotalCero_LanzaReglaNegocio()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete Gratis", precio: 0); // CrearPaqueteValidator permite Precio >= 0
        var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Pendiente");
        var idTarjeta = _t.Db.MetodosPagos.Single(m => m.Nombre == "Tarjeta de Crédito/Débito").Id;

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.CrearAsync(
            new CrearPagoDTO { IdReserva = reserva.Id, IdMetodoPago = idTarjeta, CulqiToken = "tkn_0" },
            cliente.Id, false));

        Assert.Empty(_t.Db.Pagos); // ni se intentó cobrar
    }

    /// <summary>Flujo completo: crear con extras -> pagar -> cancelar, con el stock volviendo a su valor original.</summary>
    [Fact]
    public async Task Flujo_CrearConExtras_Pagar_Cancelar_DevuelveElStock()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A", precio: 100);
        var item = _t.AddItemExtra("Vaso", stock: 10); // PrecioUnitario = 5
        var idTarjeta = _t.Db.MetodosPagos.Single(m => m.Nombre == "Tarjeta de Crédito/Débito").Id;

        var creada = await _reservas.CrearAsync(new CrearReservaDTO
        {
            IdSala = sala.Id, IdPaquete = paquete.Id,
            FechaHoraInicio = _t.Time.Now.UtcDateTime.AddDays(1), NumParticipantes = 2,
            Extras = [new CrearDetalleExtraDTO { IdItemExtra = item.Id, Cantidad = 3 }]
        }, cliente.Id, actorEsStaffOAdmin: false);
        Assert.Equal(7, _t.Db.ItemsExtras.Single().StockDisponible);

        var voucher = await _sut.CrearAsync(
            new CrearPagoDTO { IdReserva = creada.Id, IdMetodoPago = idTarjeta, CulqiToken = "tkn_flujo" },
            cliente.Id, actorEsStaffOAdmin: false);

        Assert.True(voucher.Exitoso);
        Assert.Equal(100 + 3 * 5, voucher.Monto); // paquete + extras, nunca la columna calculada
        Assert.Equal("Confirmada", voucher.EstadoReserva);
        Assert.Equal(2, _t.Db.HistorialEstadosReservas.Count(h => h.IdReserva == creada.Id)); // creación + Pendiente->Confirmada

        var cancelada = await _reservas.CambiarEstadoAsync(creada.Id, "Cancelada", cliente.Id, actorEsStaffOAdmin: false);

        Assert.Equal("Cancelada", cancelada.Estado);
        Assert.Equal(10, _t.Db.ItemsExtras.Single().StockDisponible); // stock repuesto por completo
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
