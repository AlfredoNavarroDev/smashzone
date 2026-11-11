using AutoMapper;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IReservaService
{
    Task<ReservaDetalleDTO> CrearAsync(CrearReservaDTO dto, Guid actorId, bool actorEsStaffOAdmin);
    Task<ReservaDetalleDTO> ObtenerAsync(Guid id, Guid actorId, bool actorEsStaffOAdmin);
    Task<List<ReservaDetalleDTO>> ListarAsync(Guid actorId, bool actorEsStaffOAdmin, string? estado);
    Task<ReservaDetalleDTO> CambiarEstadoAsync(Guid id, string nuevoEstado, Guid actorId, bool actorEsStaffOAdmin);
    Task<List<HistorialEstadoDTO>> HistorialAsync(Guid id);

    /// <summary>
    /// Uso interno de PagoService: confirma Pendiente -> Confirmada sobre una entidad
    /// Reserva ya trackeada por el mismo DbContext. Muta en memoria, NO llama SaveChanges
    /// — el llamador persiste todo junto (Pago + confirmación + historial).
    /// </summary>
    Task AplicarConfirmacionPorPagoAsync(Reserva reserva);
}

public class ReservaService(SmashZoneDbContext db, IMapper mapper, TimeProvider time, IInventarioService inventario) : IReservaService
{
    public const string EstadoPendiente = "Pendiente";
    public const string EstadoConfirmada = "Confirmada";
    public const string EstadoEnProceso = "EnProceso";
    public const string EstadoCompletada = "Completada";
    public const string EstadoCancelada = "Cancelada";

    private DateTime Ahora => time.GetUtcNow().UtcDateTime;

    public async Task<ReservaDetalleDTO> CrearAsync(CrearReservaDTO dto, Guid actorId, bool actorEsStaffOAdmin)
    {
        var idCliente = actorEsStaffOAdmin && dto.IdCliente is not null ? dto.IdCliente.Value : actorId;
        if (actorEsStaffOAdmin && dto.IdCliente is not null)
        {
            var existeCliente = await db.Usuarios.AnyAsync(u => u.Id == idCliente);
            if (!existeCliente) throw new NoEncontradoException("El usuario indicado como cliente no existe.");
        }

        var sala = await db.Salas.SingleOrDefaultAsync(s => s.Id == dto.IdSala)
            ?? throw new NoEncontradoException("Sala no encontrada.");
        if (!sala.Activa) throw new ReglaNegocioException("La sala no está disponible.");

        var paquete = await db.Paquetes.SingleOrDefaultAsync(p => p.Id == dto.IdPaquete)
            ?? throw new NoEncontradoException("Paquete no encontrado.");
        if (!paquete.Activo) throw new ReglaNegocioException("El paquete no está disponible.");

        if (dto.FechaHoraInicio <= Ahora)
            throw new ReglaNegocioException("La fecha de inicio debe ser futura.");

        if (dto.NumParticipantes > sala.CapacidadMaxima)
            throw new ReglaNegocioException($"Supera la capacidad máxima de la sala ({sala.CapacidadMaxima}).");
        if (dto.NumParticipantes > paquete.MaxParticipantes)
            throw new ReglaNegocioException($"Supera el máximo de participantes del paquete ({paquete.MaxParticipantes}).");

        var fechaFin = dto.FechaHoraInicio.AddMinutes(paquete.DuracionMinutos);

        var haySolapamiento = await db.Reservas.AnyAsync(r =>
            r.IdSala == dto.IdSala &&
            r.IdEstadoNavigation.Nombre != EstadoCancelada &&
            dto.FechaHoraInicio < r.FechaHoraFin && fechaFin > r.FechaHoraInicio);
        if (haySolapamiento) throw new ConflictoException("La sala ya está reservada en ese horario.");

        var idPendiente = (await EstadosAsync())[EstadoPendiente];
        var reserva = new Reserva
        {
            Id = Guid.NewGuid(), IdCliente = idCliente, IdSala = dto.IdSala, IdPaquete = dto.IdPaquete,
            IdEstado = idPendiente, FechaHoraInicio = dto.FechaHoraInicio, FechaHoraFin = fechaFin,
            NumParticipantes = dto.NumParticipantes, MontoPaquete = paquete.Precio, MontoExtras = 0,
            NotasEspeciales = string.IsNullOrWhiteSpace(dto.NotasEspeciales) ? null : dto.NotasEspeciales.Trim(),
            FechaCreacion = Ahora
        };
        db.Reservas.Add(reserva);

        decimal montoExtras = 0;
        foreach (var extra in dto.Extras)
        {
            var item = await db.ItemsExtras.AsNoTracking().SingleOrDefaultAsync(i => i.Id == extra.IdItemExtra)
                ?? throw new NoEncontradoException($"Ítem de inventario {extra.IdItemExtra} no encontrado.");
            await inventario.DescontarStockAsync(extra.IdItemExtra, extra.Cantidad);
            db.DetallesReservaExtras.Add(new DetallesReservaExtra
            {
                IdReserva = reserva.Id, IdItemExtra = extra.IdItemExtra,
                Cantidad = extra.Cantidad, PrecioUnitarioHistorico = item.PrecioUnitario
            });
            montoExtras += item.PrecioUnitario * extra.Cantidad;
        }
        reserva.MontoExtras = montoExtras;

        db.HistorialEstadosReservas.Add(new HistorialEstadosReserva
        {
            IdReserva = reserva.Id, IdEstadoAnterior = null, IdEstadoNuevo = idPendiente,
            IdUsuarioCambio = null, FechaCambio = Ahora
        });

        await db.SaveChangesAsync();
        return mapper.Map<ReservaDetalleDTO>(await CargarConEstado(reserva.Id));
    }

