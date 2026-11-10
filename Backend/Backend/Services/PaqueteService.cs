using AutoMapper;
using AutoMapper.QueryableExtensions;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IPaqueteService
{
    Task<List<PaqueteDTO>> ListarAsync(bool? activo);
    Task<PaqueteDTO> ObtenerAsync(int id);
    Task<PaqueteDTO> CrearAsync(CrearPaqueteDTO dto);
    Task<PaqueteDTO> ActualizarAsync(int id, ActualizarPaqueteDTO dto);
    Task<PaqueteDTO> CambiarEstadoAsync(int id, bool activo);
}

public class PaqueteService(SmashZoneDbContext db, IMapper mapper) : IPaqueteService
{
    public async Task<List<PaqueteDTO>> ListarAsync(bool? activo)
    {
        var q = db.Paquetes.AsNoTracking().AsQueryable();
        if (activo is not null) q = q.Where(p => p.Activo == activo);
        return await q.OrderBy(p => p.Nombre).ProjectTo<PaqueteDTO>(mapper.ConfigurationProvider).ToListAsync();
    }

    public async Task<PaqueteDTO> ObtenerAsync(int id) => mapper.Map<PaqueteDTO>(await Cargar(id));

    public async Task<PaqueteDTO> CrearAsync(CrearPaqueteDTO dto)
    {
        await ValidarNombreUnico(dto.Nombre, excluirId: null);
        var p = new Paquete
        {
            Nombre = dto.Nombre.Trim(), Descripcion = dto.Descripcion.Trim(), Precio = dto.Precio,
            DuracionMinutos = dto.DuracionMinutos, MaxParticipantes = dto.MaxParticipantes,
            CantidadItemsEstandar = dto.CantidadItemsEstandar, Activo = true
        };
        db.Paquetes.Add(p);
        await db.SaveChangesAsync();
        return mapper.Map<PaqueteDTO>(p);
    }

    public async Task<PaqueteDTO> ActualizarAsync(int id, ActualizarPaqueteDTO dto)
    {
        var p = await Cargar(id);
        await ValidarNombreUnico(dto.Nombre, excluirId: id);
        p.Nombre = dto.Nombre.Trim();
        p.Descripcion = dto.Descripcion.Trim();
        p.Precio = dto.Precio;
        p.DuracionMinutos = dto.DuracionMinutos;
        p.MaxParticipantes = dto.MaxParticipantes;
        p.CantidadItemsEstandar = dto.CantidadItemsEstandar;
        await db.SaveChangesAsync();
        return mapper.Map<PaqueteDTO>(p);
    }

    public async Task<PaqueteDTO> CambiarEstadoAsync(int id, bool activo)
    {
        var p = await Cargar(id);
        p.Activo = activo;
        await db.SaveChangesAsync();
        return mapper.Map<PaqueteDTO>(p);
    }

    private async Task<Paquete> Cargar(int id) =>
        await db.Paquetes.SingleOrDefaultAsync(p => p.Id == id) ?? throw new NoEncontradoException("Paquete no encontrado.");

    private async Task ValidarNombreUnico(string nombre, int? excluirId)
    {
        var n = nombre.Trim();
        var existe = await db.Paquetes.AnyAsync(p => p.Nombre == n && p.Id != (excluirId ?? 0));
        if (existe) throw new ConflictoException("Ya existe un paquete con ese nombre.");
    }
}
