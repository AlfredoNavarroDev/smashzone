using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

/// <summary>
/// Garantiza una cuenta Admin utilizable en desarrollo. Solo actúa si existen
/// <c>SeedAdmin:Email</c> y <c>SeedAdmin:Password</c> (user-secrets / variables de entorno);
/// así ninguna contraseña vive en el repositorio.
/// </summary>
public static class AdminSeeder
{
    public static async Task SeedAsync(IServiceProvider sp, IConfiguration config)
    {
        var email = config["SeedAdmin:Email"];
        var password = config["SeedAdmin:Password"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password)) return;

        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SmashZoneDbContext>();
        email = AuthService.NormalizarEmail(email);

        var rol = await db.Roles.SingleOrDefaultAsync(r => r.Nombre == AdminUsuarioService.RolAdmin);
        if (rol is null) return; // la BD aún no tiene el script aplicado

        var admin = await db.Usuarios.SingleOrDefaultAsync(u => u.Email == email);
        if (admin is null)
        {
            admin = new Usuario
            {
                Id = Guid.NewGuid(), IdRol = rol.Id, Nombre = "Admin", Apellido = "SmashZone",
                Email = email, Activo = true, FechaRegistro = DateTime.UtcNow
            };
            db.Usuarios.Add(admin);
        }
        admin.IdRol = rol.Id;
        admin.Activo = true;
        admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
        await db.SaveChangesAsync();
    }
}
