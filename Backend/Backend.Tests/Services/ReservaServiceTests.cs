using Backend.DTOs;
using Backend.Models;
using Backend.Services;

namespace Backend.Tests.Services;

public class ReservaServiceTests : IDisposable
{
    private readonly TestDb _t = new();
    private readonly InventarioService _inventario;
    private readonly ReservaService _sut;

    public ReservaServiceTests()
    {
        _inventario = new InventarioService(_t.Db, _t.Mapper);
        _sut = new ReservaService(_t.Db, _t.Mapper, _t.Time, _inventario);
    }
    public void Dispose() => _t.Dispose();

    private CrearReservaDTO Dto(Sala sala, Paquete paquete, DateTime? inicio = null, int participantes = 2,
        List<CrearDetalleExtraDTO>? extras = null) => new()
    {
        IdSala = sala.Id, IdPaquete = paquete.Id,
        FechaHoraInicio = inicio ?? _t.Time.Now.UtcDateTime.AddDays(1),
        NumParticipantes = participantes, Extras = extras ?? new()
    };

    [Fact]
    public async Task Crear_Valida_PersisteConEstadoPendienteYHistorialInicial()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A", capacidad: 10);
        var paquete = _t.AddPaquete("Paquete A", precio: 100);

        var dto = await _sut.CrearAsync(Dto(sala, paquete), cliente.Id, actorEsStaffOAdmin: false);

