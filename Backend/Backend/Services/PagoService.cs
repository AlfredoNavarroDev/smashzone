using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IPagoService
{
    Task<VoucherDTO> CrearAsync(CrearPagoDTO dto, Guid actorId, bool actorEsStaffOAdmin);
}

public class PagoService(SmashZoneDbContext db, TimeProvider time, ICulqiClient culqi, IReservaService reservas) : IPagoService
{
    public const string MetodoTarjeta = "Tarjeta de Crédito/Débito";

    public async Task<VoucherDTO> CrearAsync(CrearPagoDTO dto, Guid actorId, bool actorEsStaffOAdmin)
    {
        var metodo = await db.MetodosPagos.AsNoTracking().SingleOrDefaultAsync(m => m.Id == dto.IdMetodoPago)
            ?? throw new NoEncontradoException("Método de pago no encontrado.");

        var reserva = await db.Reservas
            .Include(r => r.IdEstadoNavigation)
            .Include(r => r.IdClienteNavigation)
            .SingleOrDefaultAsync(r => r.Id == dto.IdReserva)
            ?? throw new NoEncontradoException("Reserva no encontrada.");

        if (!actorEsStaffOAdmin && reserva.IdCliente != actorId)
            throw new NoEncontradoException("Reserva no encontrada.");

        if (reserva.IdEstadoNavigation.Nombre != ReservaService.EstadoPendiente)
            throw new ConflictoException("La reserva no está pendiente de pago.");

        var montoTotal = reserva.MontoPaquete + reserva.MontoExtras;
        bool exitoso;
        string? transaccionRef;

        if (metodo.Nombre == MetodoTarjeta)
        {
            if (string.IsNullOrWhiteSpace(dto.CulqiToken))
                throw new ReglaNegocioException("Falta el token de Culqi para este método de pago.");

            var resultado = await culqi.CrearCargoAsync(dto.CulqiToken, (int)(montoTotal * 100), reserva.IdClienteNavigation.Email);
            exitoso = resultado.Exitoso;
            transaccionRef = resultado.ReferenciaCargo;
            if (!exitoso)
            {
                db.Pagos.Add(new Pago
                {
                    Id = Guid.NewGuid(), IdReserva = reserva.Id, IdMetodoPago = metodo.Id,
                    Monto = montoTotal, TransaccionRef = null, Exitoso = false, FechaPago = time.GetUtcNow().UtcDateTime
                });
                await db.SaveChangesAsync();
                throw new ReglaNegocioException(resultado.MensajeUsuario ?? "El pago fue rechazado por la pasarela.");
            }
        }
        else
        {
            if (!actorEsStaffOAdmin)
                throw new ReglaNegocioException("Solo Staff/Admin puede registrar un pago manual.");
            if (dto.Exitoso is null)
                throw new ReglaNegocioException("Debe indicar si el pago manual fue exitoso.");
            exitoso = dto.Exitoso.Value;
            transaccionRef = dto.TransaccionRef;
        }

        var pago = new Pago
        {
            Id = Guid.NewGuid(), IdReserva = reserva.Id, IdMetodoPago = metodo.Id,
            Monto = montoTotal, TransaccionRef = transaccionRef, Exitoso = exitoso, FechaPago = time.GetUtcNow().UtcDateTime
        };
        db.Pagos.Add(pago);

        if (exitoso)
            await reservas.AplicarConfirmacionPorPagoAsync(reserva);

        await db.SaveChangesAsync();

        return new VoucherDTO
        {
            IdPago = pago.Id, IdReserva = reserva.Id, Monto = pago.Monto, MetodoPago = metodo.Nombre,
            Exitoso = pago.Exitoso, TransaccionRef = pago.TransaccionRef, FechaPago = pago.FechaPago!.Value,
            EstadoReserva = exitoso ? ReservaService.EstadoConfirmada : ReservaService.EstadoPendiente
        };
    }
}
