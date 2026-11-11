namespace Backend.DTOs;

public class CrearDetalleExtraDTO
{
    public int IdItemExtra { get; set; }
    public int Cantidad { get; set; }
}

public class CrearReservaDTO
{
    public Guid? IdCliente { get; set; }
    public int IdSala { get; set; }
    public int IdPaquete { get; set; }
    public DateTime FechaHoraInicio { get; set; }
    public int NumParticipantes { get; set; }
    public string? NotasEspeciales { get; set; }
    public List<CrearDetalleExtraDTO> Extras { get; set; } = new();
}

public class DetalleExtraDTO
{
    public int IdItemExtra { get; set; }
    public string ItemExtra { get; set; } = "";
    public int Cantidad { get; set; }
    public decimal PrecioUnitarioHistorico { get; set; }
    public decimal Subtotal { get; set; }
}

public class ReservaDetalleDTO
{
    public Guid Id { get; set; }
    public Guid IdCliente { get; set; }
    public int IdSala { get; set; }
    public string Sala { get; set; } = "";
    public int IdPaquete { get; set; }
    public string Paquete { get; set; } = "";
    public string Estado { get; set; } = "";
    public DateTime FechaHoraInicio { get; set; }
    public DateTime FechaHoraFin { get; set; }
    public int NumParticipantes { get; set; }
    public decimal MontoPaquete { get; set; }
    public decimal MontoExtras { get; set; }
    public decimal MontoTotal { get; set; }
    public string? NotasEspeciales { get; set; }
    public DateTime? FechaCreacion { get; set; }
    public List<DetalleExtraDTO> Extras { get; set; } = new();
}

public class CambiarEstadoReservaDTO
{
    public string NuevoEstado { get; set; } = "";
}

public class HistorialEstadoDTO
{
    public string? EstadoAnterior { get; set; }
    public string EstadoNuevo { get; set; } = "";
    public Guid? IdUsuarioCambio { get; set; }
    public string? UsuarioCambio { get; set; }
    public DateTime FechaCambio { get; set; }
}
