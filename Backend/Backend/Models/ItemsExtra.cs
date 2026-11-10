using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class ItemsExtra
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string Categoria { get; set; } = null!;

    public decimal PrecioUnitario { get; set; }

    public int StockDisponible { get; set; }

    public bool Activo { get; set; }

    public virtual ICollection<DetallesReservaExtra> DetallesReservaExtras { get; set; } = new List<DetallesReservaExtra>();
}
