using AutoMapper;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IUsuarioService
{
    Task<UsuarioDTO> ObtenerPerfilAsync(Guid id);
    Task<UsuarioDTO> ActualizarPerfilAsync(Guid id, ActualizarPerfilDTO dto);
    Task CambiarPasswordAsync(Guid id, CambiarPasswordDTO dto);
}

public class UsuarioService(SmashZoneDbContext db, IMapper mapper) : IUsuarioService
{
    private async Task<Usuario> Cargar(Guid id) =>
        await db.Usuarios.Include(u => u.IdRolNavigation).SingleOrDefaultAsync(u => u.Id == id)
        ?? throw new NoEncontradoException("Usuario no encontrado.");

    public async Task<UsuarioDTO> ObtenerPerfilAsync(Guid id) => mapper.Map<UsuarioDTO>(await Cargar(id));

    public async Task<UsuarioDTO> ActualizarPerfilAsync(Guid id, ActualizarPerfilDTO dto)
    {
        var u = await Cargar(id);
        u.Nombre = dto.Nombre.Trim();
        u.Apellido = dto.Apellido.Trim();
        u.Telefono = string.IsNullOrWhiteSpace(dto.Telefono) ? null : dto.Telefono.Trim();
        await db.SaveChangesAsync();
        return mapper.Map<UsuarioDTO>(u);
    }

    public async Task CambiarPasswordAsync(Guid id, CambiarPasswordDTO dto)
    {
        var u = await Cargar(id);
        bool ok;
        try { ok = BCrypt.Net.BCrypt.Verify(dto.PasswordActual, u.PasswordHash); }
        catch (Exception) { ok = false; }
        if (!ok) throw new ReglaNegocioException("La contraseña actual es incorrecta.");

        u.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.PasswordNueva);
        await db.SaveChangesAsync();
    }
}
