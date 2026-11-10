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
}
