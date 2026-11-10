namespace Backend.DTOs;

public class AdminUsuarioDTO
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Apellido { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Telefono { get; set; }
    public int IdRol { get; set; }
    public string Rol { get; set; } = "";
    public bool Activo { get; set; }
    public bool Online { get; set; }
    public DateTime? FechaRegistro { get; set; }
    public DateTime? UltimoAcceso { get; set; }
    public DateTime? UltimaActividad { get; set; }
}

public class FiltroUsuariosDTO
{
    public string? Texto { get; set; }
    public int? IdRol { get; set; }
    public bool? Activo { get; set; }
    public bool? Online { get; set; }
    public int Pagina { get; set; } = 1;
    public int TamanoPagina { get; set; } = 20;
}

public class PaginadoDTO<T>
{
    public List<T> Items { get; set; } = new();
    public int Total { get; set; }
    public int Pagina { get; set; }
    public int TamanoPagina { get; set; }
}

public class CambiarRolDTO
{
    public int IdRol { get; set; }
}

public class CambiarEstadoDTO
{
    public bool Activo { get; set; }
}

public class RolDTO
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string? Descripcion { get; set; }
}

public class RolConteoDTO
{
    public string Rol { get; set; } = "";
    public int Cantidad { get; set; }
}

public class RegistroDiaDTO
{
    public DateOnly Fecha { get; set; }
    public int Cantidad { get; set; }
}

public class UsuariosResumenDTO
{
    public int TotalRegistrados { get; set; }
    public int Habilitados { get; set; }
    public int Deshabilitados { get; set; }
    /// <summary>Habilitados con actividad en los últimos 5 minutos (heartbeat).</summary>
    public int OnlineAhora { get; set; }
    /// <summary>Habilitados con actividad en los últimos 7 días.</summary>
    public int Activos7Dias { get; set; }
    public List<RolConteoDTO> PorRol { get; set; } = new();
    public List<RegistroDiaDTO> RegistrosPorDia { get; set; } = new();
}
