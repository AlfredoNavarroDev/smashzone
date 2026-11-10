using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class DetallesReservaExtra
{
    public int Id { get; set; }

    public Guid IdReserva { get; set; }

    public int IdItemExtra { get; set; }

    public int Cantidad { get; set; }

    public decimal PrecioUnitarioHistorico { get; set; }

    public decimal? Subtotal { get; set; }

    public virtual ItemsExtra IdItemExtraNavigation { get; set; } = null!;

    public virtual Reserva IdReservaNavigation { get; set; } = null!;
}
