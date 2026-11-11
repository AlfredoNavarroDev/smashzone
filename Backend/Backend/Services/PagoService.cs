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
        // Un Paquete con Precio 0 es una entrada de catálogo legal, pero la tabla Pagos
        // tiene CHECK (Monto > 0): se corta aquí para no romper con un DbUpdateException.
        if (montoTotal <= 0)
            throw new ReglaNegocioException("El monto a pagar debe ser mayor a 0.");

        string? transaccionRef;

        if (metodo.Nombre == MetodoTarjeta)
        {
            if (string.IsNullOrWhiteSpace(dto.CulqiToken))
                throw new ReglaNegocioException("Falta el token de Culqi para este método de pago.");

            var resultado = await culqi.CrearCargoAsync(dto.CulqiToken, (int)(montoTotal * 100), reserva.IdClienteNavigation.Email);
            if (!resultado.Exitoso)
                throw await RegistrarIntentoFallidoAsync(reserva.Id, metodo.Id, montoTotal,
                    resultado.MensajeUsuario ?? "El pago fue rechazado por la pasarela.");
            transaccionRef = resultado.ReferenciaCargo;
        }
        else
        {
            if (!actorEsStaffOAdmin)
                throw new ReglaNegocioException("Solo Staff/Admin puede registrar un pago manual.");
            if (dto.Exitoso is null)
                throw new ReglaNegocioException("Debe indicar si el pago manual fue exitoso.");
            if (!dto.Exitoso.Value)
                throw await RegistrarIntentoFallidoAsync(reserva.Id, metodo.Id, montoTotal,
                    "El pago manual no fue exitoso.");
            transaccionRef = dto.TransaccionRef;
        }

        // Llegar aquí implica pago exitoso: todo intento fallido ya lanzó más arriba.
        var pago = new Pago
        {
            Id = Guid.NewGuid(), IdReserva = reserva.Id, IdMetodoPago = metodo.Id,
            Monto = montoTotal, TransaccionRef = transaccionRef, Exitoso = true, FechaPago = time.GetUtcNow().UtcDateTime
        };
        db.Pagos.Add(pago);

        await reservas.AplicarConfirmacionPorPagoAsync(reserva);

        await db.SaveChangesAsync();

        return new VoucherDTO
        {
            IdPago = pago.Id, IdReserva = reserva.Id, Monto = pago.Monto, MetodoPago = metodo.Nombre,
            Exitoso = pago.Exitoso, TransaccionRef = pago.TransaccionRef, FechaPago = pago.FechaPago!.Value,
            EstadoReserva = ReservaService.EstadoConfirmada
        };
    }

    /// <summary>
    /// Deja registrado el intento fallido (`Exitoso = false`) y devuelve la excepción a lanzar,
    /// para que tarjeta rechazada y pago manual fallido compartan el mismo contrato (`400`).
    /// </summary>
    private async Task<ReglaNegocioException> RegistrarIntentoFallidoAsync(
        Guid idReserva, int idMetodoPago, decimal monto, string mensaje)
    {
        db.Pagos.Add(new Pago
        {
            Id = Guid.NewGuid(), IdReserva = idReserva, IdMetodoPago = idMetodoPago,
            Monto = monto, TransaccionRef = null, Exitoso = false, FechaPago = time.GetUtcNow().UtcDateTime
        });
        await db.SaveChangesAsync();
        return new ReglaNegocioException(mensaje);
    }
}
