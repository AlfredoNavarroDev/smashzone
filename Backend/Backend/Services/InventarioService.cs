using AutoMapper;
using AutoMapper.QueryableExtensions;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IInventarioService
{
    Task<List<ItemExtraDTO>> ListarAsync(string? categoria, bool? activo);
    Task<ItemExtraDTO> ObtenerAsync(int id);
    Task<ItemExtraDTO> CrearAsync(CrearItemExtraDTO dto);
    Task<ItemExtraDTO> ActualizarAsync(int id, ActualizarItemExtraDTO dto);
    Task<ItemExtraDTO> CambiarEstadoAsync(int id, bool activo);

    /// <summary>
    /// Descuenta stock de un ítem para el Bloque 3 (Reservas). Deja la entidad trackeada
    /// y modificada en memoria; NO llama SaveChanges — el llamador persiste todo junto
    /// en su propia transacción (misma instancia de DbContext, scoped por request).
    /// Lanza <see cref="ReglaNegocioException"/> si <paramref name="cantidad"/> es &lt;= 0,
    /// el ítem está inactivo o no hay stock suficiente.
    /// Sin protección de concurrencia (no hay optimistic concurrency token en ItemsExtras):
    /// dos reservas simultáneas sobre el mismo ítem pueden leer el mismo stock antes de
    /// que cualquiera persista — Bloque 3 debe serializar el acceso (ej. transacción con
    /// aislamiento adecuado o un lock explícito) si esto le preocupa en producción.
    /// </summary>
    Task DescontarStockAsync(int idItem, int cantidad);

    /// <summary>
    /// Repone stock de un ítem (ej. al cancelar una reserva, Bloque 3). Mismo contrato
    /// "muta sin guardar" que <see cref="DescontarStockAsync"/>: deja la entidad trackeada
    /// en memoria, NO llama SaveChanges.
    /// </summary>
    Task ReponerStockAsync(int idItem, int cantidad);
}

public class InventarioService(SmashZoneDbContext db, IMapper mapper) : IInventarioService
{
    public async Task<List<ItemExtraDTO>> ListarAsync(string? categoria, bool? activo)
    {
        var q = db.ItemsExtras.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(categoria)) q = q.Where(i => i.Categoria == categoria);
        if (activo is not null) q = q.Where(i => i.Activo == activo);
        return await q.OrderBy(i => i.Nombre).ProjectTo<ItemExtraDTO>(mapper.ConfigurationProvider).ToListAsync();
    }

    public async Task<ItemExtraDTO> ObtenerAsync(int id) => mapper.Map<ItemExtraDTO>(await Cargar(id));

    public async Task<ItemExtraDTO> CrearAsync(CrearItemExtraDTO dto)
    {
        await ValidarNombreUnico(dto.Nombre, excluirId: null);
        var i = new ItemsExtra
        {
            Nombre = dto.Nombre.Trim(), Categoria = dto.Categoria.Trim(),
            PrecioUnitario = dto.PrecioUnitario, StockDisponible = dto.StockDisponible, Activo = true
        };
        db.ItemsExtras.Add(i);
        await db.SaveChangesAsync();
        return mapper.Map<ItemExtraDTO>(i);
    }

    public async Task<ItemExtraDTO> ActualizarAsync(int id, ActualizarItemExtraDTO dto)
    {
        var i = await Cargar(id);
        await ValidarNombreUnico(dto.Nombre, excluirId: id);
        i.Nombre = dto.Nombre.Trim();
        i.Categoria = dto.Categoria.Trim();
        i.PrecioUnitario = dto.PrecioUnitario;
        i.StockDisponible = dto.StockDisponible;
        await db.SaveChangesAsync();
        return mapper.Map<ItemExtraDTO>(i);
    }

    public async Task<ItemExtraDTO> CambiarEstadoAsync(int id, bool activo)
    {
        var i = await Cargar(id);
        i.Activo = activo;
        await db.SaveChangesAsync();
        return mapper.Map<ItemExtraDTO>(i);
    }

    public async Task DescontarStockAsync(int idItem, int cantidad)
    {
        if (cantidad <= 0) throw new ReglaNegocioException("La cantidad a descontar debe ser mayor a 0.");
        var i = await Cargar(idItem);
        if (!i.Activo || i.StockDisponible < cantidad)
            throw new ReglaNegocioException($"Stock insuficiente para '{i.Nombre}'.");
        i.StockDisponible -= cantidad;
    }

    public async Task ReponerStockAsync(int idItem, int cantidad)
    {
        if (cantidad <= 0) throw new ReglaNegocioException("La cantidad a reponer debe ser mayor a 0.");
        var i = await Cargar(idItem);
        i.StockDisponible += cantidad;
    }

    private async Task<ItemsExtra> Cargar(int id) =>
        await db.ItemsExtras.SingleOrDefaultAsync(i => i.Id == id) ?? throw new NoEncontradoException("Ítem de inventario no encontrado.");

    private async Task ValidarNombreUnico(string nombre, int? excluirId)
    {
        var n = nombre.Trim();
        var existe = await db.ItemsExtras.AnyAsync(i => i.Nombre == n && i.Id != (excluirId ?? 0));
        if (existe) throw new ConflictoException("Ya existe un ítem con ese nombre.");
    }
}
