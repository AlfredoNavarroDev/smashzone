using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IReportesService
{
    Task<List<IngresoMesDTO>> IngresosPorMesAsync(DateTime? desde, DateTime? hasta);
    Task<List<PaqueteDemandaDTO>> PaqueteMasDemandadoAsync(DateTime? desde, DateTime? hasta);
    Task<List<HoraPicoDTO>> HorasPicoAsync(DateTime? desde, DateTime? hasta);
}

public class ReportesService(SmashZoneDbContext db) : IReportesService
{
    public async Task<List<IngresoMesDTO>> IngresosPorMesAsync(DateTime? desde, DateTime? hasta)
    {
        ValidarRango(desde, hasta);
        var q = db.Pagos.AsNoTracking().Where(p => p.Exitoso);
        if (desde is not null) q = q.Where(p => p.FechaPago >= desde);
        if (hasta is not null) q = q.Where(p => p.FechaPago < hasta.Value.Date.AddDays(1));

        var proyectado = q.Select(p => new { Anio = p.FechaPago!.Value.Year, Mes = p.FechaPago!.Value.Month, p.Monto });

        var grupos = await proyectado
            .GroupBy(x => new { x.Anio, x.Mes })
            .Select(g => new IngresoMesDTO(g.Key.Anio, g.Key.Mes, g.Sum(x => x.Monto)))
            .ToListAsync();

        return grupos.OrderBy(g => g.Anio).ThenBy(g => g.Mes).ToList();
    }

    public async Task<List<PaqueteDemandaDTO>> PaqueteMasDemandadoAsync(DateTime? desde, DateTime? hasta)
    {
        ValidarRango(desde, hasta);
        var grupos = await ReservasNoCanceladas(desde, hasta)
            .GroupBy(r => new { r.IdPaquete, Nombre = r.IdPaqueteNavigation.Nombre })
            .Select(g => new PaqueteDemandaDTO(g.Key.IdPaquete, g.Key.Nombre, g.Count()))
            .ToListAsync();

        return grupos.OrderByDescending(g => g.TotalReservas).ToList();
    }

    public async Task<List<HoraPicoDTO>> HorasPicoAsync(DateTime? desde, DateTime? hasta)
    {
        ValidarRango(desde, hasta);
        var grupos = await ReservasNoCanceladas(desde, hasta)
            .GroupBy(r => r.FechaHoraInicio.Hour)
            .Select(g => new HoraPicoDTO(g.Key, g.Count()))
            .ToListAsync();

        return grupos.OrderByDescending(g => g.TotalReservas).ToList();
    }

    private IQueryable<Reserva> ReservasNoCanceladas(DateTime? desde, DateTime? hasta)
    {
        var q = db.Reservas.AsNoTracking().Where(r => r.IdEstadoNavigation.Nombre != ReservaService.EstadoCancelada);
        if (desde is not null) q = q.Where(r => r.FechaHoraInicio >= desde);
        if (hasta is not null) q = q.Where(r => r.FechaHoraInicio < hasta.Value.Date.AddDays(1));
        return q;
    }

    private static void ValidarRango(DateTime? desde, DateTime? hasta)
    {
        if (desde is not null && hasta is not null && desde > hasta)
            throw new ReglaNegocioException("La fecha 'desde' no puede ser posterior a 'hasta'.");
    }
}
