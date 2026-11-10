using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Pago
{
    public Guid Id { get; set; }

    public Guid IdReserva { get; set; }

    public int IdMetodoPago { get; set; }

    public decimal Monto { get; set; }

    public string? TransaccionRef { get; set; }

    public bool Exitoso { get; set; }

    public DateTime? FechaPago { get; set; }

    public virtual MetodosPago IdMetodoPagoNavigation { get; set; } = null!;

    public virtual Reserva IdReservaNavigation { get; set; } = null!;
}
