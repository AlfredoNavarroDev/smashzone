namespace Backend.DTOs;

public class RegistroDTO
{
    public string Nombre { get; set; } = "";
    public string Apellido { get; set; } = "";
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
    public string? Telefono { get; set; }
    public string? DocumentoIdentidad { get; set; }
}

public class LoginDTO
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
}

/// <summary>Datos públicos de un usuario. Nunca incluye el hash de la contraseña.</summary>
public class UsuarioDTO
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Apellido { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Telefono { get; set; }
    public string? DocumentoIdentidad { get; set; }
    public string Rol { get; set; } = "";
    public bool Activo { get; set; }
    public DateTime? FechaRegistro { get; set; }
}

public class LoginRespuestaDTO
{
    public string Token { get; set; } = "";
    public DateTime ExpiraEn { get; set; }
    public UsuarioDTO Usuario { get; set; } = new();
}

public class ActualizarPerfilDTO
{
    public string Nombre { get; set; } = "";
    public string Apellido { get; set; } = "";
    public string? Telefono { get; set; }
}

public class CambiarPasswordDTO
{
    public string PasswordActual { get; set; } = "";
    public string PasswordNueva { get; set; } = "";
}
