namespace Backend.DTOs;

public class CrearPagoDTO
{
    public Guid IdReserva { get; set; }
    public int IdMetodoPago { get; set; }
    public string? CulqiToken { get; set; }
    public bool? Exitoso { get; set; }
    public string? TransaccionRef { get; set; }
}

public class VoucherDTO
{
    public Guid IdPago { get; set; }
    public Guid IdReserva { get; set; }
    public decimal Monto { get; set; }
    public string MetodoPago { get; set; } = "";
    public bool Exitoso { get; set; }
    public string? TransaccionRef { get; set; }
    public DateTime FechaPago { get; set; }
    public string EstadoReserva { get; set; } = "";
}
