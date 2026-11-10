using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class HistorialEstadosReserva
{
    public int Id { get; set; }

    public Guid IdReserva { get; set; }

    public int? IdEstadoAnterior { get; set; }

    public int IdEstadoNuevo { get; set; }

    public Guid? IdUsuarioCambio { get; set; }

    public DateTime? FechaCambio { get; set; }

    public virtual EstadosReserva? IdEstadoAnteriorNavigation { get; set; }

    public virtual EstadosReserva IdEstadoNuevoNavigation { get; set; } = null!;

    public virtual Reserva IdReservaNavigation { get; set; } = null!;

    public virtual Usuario? IdUsuarioCambioNavigation { get; set; }
}