    public async Task<ReservaDetalleDTO> ObtenerAsync(Guid id, Guid actorId, bool actorEsStaffOAdmin)
    {
        var reserva = await CargarConEstado(id);
        if (!actorEsStaffOAdmin && reserva.IdCliente != actorId)
            throw new NoEncontradoException("Reserva no encontrada.");
        return mapper.Map<ReservaDetalleDTO>(reserva);
    }

    public async Task<List<ReservaDetalleDTO>> ListarAsync(Guid actorId, bool actorEsStaffOAdmin, string? estado)
    {
        var q = db.Reservas.AsNoTracking()
            .Include(r => r.IdEstadoNavigation)
            .Include(r => r.IdSalaNavigation)
            .Include(r => r.IdPaqueteNavigation)
            .Include(r => r.DetallesReservaExtras).ThenInclude(d => d.IdItemExtraNavigation)
            .AsQueryable();
        if (!actorEsStaffOAdmin) q = q.Where(r => r.IdCliente == actorId);
        if (!string.IsNullOrWhiteSpace(estado)) q = q.Where(r => r.IdEstadoNavigation.Nombre == estado);
        var reservas = await q.OrderByDescending(r => r.FechaCreacion).ToListAsync();
        return mapper.Map<List<ReservaDetalleDTO>>(reservas);
    }

