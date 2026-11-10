using AutoMapper;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IAuthService
{
    Task<UsuarioDTO> RegistrarAsync(RegistroDTO dto);
    Task<LoginRespuestaDTO> LoginAsync(LoginDTO dto);
    Task HeartbeatAsync(Guid usuarioId);
}

public class AuthService(
    SmashZoneDbContext db, IMapper mapper, IJwtTokenService jwt, TimeProvider time) : IAuthService
{
    public const string RolCliente = "Cliente";

    public static string NormalizarEmail(string email) => email.Trim().ToLowerInvariant();

    public async Task<UsuarioDTO> RegistrarAsync(RegistroDTO dto)
    {
        var email = NormalizarEmail(dto.Email);
        if (await db.Usuarios.AnyAsync(u => u.Email == email))
            throw new ConflictoException("Ya existe un usuario con ese email.");

        var rol = await db.Roles.SingleOrDefaultAsync(r => r.Nombre == RolCliente)
                  ?? throw new NoEncontradoException($"El rol '{RolCliente}' no existe. Ejecuta el script de BD.");

        var usuario = new Usuario
        {
            Id = Guid.NewGuid(),
            IdRol = rol.Id,
            IdRolNavigation = rol,
            Nombre = dto.Nombre.Trim(),
            Apellido = dto.Apellido.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Telefono = dto.Telefono?.Trim(),
            DocumentoIdentidad = string.IsNullOrWhiteSpace(dto.DocumentoIdentidad) ? null : dto.DocumentoIdentidad.Trim(),
            Activo = true,
            FechaRegistro = time.GetUtcNow().UtcDateTime
        };
        db.Usuarios.Add(usuario);
        await db.SaveChangesAsync();
        return mapper.Map<UsuarioDTO>(usuario);
    }

    public async Task<LoginRespuestaDTO> LoginAsync(LoginDTO dto)
    {
        var email = NormalizarEmail(dto.Email);
        var usuario = await db.Usuarios.Include(u => u.IdRolNavigation).SingleOrDefaultAsync(u => u.Email == email);

        // Mensaje único para no revelar si el email existe.
        if (usuario is null || !PasswordValido(dto.Password, usuario.PasswordHash))
            throw new NoAutorizadoException("Credenciales inválidas.");
        if (!usuario.Activo)
            throw new NoAutorizadoException("La cuenta está deshabilitada. Contacta al administrador.");

        var ahora = time.GetUtcNow().UtcDateTime;
        usuario.UltimoAcceso = ahora;
        usuario.UltimaActividad = ahora;
        await db.SaveChangesAsync();

        return new LoginRespuestaDTO
        {
            Token = jwt.Generar(usuario),
            ExpiraEn = jwt.ExpiraEn(),
            Usuario = mapper.Map<UsuarioDTO>(usuario)
        };
    }

    public async Task HeartbeatAsync(Guid usuarioId)
    {
        var usuario = await db.Usuarios.FindAsync(usuarioId);
        if (usuario is null || !usuario.Activo)
            throw new NoAutorizadoException("Sesión no válida.");
        usuario.UltimaActividad = time.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync();
    }

    private static bool PasswordValido(string password, string hash)
    {
        try { return BCrypt.Net.BCrypt.Verify(password, hash); }
        catch (Exception) { return false; } // hash con formato inválido (ej. datos semilla de ejemplo)
    }
}