        Assert.Equal("Pendiente", dto.Estado);
        Assert.Equal(100, dto.MontoTotal);
        Assert.Single(_t.Db.HistorialEstadosReservas);
        var h = _t.Db.HistorialEstadosReservas.Single();
        Assert.Null(h.IdEstadoAnterior);
        Assert.Null(h.IdUsuarioCambio);
    }

    [Fact]
    public async Task Crear_ConExtras_DescuentaStockYSumaMontoExtras()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A", precio: 100);
        var item = _t.AddItemExtra("Vaso", stock: 10);

        var dto = await _sut.CrearAsync(
            Dto(sala, paquete, extras: [new CrearDetalleExtraDTO { IdItemExtra = item.Id, Cantidad = 3 }]),
            cliente.Id, actorEsStaffOAdmin: false);

        Assert.Equal(100 + 3 * 5, dto.MontoTotal); // precio item = 5 (default AddItemExtra)
        Assert.Equal(7, _t.Db.ItemsExtras.Single().StockDisponible);
    }

    [Fact]
    public async Task Crear_SalaInactiva_LanzaReglaNegocio()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A", activa: false);
        var paquete = _t.AddPaquete("Paquete A");
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.CrearAsync(Dto(sala, paquete), cliente.Id, false));
    }

    [Fact]
    public async Task Crear_FechaEnElPasado_LanzaReglaNegocio()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _sut.CrearAsync(Dto(sala, paquete, inicio: _t.Time.Now.UtcDateTime.AddDays(-1)), cliente.Id, false));
    }

    [Fact]
    public async Task Crear_SuperaCapacidadSala_LanzaReglaNegocio()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A", capacidad: 2);
        var paquete = _t.AddPaquete("Paquete A");
        await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _sut.CrearAsync(Dto(sala, paquete, participantes: 5), cliente.Id, false));
    }

    [Fact]
    public async Task Crear_Solapamiento_LanzaConflicto()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var inicio = _t.Time.Now.UtcDateTime.AddDays(1);
        _t.AddReserva(cliente, sala, paquete, inicio: inicio);

        await Assert.ThrowsAsync<ConflictoException>(() => _sut.CrearAsync(Dto(sala, paquete, inicio: inicio), cliente.Id, false));
    }

    [Fact]
    public async Task Crear_NoSolapaConReservaCancelada()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var inicio = _t.Time.Now.UtcDateTime.AddDays(1);
        _t.AddReserva(cliente, sala, paquete, estado: "Cancelada", inicio: inicio);

        var dto = await _sut.CrearAsync(Dto(sala, paquete, inicio: inicio), cliente.Id, false);
        Assert.Equal("Pendiente", dto.Estado);
    }

    [Fact]
    public async Task Crear_StockInsuficiente_LanzaReglaNegocio()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var item = _t.AddItemExtra("Vaso", stock: 1);
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.CrearAsync(
            Dto(sala, paquete, extras: [new CrearDetalleExtraDTO { IdItemExtra = item.Id, Cantidad = 5 }]),
            cliente.Id, false));
    }

    [Fact]
    public async Task Crear_StaffReservaParaOtroCliente_UsaIdClienteDelDto()
    {
        var staff = _t.AddUsuario("staff@x.com", rol: 2);
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var dto = Dto(sala, paquete);
        dto.IdCliente = cliente.Id;

        var creada = await _sut.CrearAsync(dto, staff.Id, actorEsStaffOAdmin: true);
        Assert.Equal(cliente.Id, creada.IdCliente);
    }

    [Fact]
    public async Task CambiarEstado_ClienteCancelaPropia_ReponeStockYQuedaCancelada()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var item = _t.AddItemExtra("Vaso", stock: 10);
        var creada = await _sut.CrearAsync(
            Dto(sala, paquete, extras: [new CrearDetalleExtraDTO { IdItemExtra = item.Id, Cantidad = 4 }]),
            cliente.Id, false);

        var dto = await _sut.CambiarEstadoAsync(creada.Id, "Cancelada", cliente.Id, actorEsStaffOAdmin: false);

        Assert.Equal("Cancelada", dto.Estado);
        Assert.Equal(10, _t.Db.ItemsExtras.Single().StockDisponible);
        Assert.Equal(2, _t.Db.HistorialEstadosReservas.Count()); // creacion + cancelacion
    }

    [Fact]
    public async Task CambiarEstado_SinEstadosTrackeados_DevuelveElEstadoNuevoEnElDTO()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var creada = await _sut.CrearAsync(Dto(sala, paquete), cliente.Id, false);

        // El fixture deja los 5 EstadosReserva trackeados desde su constructor, lo que
        // enmascara una respuesta construida sobre la entidad en memoria: al limpiar el
        // tracker, el DTO solo puede traer el estado correcto si el servicio recarga.
        _t.Db.ChangeTracker.Clear();

        var dto = await _sut.CambiarEstadoAsync(creada.Id, "Cancelada", cliente.Id, actorEsStaffOAdmin: false);

        Assert.Equal("Cancelada", dto.Estado);
    }

    [Fact]
    public async Task CambiarEstado_ClienteCancelaReservaAjena_LanzaNoEncontrado()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var otro = _t.AddUsuario("otro@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var creada = await _sut.CrearAsync(Dto(sala, paquete), cliente.Id, false);

        await Assert.ThrowsAsync<NoEncontradoException>(() =>
            _sut.CambiarEstadoAsync(creada.Id, "Cancelada", otro.Id, actorEsStaffOAdmin: false));
    }

    [Fact]
    public async Task CambiarEstado_ClienteIntentaEnProceso_LanzaReglaNegocio()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Confirmada");

        // Transición válida (Confirmada -> EnProceso), pero el actor no es Staff/Admin.
        await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _sut.CambiarEstadoAsync(reserva.Id, "EnProceso", cliente.Id, actorEsStaffOAdmin: false));
    }

    [Fact]
    public async Task CambiarEstado_StaffAvanzaConfirmadaAEnProcesoYCompletada()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var staff = _t.AddUsuario("s@x.com", rol: 2);
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Confirmada");

        var enProceso = await _sut.CambiarEstadoAsync(reserva.Id, "EnProceso", staff.Id, actorEsStaffOAdmin: true);
        Assert.Equal("EnProceso", enProceso.Estado);

        var completada = await _sut.CambiarEstadoAsync(reserva.Id, "Completada", staff.Id, actorEsStaffOAdmin: true);
        Assert.Equal("Completada", completada.Estado);
    }

    [Fact]
    public async Task CambiarEstado_DesdeEstadoTerminal_LanzaReglaNegocio()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var staff = _t.AddUsuario("s@x.com", rol: 2);
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Completada");

        await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _sut.CambiarEstadoAsync(reserva.Id, "Cancelada", staff.Id, actorEsStaffOAdmin: true));
    }

    [Fact]
    public async Task AplicarConfirmacionPorPago_ReservaNoPendiente_LanzaReglaNegocio()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Confirmada");

        // El método es público en IReservaService: no puede depender de que el llamador valide.
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _sut.AplicarConfirmacionPorPagoAsync(reserva));
        Assert.Empty(_t.Db.HistorialEstadosReservas);
    }

    [Fact]
    public async Task CambiarEstado_ConfirmadaManual_LanzaReglaNegocio()
    {
        var cliente = _t.AddUsuario("c@x.com");
        var staff = _t.AddUsuario("s@x.com", rol: 2);
        var sala = _t.AddSala("Sala A");
        var paquete = _t.AddPaquete("Paquete A");
        var reserva = _t.AddReserva(cliente, sala, paquete, estado: "Pendiente");

        await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _sut.CambiarEstadoAsync(reserva.Id, "Confirmada", staff.Id, actorEsStaffOAdmin: true));
    }
}
