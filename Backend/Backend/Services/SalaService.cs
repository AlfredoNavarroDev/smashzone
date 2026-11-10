using AutoMapper;
using AutoMapper.QueryableExtensions;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface ISalaService
{
    Task<List<SalaDTO>> ListarAsync(bool? activa);
    Task<SalaDTO> ObtenerAsync(int id);
    Task<SalaDTO> CrearAsync(CrearSalaDTO dto);
    Task<SalaDTO> ActualizarAsync(int id, ActualizarSalaDTO dto);
    Task<SalaDTO> CambiarEstadoAsync(int id, bool activa);
}

public class SalaService(SmashZoneDbContext db, IMapper mapper) : ISalaService
{
    public async Task<List<SalaDTO>> ListarAsync(bool? activa)
    {
        var q = db.Salas.AsNoTracking().AsQueryable();
        if (activa is not null) q = q.Where(s => s.Activa == activa);
        return await q.OrderBy(s => s.Nombre).ProjectTo<SalaDTO>(mapper.ConfigurationProvider).ToListAsync();
    }

    public async Task<SalaDTO> ObtenerAsync(int id) => mapper.Map<SalaDTO>(await Cargar(id));

    public async Task<SalaDTO> CrearAsync(CrearSalaDTO dto)
    {
        await ValidarNombreUnico(dto.Nombre, excluirId: null);
        var s = new Sala { Nombre = dto.Nombre.Trim(), CapacidadMaxima = dto.CapacidadMaxima, Descripcion = dto.Descripcion?.Trim(), Activa = true };
        db.Salas.Add(s);
        await db.SaveChangesAsync();
        return mapper.Map<SalaDTO>(s);
    }

    public async Task<SalaDTO> ActualizarAsync(int id, ActualizarSalaDTO dto)
    {
        var s = await Cargar(id);
        await ValidarNombreUnico(dto.Nombre, excluirId: id);
        s.Nombre = dto.Nombre.Trim();
        s.CapacidadMaxima = dto.CapacidadMaxima;
        s.Descripcion = dto.Descripcion?.Trim();
        await db.SaveChangesAsync();
        return mapper.Map<SalaDTO>(s);
    }

    public async Task<SalaDTO> CambiarEstadoAsync(int id, bool activa)
    {
        var s = await Cargar(id);
        s.Activa = activa;
        await db.SaveChangesAsync();
        return mapper.Map<SalaDTO>(s);
    }

    private async Task<Sala> Cargar(int id) =>
        await db.Salas.SingleOrDefaultAsync(s => s.Id == id) ?? throw new NoEncontradoException("Sala no encontrada.");

    private async Task ValidarNombreUnico(string nombre, int? excluirId)
    {
        var n = nombre.Trim();
        var existe = await db.Salas.AnyAsync(s => s.Nombre == n && s.Id != (excluirId ?? 0));
        if (existe) throw new ConflictoException("Ya existe una sala con ese nombre.");
    }
}
