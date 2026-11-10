using AutoMapper;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IAdminUsuarioService
{
    Task<PaginadoDTO<AdminUsuarioDTO>> ListarAsync(FiltroUsuariosDTO filtro);
    Task<AdminUsuarioDTO> ObtenerAsync(Guid id);
    Task<AdminUsuarioDTO> CambiarRolAsync(Guid id, int idRol, Guid actorId);
    Task<AdminUsuarioDTO> CambiarEstadoAsync(Guid id, bool activo, Guid actorId);
    Task<UsuariosResumenDTO> ResumenAsync();
    Task<List<RolDTO>> ListarRolesAsync();
}

public class AdminUsuarioService(SmashZoneDbContext db, IMapper mapper, TimeProvider time) : IAdminUsuarioService
{
    public static readonly TimeSpan VentanaOnline = TimeSpan.FromMinutes(5);
    public const string RolAdmin = "Admin";

    private DateTime Ahora => time.GetUtcNow().UtcDateTime;

    public async Task<PaginadoDTO<AdminUsuarioDTO>> ListarAsync(FiltroUsuariosDTO f)
    {
        var corte = Ahora - VentanaOnline;
        var q = db.Usuarios.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(f.Texto))
        {
            var t = f.Texto.Trim().ToLower();
            q = q.Where(u => u.Nombre.ToLower().Contains(t) || u.Apellido.ToLower().Contains(t) || u.Email.ToLower().Contains(t));
        }
        if (f.IdRol is not null) q = q.Where(u => u.IdRol == f.IdRol);
        if (f.Activo is not null) q = q.Where(u => u.Activo == f.Activo);
        if (f.Online == true) q = q.Where(u => u.Activo && u.UltimaActividad >= corte);
        if (f.Online == false) q = q.Where(u => !(u.Activo && u.UltimaActividad >= corte));

        var pagina = Math.Max(1, f.Pagina);
        var tamano = Math.Clamp(f.TamanoPagina, 1, 100);
        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(u => u.FechaRegistro).ThenBy(u => u.Email)
            .Skip((pagina - 1) * tamano).Take(tamano)
            .Select(u => new AdminUsuarioDTO
            {
                Id = u.Id, Nombre = u.Nombre, Apellido = u.Apellido, Email = u.Email, Telefono = u.Telefono,
                IdRol = u.IdRol, Rol = u.IdRolNavigation.Nombre, Activo = u.Activo,
                Online = u.Activo && u.UltimaActividad >= corte,
                FechaRegistro = u.FechaRegistro, UltimoAcceso = u.UltimoAcceso, UltimaActividad = u.UltimaActividad
            })
            .ToListAsync();

        return new PaginadoDTO<AdminUsuarioDTO> { Items = items, Total = total, Pagina = pagina, TamanoPagina = tamano };
    }

    public async Task<AdminUsuarioDTO> ObtenerAsync(Guid id) => ADto(await Cargar(id));

    public async Task<AdminUsuarioDTO> CambiarRolAsync(Guid id, int idRol, Guid actorId)
    {
        var u = await Cargar(id);
        var rol = await db.Roles.FindAsync(idRol) ?? throw new NoEncontradoException("El rol indicado no existe.");

        if (u.IdRolNavigation.Nombre == RolAdmin && rol.Nombre != RolAdmin)
        {
            if (u.Id == actorId)
                throw new ReglaNegocioException("No puedes quitarte tu propio rol de Admin.");
            await ExigirOtroAdminActivo(u.Id);
        }

        u.IdRol = rol.Id;
        u.IdRolNavigation = rol;
        await db.SaveChangesAsync();
        return ADto(u);
    }

    public async Task<AdminUsuarioDTO> CambiarEstadoAsync(Guid id, bool activo, Guid actorId)
    {
        var u = await Cargar(id);

        if (!activo)
        {
            if (u.Id == actorId)
                throw new ReglaNegocioException("No puedes deshabilitar tu propia cuenta.");
            if (u.IdRolNavigation.Nombre == RolAdmin)
                await ExigirOtroAdminActivo(u.Id);
        }

        u.Activo = activo;
        await db.SaveChangesAsync();
        return ADto(u);
    }

    public async Task<UsuariosResumenDTO> ResumenAsync()
    {
        var ahora = Ahora;
        var corteOnline = ahora - VentanaOnline;
        var corte7d = ahora.AddDays(-7);
        var q = db.Usuarios.AsNoTracking();

        var total = await q.CountAsync();
        var habilitados = await q.CountAsync(u => u.Activo);
        var online = await q.CountAsync(u => u.Activo && u.UltimaActividad >= corteOnline);
        var activos7 = await q.CountAsync(u => u.Activo && u.UltimaActividad >= corte7d);

        var porRol = await db.Roles.AsNoTracking()
            .OrderBy(r => r.Id)
            .Select(r => new RolConteoDTO { Rol = r.Nombre, Cantidad = r.Usuarios.Count })
            .ToListAsync();

        var hoy = DateOnly.FromDateTime(ahora);
        var desde = hoy.AddDays(-29);
        var desdeFecha = desde.ToDateTime(TimeOnly.MinValue);
        var fechas = await q.Where(u => u.FechaRegistro >= desdeFecha).Select(u => u.FechaRegistro!.Value).ToListAsync();
        var conteo = fechas.GroupBy(DateOnly.FromDateTime).ToDictionary(g => g.Key, g => g.Count());
        var porDia = Enumerable.Range(0, 30)
            .Select(i => desde.AddDays(i))
            .Select(d => new RegistroDiaDTO { Fecha = d, Cantidad = conteo.GetValueOrDefault(d) })
            .ToList();

        return new UsuariosResumenDTO
        {
            TotalRegistrados = total, Habilitados = habilitados, Deshabilitados = total - habilitados,
            OnlineAhora = online, Activos7Dias = activos7, PorRol = porRol, RegistrosPorDia = porDia
        };
    }

    public async Task<List<RolDTO>> ListarRolesAsync() =>
        mapper.Map<List<RolDTO>>(await db.Roles.AsNoTracking().OrderBy(r => r.Id).ToListAsync());

    private async Task<Usuario> Cargar(Guid id) =>
        await db.Usuarios.Include(u => u.IdRolNavigation).SingleOrDefaultAsync(u => u.Id == id)
        ?? throw new NoEncontradoException("Usuario no encontrado.");

    private async Task ExigirOtroAdminActivo(Guid excluirId)
    {
        var hay = await db.Usuarios.AnyAsync(u => u.Id != excluirId && u.Activo && u.IdRolNavigation.Nombre == RolAdmin);
        if (!hay) throw new ReglaNegocioException("Debe existir al menos otro Admin activo.");
    }

    private AdminUsuarioDTO ADto(Usuario u) => new()
    {
        Id = u.Id, Nombre = u.Nombre, Apellido = u.Apellido, Email = u.Email, Telefono = u.Telefono,
        IdRol = u.IdRol, Rol = u.IdRolNavigation.Nombre, Activo = u.Activo,
        Online = u.Activo && u.UltimaActividad >= Ahora - VentanaOnline,
        FechaRegistro = u.FechaRegistro, UltimoAcceso = u.UltimoAcceso, UltimaActividad = u.UltimaActividad
    };
}
