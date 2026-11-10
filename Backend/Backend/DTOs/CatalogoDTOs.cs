namespace Backend.DTOs;

public class SalaDTO
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public int CapacidadMaxima { get; set; }
    public string? Descripcion { get; set; }
    public bool Activa { get; set; }
}

public class CrearSalaDTO
{
    public string Nombre { get; set; } = "";
    public int CapacidadMaxima { get; set; }
    public string? Descripcion { get; set; }
}

public class ActualizarSalaDTO
{
    public string Nombre { get; set; } = "";
    public int CapacidadMaxima { get; set; }
    public string? Descripcion { get; set; }
}

public class PaqueteDTO
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public decimal Precio { get; set; }
    public int DuracionMinutos { get; set; }
    public int MaxParticipantes { get; set; }
    public int CantidadItemsEstandar { get; set; }
    public bool Activo { get; set; }
}

public class CrearPaqueteDTO
{
    public string Nombre { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public decimal Precio { get; set; }
    public int DuracionMinutos { get; set; }
    public int MaxParticipantes { get; set; }
    public int CantidadItemsEstandar { get; set; }
}

public class ActualizarPaqueteDTO
{
    public string Nombre { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public decimal Precio { get; set; }
    public int DuracionMinutos { get; set; }
    public int MaxParticipantes { get; set; }
    public int CantidadItemsEstandar { get; set; }
}

public class ItemExtraDTO
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Categoria { get; set; } = "";
    public decimal PrecioUnitario { get; set; }
    public int StockDisponible { get; set; }
    public bool Activo { get; set; }
}

public class CrearItemExtraDTO
{
    public string Nombre { get; set; } = "";
    public string Categoria { get; set; } = "";
    public decimal PrecioUnitario { get; set; }
    public int StockDisponible { get; set; }
}

public class ActualizarItemExtraDTO
{
    public string Nombre { get; set; } = "";
    public string Categoria { get; set; } = "";
    public decimal PrecioUnitario { get; set; }
    public int StockDisponible { get; set; }
}