    public async Task<ReservaDetalleDTO> CambiarEstadoAsync(Guid id, string nuevoEstado, Guid actorId, bool actorEsStaffOAdmin)
    {
        var reserva = await CargarConEstado(id);
        if (!actorEsStaffOAdmin && reserva.IdCliente != actorId)
            throw new NoEncontradoException("Reserva no encontrada.");

        if (nuevoEstado == EstadoConfirmada)
            throw new ReglaNegocioException("No se puede confirmar manualmente; la confirmación ocurre al registrar un pago exitoso.");

        var estadoActual = reserva.IdEstadoNavigation.Nombre;
        if (estadoActual is EstadoCompletada or EstadoCancelada)
            throw new ReglaNegocioException($"La reserva ya está en un estado final ({estadoActual}).");

        var transicionValida = (estadoActual, nuevoEstado) switch
        {
            (EstadoPendiente, EstadoCancelada) => true,
            (EstadoConfirmada, EstadoCancelada) => true,
            (EstadoConfirmada, EstadoEnProceso) => true,
            (EstadoEnProceso, EstadoCompletada) => true,
            _ => false
        };
        if (!transicionValida)
            throw new ReglaNegocioException($"No se puede pasar de '{estadoActual}' a '{nuevoEstado}'.");

        if (nuevoEstado != EstadoCancelada && !actorEsStaffOAdmin)
            throw new ReglaNegocioException("Solo Staff/Admin puede realizar esta transición.");

        if (nuevoEstado == EstadoCancelada)
            foreach (var d in reserva.DetallesReservaExtras)
                await inventario.ReponerStockAsync(d.IdItemExtra, d.Cantidad);

        var estados = await EstadosAsync();
        var idAnterior = reserva.IdEstado;
        reserva.IdEstado = estados[nuevoEstado];
        db.HistorialEstadosReservas.Add(new HistorialEstadosReserva
        {
            IdReserva = reserva.Id, IdEstadoAnterior = idAnterior, IdEstadoNuevo = reserva.IdEstado,
            IdUsuarioCambio = actorEsStaffOAdmin ? actorId : null, FechaCambio = Ahora
        });
        await db.SaveChangesAsync();
        // Recarga igual que CrearAsync: EstadosAsync() consulta AsNoTracking, así que el
        // nuevo principal no entra al identity map y IdEstadoNavigation quedaría obsoleto.
        return mapper.Map<ReservaDetalleDTO>(await CargarConEstado(id));
    }

    public async Task<List<HistorialEstadoDTO>> HistorialAsync(Guid id)
    {
        _ = await CargarConEstado(id);
        var historial = await db.HistorialEstadosReservas.AsNoTracking()
            .Where(h => h.IdReserva == id)
            .Include(h => h.IdEstadoAnteriorNavigation)
            .Include(h => h.IdEstadoNuevoNavigation)
            .Include(h => h.IdUsuarioCambioNavigation)
            .OrderBy(h => h.FechaCambio)
            .ToListAsync();
        return mapper.Map<List<HistorialEstadoDTO>>(historial);
    }

    public async Task AplicarConfirmacionPorPagoAsync(Reserva reserva)
    {
        var estados = await EstadosAsync();

        // Guarda defensiva propia: el invariante "la reserva está Pendiente" no puede
        // depender solo de que el llamador lo haya verificado. El nombre se resuelve por
        // Id contra el catálogo para no asumir que IdEstadoNavigation venga cargada.
        var estadoActual = estados.FirstOrDefault(e => e.Value == reserva.IdEstado).Key;
        if (estadoActual != EstadoPendiente)
            throw new ReglaNegocioException(
                $"Solo una reserva '{EstadoPendiente}' puede confirmarse por pago (actual: '{estadoActual ?? "desconocido"}').");

        var idConfirmada = estados[EstadoConfirmada];
        var idAnterior = reserva.IdEstado;
        reserva.IdEstado = idConfirmada;
        db.HistorialEstadosReservas.Add(new HistorialEstadosReserva
        {
            IdReserva = reserva.Id, IdEstadoAnterior = idAnterior, IdEstadoNuevo = idConfirmada,
            IdUsuarioCambio = null, FechaCambio = Ahora
        });
    }

    private async Task<Reserva> CargarConEstado(Guid id) =>
        await db.Reservas
            .Include(r => r.IdEstadoNavigation)
            .Include(r => r.IdSalaNavigation)
            .Include(r => r.IdPaqueteNavigation)
            .Include(r => r.DetallesReservaExtras).ThenInclude(d => d.IdItemExtraNavigation)
            .SingleOrDefaultAsync(r => r.Id == id)
        ?? throw new NoEncontradoException("Reserva no encontrada.");

    private async Task<Dictionary<string, int>> EstadosAsync() =>
        await db.EstadosReservas.AsNoTracking().ToDictionaryAsync(e => e.Nombre, e => e.Id);
}
